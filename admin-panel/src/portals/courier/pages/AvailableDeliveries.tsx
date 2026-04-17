import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getDeliveries,
  getDeliveriesByCourier,
  getCourier,
  getOrCreateConversation,
  formatOrderNumber,
  type StoredDelivery,
} from '../../../services/storage.service';
import DeliveryIssueModal from '../../../components/DeliveryIssueModal';
import DeliveryMap from '../../../components/DeliveryMap';
import {
  syncDeliveriesDown,
  joinCandidatesQueue,
  markCourierViewing,
  courierApproveDelivery,
} from '../../../services/sync.service';
import { supabase } from '../../../lib/supabase';
import { playNewDelivery } from '../../../utils/sounds';
import {
  BellIcon,
  ArrowPathIcon,
  MapPinIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import {
  Truck,
  CheckCircle,
  CreditCard,
  ChatCircle,
  Info,
  Clock,
  Rocket,
  MapPin as PhosphorMapPin,
} from '@phosphor-icons/react';

// ─── Design tokens ────────────────────────────────────────────
const BLUE    = '#009DE0';
const GREEN   = '#1BA672';
const ORANGE  = '#F58F1F';
const GREY    = '#9CA3AF';
const BG      = '#F4F4F4';
const CARD_BG = '#FFFFFF';
const TEXT    = '#202125';
const TEXT2   = '#757575';
const BORDER  = '#E8E8E8';
const ERROR   = '#E23437';

// ─── Status config for each view type ────────────────────────
type ViewType = 'pending' | 'my-accepted' | 'other-accepted';

function getViewType(d: StoredDelivery, courierId: string): ViewType {
  if (d.status === 'pending') return 'pending';
  if (d.status === 'accepted' && d.courierId === courierId) return 'my-accepted';
  return 'other-accepted';
}

const STATUS_CFG: Record<ViewType, {
  label: string; color: string; bg: string; pulse: boolean;
}> = {
  'pending':        { label: 'ממתין לשליח שיאשר',         color: GREEN,  bg: `${GREEN}14`,  pulse: true  },
  'my-accepted':    { label: 'המשלוח שלך — בדרך לאיסוף', color: BLUE,   bg: `${BLUE}14`,   pulse: true  },
  'other-accepted': { label: 'שליח אחר לוקח את המשלוח',  color: ORANGE, bg: `${ORANGE}14`, pulse: false },
};

// ─── Haversine ────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const geocodeCache: Record<string, { lat: number; lng: number } | null> = {};
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache[address] !== undefined) return geocodeCache[address];
  try {
    const q = encodeURIComponent(address + ', ישראל');
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'he' } }
    );
    const json = await res.json();
    if (json.length > 0) {
      const result = { lat: Number(json[0].lat), lng: Number(json[0].lon) };
      geocodeCache[address] = result;
      return result;
    }
  } catch { /* ignore */ }
  geocodeCache[address] = null;
  return null;
}

// ─── Distance chip ────────────────────────────────────────────
const DistanceChip: React.FC<{ pickupAddress: string; dropAddress: string }> = ({
  pickupAddress, dropAddress,
}) => {
  const [km, setKm] = useState<number | null>(null);
  const [myMin, setMyMin] = useState<number | null>(null);
  const [myKm, setMyKm] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, d] = await Promise.all([geocodeAddress(pickupAddress), geocodeAddress(dropAddress)]);
      if (cancelled) return;
      if (p && d) setKm(haversineKm(p.lat, p.lng, d.lat, d.lng));
      if (!navigator.geolocation || !p) return;
      navigator.geolocation.getCurrentPosition(pos => {
        if (cancelled) return;
        const k = haversineKm(pos.coords.latitude, pos.coords.longitude, p.lat, p.lng);
        setMyKm(k);
        setMyMin(Math.round((k / 25) * 60));
      }, () => {}, { timeout: 5000 });
    })();
    return () => { cancelled = true; };
  }, [pickupAddress, dropAddress]);

  if (!km && myKm === null) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {km !== null && (
        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: '#E6F5FC', color: BLUE }}>
          <MapPinIcon className="w-3 h-3" />{km.toFixed(1)} ק"מ משלוח
        </span>
      )}
      {myKm !== null && myMin !== null && (
        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: '#FFF4E5', color: ORANGE }}>
          <Truck size={11} /> {myKm.toFixed(1)} ק"מ ממני · ~{myMin} דק'
        </span>
      )}
    </div>
  );
};

// ─── Navigation URL ───────────────────────────────────────────
function navUrl(address: string, pref: 'waze' | 'google' | 'apple'): string {
  const encoded = encodeURIComponent(address + ', ישראל');
  if (pref === 'waze') return `https://waze.com/ul?q=${encoded}&navigate=yes`;
  if (pref === 'apple') return `maps://maps.apple.com/?daddr=${encoded}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
}

// ─── Delivery feed card ───────────────────────────────────────
const DeliveryFeedCard: React.FC<{
  delivery: StoredDelivery;
  viewType: ViewType;
  navPref: 'waze' | 'google' | 'apple';
  accepting: boolean;
  onApprove: () => void;
  onDetails: () => void;
  onChat: () => void;
  onIssue?: () => void;
}> = ({ delivery, viewType, navPref, accepting, onApprove, onDetails, onChat, onIssue }) => {
  const cfg = STATUS_CFG[viewType];
  const isActionable = viewType === 'pending';
  const isMyDelivery = viewType === 'my-accepted';

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: CARD_BG,
        border: `1.5px solid ${cfg.color}28`,
        boxShadow: `0 4px 16px ${cfg.color}10`,
      }}
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}80)` }} />

      <div className="p-4">
        {/* ── Row 1: Business avatar + name + time | HERO price ── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[14px] font-black flex-shrink-0 shadow-sm"
              style={{
                background: isActionable
                  ? `linear-gradient(135deg, ${BLUE}, #0077AA)`
                  : `linear-gradient(135deg, ${GREY}, #6B7280)`,
              }}
            >
              {(delivery.businessName ?? '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-[14px] font-bold leading-tight" style={{ color: TEXT }}>
                {delivery.businessName ?? '—'}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT2 }}>
                {new Date(delivery.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                {delivery.orderNumber ? ` · ${formatOrderNumber(delivery.orderNumber)}` : ''}
              </p>
            </div>
          </div>

          {/* HERO price */}
          <div className="text-left">
            <p
              className="text-[27px] font-black leading-none tabular-nums"
              style={{ color: cfg.color }}
            >
              ₪{delivery.price}
            </p>
            <p className="text-[10px] text-left font-semibold mt-0.5" style={{ color: TEXT2 }}>תשלום</p>
          </div>
        </div>

        {/* ── Status badge ── */}
        <div className="mb-3">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}28` }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full inline-block${cfg.pulse ? ' animate-pulse' : ''}`}
              style={{ background: cfg.color }}
            />
            {cfg.label}
          </div>
        </div>

        {/* ── Route visualization ── */}
        <div className="mb-3 rounded-xl p-3" style={{ background: BG }}>
          {/* Pickup row */}
          <div className="flex gap-3 items-start">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-sm"
                style={{ background: isActionable ? GREEN : GREY }}
              >
                א
              </div>
              {/* Dashed connector */}
              <div
                className="w-px flex-1 my-1"
                style={{
                  minHeight: 18,
                  borderLeft: `2px dashed ${isActionable ? GREEN + '60' : GREY + '50'}`,
                }}
              />
            </div>
            <div className="pb-3 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: TEXT2 }}>
                איסוף
              </p>
              <p className="text-[13px] font-semibold leading-snug" style={{ color: TEXT }}>
                {delivery.pickupAddress}
              </p>
            </div>
          </div>
          {/* Drop row */}
          <div className="flex gap-3 items-start">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-sm flex-shrink-0"
              style={{ background: isActionable ? ERROR : '#D1D5DB' }}
            >
              ב
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: TEXT2 }}>
                מסירה
              </p>
              <p className="text-[13px] font-semibold leading-snug" style={{ color: TEXT }}>
                {delivery.dropAddress}
              </p>
            </div>
          </div>
        </div>

        {/* Distance + nav link */}
        <DistanceChip pickupAddress={delivery.pickupAddress} dropAddress={delivery.dropAddress} />
        {isActionable && (
          <a
            href={navUrl(delivery.pickupAddress, navPref)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold mb-3 cursor-pointer transition-all duration-200"
            style={{ color: BLUE }}
          >
            <PhosphorMapPin size={12} /> נווט לאיסוף
          </a>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {delivery.paymentMethod && (
            <span
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: BG, color: TEXT2, border: `1px solid ${BORDER}` }}
            >
              {delivery.paymentMethod === 'cash' ? 'מזומן' : 'ביט'}
            </span>
          )}
          {delivery.customerPaid !== undefined && (
            <span
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold"
              style={{
                background: delivery.customerPaid ? '#E8F8F2' : '#FFF4E5',
                color: delivery.customerPaid ? GREEN : ORANGE,
              }}
            >
              {delivery.customerPaid
                ? <><CheckCircle size={11} /> שולם ע"י לקוח</>
                : <><CreditCard size={11} /> גביה בעת המסירה</>}
            </span>
          )}
          {delivery.requiredVehicle && (
            <span
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: '#E6F5FC', color: BLUE }}
            >
              <Truck size={11} />
              {delivery.requiredVehicle === 'motorcycle' ? 'אופנוע'
                : delivery.requiredVehicle === 'bicycle' ? 'אופניים'
                : delivery.requiredVehicle === 'scooter' ? 'קטנוע' : 'רכב'}
            </span>
          )}
        </div>

        {delivery.description && (
          <div className="rounded-xl px-3 py-2 mb-3 text-[12px]" style={{ background: BG, color: TEXT2 }}>
            {delivery.description}
          </div>
        )}

        {/* Action buttons */}
        {isActionable ? (
          <div className="grid grid-cols-2 gap-2">
            {/* Full-width confirm button */}
            <button
              onClick={onApprove}
              disabled={accepting}
              className="py-3.5 rounded-2xl font-black text-[14px] text-white col-span-2 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:opacity-60 cursor-pointer"
              style={{
                background: accepting ? GREY : `linear-gradient(135deg, ${GREEN}, #14905D)`,
                boxShadow: accepting ? 'none' : `0 6px 18px ${GREEN}40`,
                minHeight: 52,
              }}
            >
              {accepting
                ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" /> מצטרף...</>
                : <><CheckCircle size={18} weight="bold" /> אשר משלוח</>}
            </button>
            <button
              onClick={onDetails}
              className="py-2.5 rounded-2xl font-bold text-[12px] flex items-center justify-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer"
              style={{ background: '#EAF7FD', color: BLUE, border: `1px solid ${BLUE}20` }}
            >
              <Info size={13} /> פרטים
            </button>
            <button
              onClick={onChat}
              className="py-2.5 rounded-2xl font-bold text-[12px] flex items-center justify-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer"
              style={{ background: '#FFF4E5', color: ORANGE, border: `1px solid ${ORANGE}20` }}
            >
              <ChatCircle size={13} /> צ'אט
            </button>
          </div>
        ) : isMyDelivery ? (
          <div className="grid grid-cols-2 gap-2">
            <a
              href={navUrl(delivery.pickupAddress, navPref)}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 rounded-2xl font-black text-[13px] text-white text-center col-span-2 flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer"
              style={{ background: `linear-gradient(135deg, ${BLUE}, #0077AA)`, boxShadow: `0 4px 14px ${BLUE}35` }}
            >
              <PhosphorMapPin size={14} /> נווט לאיסוף
            </a>
            <button
              onClick={onChat}
              className="py-2.5 rounded-2xl font-bold text-[12px] flex items-center justify-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer"
              style={{ background: '#FFF4E5', color: ORANGE, border: `1px solid ${ORANGE}20` }}
            >
              <ChatCircle size={13} /> צ'אט
            </button>
            <button
              onClick={onDetails}
              className="py-2.5 rounded-2xl font-bold text-[12px] flex items-center justify-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer"
              style={{ background: BG, color: TEXT2, border: `1px solid ${BORDER}` }}
            >
              <Info size={13} /> פרטים
            </button>
            {onIssue && (
              <button
                onClick={onIssue}
                className="col-span-2 py-2 rounded-2xl font-bold text-[12px] flex items-center justify-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer"
                style={{ background: '#FFF0F0', color: ERROR, border: `1px solid ${ERROR}20` }}
              >
                דווח תקלה
              </button>
            )}
          </div>
        ) : (
          <div
            className="rounded-xl px-3 py-2.5 text-[12px] text-center flex items-center justify-center gap-1.5"
            style={{ background: `${cfg.color}10`, color: cfg.color }}
          >
            {viewType === 'other-accepted'
              ? <><Clock size={13} /> ממתין לאישור עסק — המשלוח עדיין עשוי להשתנות</>
              : <><Rocket size={13} /> השליח בדרך ללקוח</>}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Detail modal ─────────────────────────────────────────────
const DetailModal: React.FC<{
  delivery: StoredDelivery;
  viewType: ViewType;
  navPref: 'waze' | 'google' | 'apple';
  accepting: boolean;
  onApprove: () => void;
  onClose: () => void;
}> = ({ delivery, viewType, navPref, accepting, onApprove, onClose }) => {
  const cfg = STATUS_CFG[viewType];
  const isActionable = viewType === 'pending';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl pb-8 overflow-y-auto"
        style={{ background: CARD_BG, maxHeight: '90vh' }}
        dir="rtl"
      >
        <div className="sticky top-0 bg-white pt-3 pb-2 px-5 z-10">
          <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: BORDER }} />
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-black" style={{ color: TEXT }}>פרטי המשלוח</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer"
              style={{ background: BG }}
            >
              <XMarkIcon className="w-4 h-4" style={{ color: TEXT2 }} />
            </button>
          </div>
        </div>

        <div className="px-5 space-y-4 pt-2">
          {/* Status badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}35` }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full${cfg.pulse ? ' animate-pulse' : ''}`}
              style={{ background: cfg.color }}
            />
            {cfg.label}
          </div>

          {/* Business + price row */}
          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: BG }}>
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[15px] font-black shadow-sm"
              style={{ background: `linear-gradient(135deg, ${BLUE}, #0077AA)` }}
            >
              {(delivery.businessName ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-black text-[15px]" style={{ color: TEXT }}>{delivery.businessName ?? '—'}</p>
              <p className="text-[11px]" style={{ color: TEXT2 }}>
                {new Date(delivery.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className="text-[26px] font-black tabular-nums" style={{ color: cfg.color }}>
              ₪{delivery.price}
            </span>
          </div>

          {/* Addresses */}
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black text-white"
                  style={{ background: GREEN }}
                >
                  א
                </div>
                <div className="w-px flex-1 my-1" style={{ minHeight: 16, borderLeft: `2px dashed ${GREEN}50` }} />
              </div>
              <div className="flex-1 pb-3">
                <p className="text-[11px] font-semibold mb-0.5" style={{ color: TEXT2 }}>כתובת איסוף</p>
                <p className="text-[14px] font-semibold" style={{ color: TEXT }}>{delivery.pickupAddress}</p>
                <a
                  href={navUrl(delivery.pickupAddress, navPref)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-bold mt-1 cursor-pointer"
                  style={{ color: BLUE }}
                >
                  <PhosphorMapPin size={11} /> נווט לאיסוף
                </a>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-black text-white"
                style={{ background: ERROR }}
              >
                ב
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold mb-0.5" style={{ color: TEXT2 }}>כתובת מסירה</p>
                <p className="text-[14px] font-semibold" style={{ color: TEXT }}>{delivery.dropAddress}</p>
                <a
                  href={navUrl(delivery.dropAddress, navPref)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-bold mt-1 cursor-pointer"
                  style={{ color: BLUE }}
                >
                  <PhosphorMapPin size={11} /> נווט למסירה
                </a>
              </div>
            </div>
          </div>

          {/* Map */}
          <div style={{ marginBottom: 4 }}>
            <DeliveryMap
              pickupAddress={delivery.pickupAddress}
              dropAddress={delivery.dropAddress}
              height={220}
            />
          </div>

          <DistanceChip pickupAddress={delivery.pickupAddress} dropAddress={delivery.dropAddress} />

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {delivery.paymentMethod && (
              <span className="flex items-center gap-1 text-[12px] px-3 py-1 rounded-full font-bold" style={{ background: BG, color: TEXT2 }}>
                {delivery.paymentMethod === 'cash' ? 'מזומן' : 'ביט'}
              </span>
            )}
            {delivery.customerPaid !== undefined && (
              <span
                className="flex items-center gap-1 text-[12px] px-3 py-1 rounded-full font-bold"
                style={{
                  background: delivery.customerPaid ? '#E8F8F2' : '#FFF4E5',
                  color: delivery.customerPaid ? GREEN : ORANGE,
                }}
              >
                {delivery.customerPaid
                  ? <><CheckCircle size={12} /> שולם ע"י לקוח</>
                  : <><CreditCard size={12} /> גביה בעת המסירה</>}
              </span>
            )}
            {delivery.requiredVehicle && (
              <span className="flex items-center gap-1 text-[12px] px-3 py-1 rounded-full font-bold" style={{ background: '#E6F5FC', color: BLUE }}>
                <Truck size={12} />
                {delivery.requiredVehicle === 'motorcycle' ? 'אופנוע'
                  : delivery.requiredVehicle === 'bicycle' ? 'אופניים'
                  : delivery.requiredVehicle === 'scooter' ? 'קטנוע' : 'רכב'}
              </span>
            )}
          </div>

          {delivery.description && (
            <div className="rounded-xl px-3 py-2 text-[13px]" style={{ background: BG, color: TEXT2 }}>
              {delivery.description}
            </div>
          )}

          {/* Action */}
          {isActionable ? (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={onApprove}
                disabled={accepting}
                className="py-4 rounded-2xl font-black text-[15px] text-white col-span-2 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:opacity-60 cursor-pointer"
                style={{
                  background: accepting ? GREY : `linear-gradient(135deg, ${GREEN}, #14905D)`,
                  boxShadow: accepting ? 'none' : `0 6px 20px ${GREEN}40`,
                  minHeight: 54,
                }}
              >
                {accepting
                  ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" /> מצטרף...</>
                  : <><CheckCircle size={18} weight="bold" /> אשר משלוח</>}
              </button>
              <button
                onClick={onClose}
                className="py-3 rounded-2xl font-semibold text-[13px] col-span-2 transition-all duration-200 active:scale-95 cursor-pointer"
                style={{ background: BG, color: TEXT2 }}
              >
                סגור
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl font-semibold text-[13px] transition-all duration-200 active:scale-95 cursor-pointer"
              style={{ background: BG, color: TEXT2 }}
            >
              סגור
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Section header ───────────────────────────────────────────
const SectionHeader: React.FC<{
  title: string; count: number; color: string; open: boolean; onToggle: () => void;
}> = ({ title, count, color, open, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between py-2 px-1 cursor-pointer transition-all duration-200"
  >
    <div className="flex items-center gap-2">
      <span className="text-[13px] font-black" style={{ color }}>{title}</span>
      <span
        className="text-[11px] font-black px-2 py-0.5 rounded-full"
        style={{ background: `${color}18`, color }}
      >
        {count}
      </span>
    </div>
    {open
      ? <ChevronUpIcon className="w-4 h-4" style={{ color }} />
      : <ChevronDownIcon className="w-4 h-4" style={{ color }} />}
  </button>
);

// ─── Main page ────────────────────────────────────────────────
const AvailableDeliveries: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [allDeliveries, setAllDeliveries] = useState<StoredDelivery[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [detailDelivery, setDetailDelivery] = useState<StoredDelivery | null>(null);
  const [issueDeliveryId, setIssueDeliveryId] = useState<string | null>(null);

  const [openAccepted, setOpenAccepted] = useState(false);
  const [openRecent, setOpenRecent] = useState(false);

  const prevPendingCount = useRef(-1);

  const courier = courierId ? getCourier(courierId) : null;
  const isUnavailable = courier?.isAvailable === false;
  const navPref = courier?.navPreference ?? 'waze';

  // ─── Filter + group deliveries ────────────────────────────
  const visibleDeliveries = allDeliveries.filter(d => {
    if (d.status === 'delivered' || d.status === 'cancelled' || d.status === 'picked_up') return false;
    if (d.status === 'pending' && d.requiredVehicle && courier && d.requiredVehicle !== courier.vehicle) return false;
    return true;
  });

  const pendingDeliveries  = visibleDeliveries.filter(d => d.status === 'pending')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const acceptedDeliveries = visibleDeliveries.filter(d => d.status === 'accepted')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // ─── Refresh ──────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!courierId) return;
    await syncDeliveriesDown();
    const fresh = getDeliveries();
    setAllDeliveries(fresh);

    const newPendingCount = fresh.filter(d =>
      d.status === 'pending' &&
      (!d.requiredVehicle || !courier || d.requiredVehicle === courier.vehicle)
    ).length;

    if (prevPendingCount.current >= 0 && newPendingCount > prevPendingCount.current) {
      const isCourierUnavailable = courierId ? getCourier(courierId)?.isAvailable === false : false;
      if (!isCourierUnavailable) {
        playNewDelivery();
        toast.success('משלוח חדש זמין!', { duration: 4000 });
      }
    }
    prevPendingCount.current = newPendingCount;
  }, [courierId, courier]);

  useEffect(() => { refresh(); const id = setInterval(refresh, 3000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);
  useEffect(() => { window.addEventListener('online', refresh); return () => window.removeEventListener('online', refresh); }, [refresh]);

  // ─── Supabase Realtime on deliveries ─────────────────────
  useEffect(() => {
    if (!courierId) return;
    const ch = supabase
      .channel('available_deliveries_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deliveries' }, async () => {
        await syncDeliveriesDown();
        const fresh = getDeliveries();
        setAllDeliveries(fresh);
        const cnt = fresh.filter(d =>
          d.status === 'pending' &&
          (!d.requiredVehicle || !courier || d.requiredVehicle === courier.vehicle)
        ).length;
        if (prevPendingCount.current >= 0 && cnt > prevPendingCount.current) {
          const isCourierUnavailable = courierId ? getCourier(courierId)?.isAvailable === false : false;
          if (!isCourierUnavailable) {
            playNewDelivery();
            toast.success('משלוח חדש זמין!', { duration: 4000 });
          }
        }
        prevPendingCount.current = cnt;
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deliveries' }, async () => {
        await syncDeliveriesDown();
        setAllDeliveries(getDeliveries());
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [courierId]);

  // ─── Approve ──────────────────────────────────────────────
  const handleApprove = async (delivery: StoredDelivery) => {
    if (!courierId) return;
    if (isUnavailable) {
      toast.error('אתה במצב לא זמין — שנה את הסטטוס בפרופיל כדי לקבל משלוחים');
      return;
    }

    const active = getDeliveriesByCourier(courierId).filter(d => ['accepted', 'picked_up'].includes(d.status));
    if (active.length > 0) {
      toast.error('כבר יש לך משלוח פעיל. סיים אותו לפני קבלת משלוח חדש.');
      return;
    }

    setAccepting(delivery.id);
    try {
      await syncDeliveriesDown();
      const fresh = getDeliveries().find(d => d.id === delivery.id);
      if (!fresh || fresh.status !== 'pending') {
        toast.error('המשלוח כבר לא זמין — נסה אחד אחר');
        setAllDeliveries(getDeliveries());
        setAccepting(null);
        return;
      }

      const courierData    = getCourier(courierId);
      const courierName    = courierData?.name    ?? 'שליח';
      const courierRating  = courierData?.rating   ?? 5;
      const courierVehicle = courierData?.vehicle ?? 'motorcycle';

      await joinCandidatesQueue(delivery.id, courierId, courierName, courierRating, courierVehicle);
      await courierApproveDelivery(delivery.id, courierId);
      localStorage.setItem('pending_candidacy', JSON.stringify({
        deliveryId: delivery.id,
        notifId: delivery.id,
        joinedAt: new Date().toISOString(),
      }));

      setDetailDelivery(null);
      toast.success('אישרת את המשלוח! ממתין לאישור העסק');
      navigate('/courier/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בהצטרפות לתור');
    } finally {
      setAccepting(null);
    }
  };

  // ─── Chat ─────────────────────────────────────────────────
  const handleChat = (delivery: StoredDelivery) => {
    if (!courierId || !delivery.businessId) return;
    const conv = getOrCreateConversation(delivery.businessId, courierId);
    const prefill = `שלום! מעוניין במשלוח מ-${delivery.pickupAddress} ל-${delivery.dropAddress} (₪${delivery.price ?? ''})`;
    navigate(`/courier/chat?convId=${conv.id}&deliveryId=${delivery.id}&prefill=${encodeURIComponent(prefill)}`);
  };

  // ─── Details ──────────────────────────────────────────────
  const handleDetails = (delivery: StoredDelivery) => {
    setDetailDelivery(delivery);
    if (courierId) {
      const cd = getCourier(courierId);
      if (cd) markCourierViewing(delivery.id, courierId, cd.name, cd.rating, cd.vehicle).catch(console.error);
    }
  };

  const totalVisible = visibleDeliveries.length;

  const cutoff48h = Date.now() - 48 * 60 * 60 * 1000;
  const recentDeliveries = allDeliveries
    .filter(d =>
      (d.status === 'delivered' || d.status === 'cancelled') &&
      new Date(d.createdAt).getTime() > cutoff48h
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="max-w-lg mx-auto px-4 py-4" style={{ background: BG, minHeight: '100vh' }}>

      {/* ── Compact header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[19px] font-black" style={{ color: TEXT }}>משלוחים פנויים</h1>
            {pendingDeliveries.length > 0 && (
              <span
                className="text-[12px] px-2 py-0.5 rounded-full font-black animate-pulse"
                style={{ background: GREEN, color: '#fff' }}
              >
                {pendingDeliveries.length}
              </span>
            )}
          </div>
          {totalVisible > 0 && (
            <p className="text-[11px] mt-0.5" style={{ color: TEXT2 }}>
              {totalVisible} פעיל{totalVisible !== 1 ? 'ים' : ''} · מסנכרן כל 3 שניות
            </p>
          )}
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
          style={{ background: CARD_BG, color: BLUE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <ArrowPathIcon className="w-3.5 h-3.5" />
          רענן
        </button>
      </div>

      {/* Unavailable banner */}
      {isUnavailable && (
        <div
          className="rounded-2xl p-3.5 mb-4 flex items-center gap-3"
          style={{ background: '#FDECEA', border: '1px solid #F5C6C6' }}
        >
          <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: ERROR }} />
          <div>
            <p className="text-[13px] font-black" style={{ color: ERROR }}>אתה מסומן כלא זמין</p>
            <p className="text-[11px]" style={{ color: '#C0392B' }}>שנה את הסטטוס בפרופיל כדי לקבל התראות.</p>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {totalVisible === 0 && (
        <div
          className="rounded-2xl p-10 flex flex-col items-center gap-4 text-center"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          {/* Illustration-style icon stack */}
          <div className="relative w-20 h-20">
            <div
              className="absolute inset-0 rounded-2xl"
              style={{ background: '#E6F5FC', transform: 'rotate(8deg)' }}
            />
            <div
              className="absolute inset-0 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${BLUE}20, ${BLUE}10)`, border: `1.5px solid ${BLUE}25` }}
            >
              <BellIcon className="w-9 h-9" style={{ color: BLUE }} />
            </div>
          </div>
          <div>
            <p className="font-black text-[16px] mb-1" style={{ color: TEXT }}>אין משלוחים פנויים כרגע</p>
            <p className="text-[12px]" style={{ color: TEXT2 }}>המערכת מסנכרנת כל 3 שניות ותתריע בקול כשיגיע משלוח</p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-all duration-200 active:scale-95 cursor-pointer"
            style={{ background: '#E6F5FC', color: BLUE }}
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            רענן עכשיו
          </button>
        </div>
      )}

      {/* ── PENDING section ── */}
      {pendingDeliveries.length > 0 && (
        <div className="mb-4">
          {/* Section header with pulsing dot + count badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0" style={{ background: GREEN }} />
            <span className="text-[14px] font-black" style={{ color: GREEN }}>פנוי לקיחה</span>
            <span
              className="text-[11px] font-black px-2 py-0.5 rounded-full"
              style={{ background: `${GREEN}18`, color: GREEN }}
            >
              {pendingDeliveries.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingDeliveries.map(d => (
              <DeliveryFeedCard
                key={d.id}
                delivery={d}
                viewType="pending"
                navPref={navPref}
                accepting={accepting === d.id}
                onApprove={() => handleApprove(d)}
                onDetails={() => handleDetails(d)}
                onChat={() => handleChat(d)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── ACCEPTED section ── */}
      {acceptedDeliveries.length > 0 && (
        <div className="mb-4">
          <div className="h-px mb-3" style={{ background: BORDER }} />
          <SectionHeader
            title="שליח בדרך לאיסוף"
            count={acceptedDeliveries.length}
            color={ORANGE}
            open={openAccepted}
            onToggle={() => setOpenAccepted(v => !v)}
          />
          {openAccepted && (
            <div className="space-y-3 mt-2">
              {acceptedDeliveries.map(d => (
                <DeliveryFeedCard
                  key={d.id}
                  delivery={d}
                  viewType={getViewType(d, courierId)}
                  navPref={navPref}
                  accepting={false}
                  onApprove={() => {}}
                  onDetails={() => handleDetails(d)}
                  onChat={() => handleChat(d)}
                  onIssue={getViewType(d, courierId) === 'my-accepted' ? () => setIssueDeliveryId(d.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RECENT 48h section ── */}
      {recentDeliveries.length > 0 && (
        <div className="mb-4">
          <div className="h-px mb-3" style={{ background: BORDER }} />
          <SectionHeader
            title="משלוחים אחרונים — 48 שעות"
            count={recentDeliveries.length}
            color={GREY}
            open={openRecent}
            onToggle={() => setOpenRecent(v => !v)}
          />
          {openRecent && (
            <div className="space-y-2 mt-2">
              {recentDeliveries.map(d => {
                const isDone = d.status === 'delivered';
                const statusClr = isDone ? GREEN : '#9CA3AF';
                const statusTxt = isDone ? 'נמסר' : 'בוטל';
                const time = new Date(d.createdAt).toLocaleDateString('he-IL', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                });
                return (
                  <div
                    key={d.id}
                    className="rounded-2xl px-4 py-3"
                    style={{
                      background: CARD_BG,
                      border: `1px solid ${BORDER}`,
                      borderRight: `3px solid ${statusClr}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[11px] font-black px-2.5 py-0.5 rounded-full"
                        style={{ background: `${statusClr}16`, color: statusClr }}
                      >
                        {statusTxt}
                      </span>
                      <span className="text-[11px] tabular-nums" style={{ color: TEXT2 }}>{time}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex gap-2 items-start">
                        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: GREEN }} />
                        <p className="text-[12px] font-medium leading-snug" style={{ color: TEXT }}>{d.pickupAddress}</p>
                      </div>
                      <div className="w-px h-2 mr-[3px]" style={{ background: BORDER }} />
                      <div className="flex gap-2 items-start">
                        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: ERROR }} />
                        <p className="text-[12px] font-medium leading-snug" style={{ color: TEXT }}>{d.dropAddress}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {detailDelivery && (
        <DetailModal
          delivery={detailDelivery}
          viewType={getViewType(detailDelivery, courierId)}
          navPref={navPref}
          accepting={accepting === detailDelivery.id}
          onApprove={() => handleApprove(detailDelivery)}
          onClose={() => setDetailDelivery(null)}
        />
      )}

      {/* Issue report modal */}
      {issueDeliveryId && (
        <DeliveryIssueModal
          deliveryId={issueDeliveryId}
          onClose={() => setIssueDeliveryId(null)}
          onReport={(_issueId, _note) => {
            toast.success('הדיווח נשלח — נחזור אליך בקרוב');
            setIssueDeliveryId(null);
          }}
        />
      )}
    </div>
  );
};

export default AvailableDeliveries;
