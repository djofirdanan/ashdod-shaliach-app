import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getPendingNotifications,
  acceptNotification,
  dismissNotification,
  getDeliveries,
  getDeliveriesByCourier,
  getCourier,
  getOrCreateConversation,
  type DeliveryNotification,
} from '../../../services/storage.service';
import {
  syncNotificationsDown,
  syncDeliveriesDown,
  joinCandidatesQueue,
  markCourierViewing,
  courierApproveDelivery,
} from '../../../services/sync.service';
import { supabase } from '../../../lib/supabase';
import { playNewDelivery } from '../../../utils/sounds';
import { BellIcon, ArrowPathIcon, TrashIcon, MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';

// ─── Design tokens ────────────────────────────────────────────
const BLUE    = '#009DE0';
const GREEN   = '#1BA672';
const ORANGE  = '#F58F1F';
const BG      = '#F4F4F4';
const CARD_BG = '#FFFFFF';
const TEXT    = '#202125';
const TEXT2   = '#757575';
const BORDER  = '#E8E8E8';
const ERROR   = '#E23437';

// ─── Haversine distance ───────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Geocode address via Nominatim (OpenStreetMap) ────────────
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
  } catch {}
  geocodeCache[address] = null;
  return null;
}

// ─── Distance chip ────────────────────────────────────────────
const DistanceInfo: React.FC<{ notif: DeliveryNotification }> = ({ notif }) => {
  const [pickupToDropKm, setPickupToDropKm] = useState<number | null>(null);
  const [myToPickupKm, setMyToPickupKm] = useState<number | null>(null);
  const [myToPickupMin, setMyToPickupMin] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, d] = await Promise.all([
        geocodeAddress(notif.pickupAddress),
        geocodeAddress(notif.dropAddress),
      ]);
      if (cancelled) return;
      if (p && d) setPickupToDropKm(haversineKm(p.lat, p.lng, d.lat, d.lng));

      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          if (p) {
            const km = haversineKm(pos.coords.latitude, pos.coords.longitude, p.lat, p.lng);
            setMyToPickupKm(km);
            setMyToPickupMin(Math.round((km / 25) * 60));
          }
        },
        () => {},
        { timeout: 5000, enableHighAccuracy: false }
      );
    })();
    return () => { cancelled = true; };
  }, [notif.pickupAddress, notif.dropAddress]);

  if (!pickupToDropKm && myToPickupKm === null) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {pickupToDropKm !== null && (
        <span
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: '#E6F5FC', color: BLUE }}
        >
          <MapPinIcon className="w-3 h-3" />
          מרחק משלוח: {pickupToDropKm.toFixed(1)} ק"מ
        </span>
      )}
      {myToPickupKm !== null && myToPickupMin !== null && (
        <span
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: '#FFF4E5', color: ORANGE }}
        >
          🛵 {myToPickupKm.toFixed(1)} ק"מ ממני • ~{myToPickupMin} דק' לאיסוף
        </span>
      )}
    </div>
  );
};

// ─── Navigation link ─────────────────────────────────────────
function navUrl(address: string, pref: 'waze' | 'google' | 'apple'): string {
  const encoded = encodeURIComponent(address + ', ישראל');
  if (pref === 'waze') return `https://waze.com/ul?q=${encoded}&navigate=yes`;
  if (pref === 'apple') return `maps://maps.apple.com/?daddr=${encoded}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
}

// ─── Detail Modal ─────────────────────────────────────────────
const DetailModal: React.FC<{
  notif: DeliveryNotification;
  navPref: 'waze' | 'google' | 'apple';
  accepting: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}> = ({ notif, navPref, accepting, onApprove, onReject, onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-lg rounded-t-3xl pb-8 overflow-y-auto"
        style={{ background: CARD_BG, maxHeight: '90vh' }}
        dir="rtl"
      >
        <div className="sticky top-0 bg-white pt-3 pb-2 px-5 z-10">
          <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: BORDER }} />
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-black" style={{ color: TEXT }}>פרטי המשלוח</h2>
            <button onClick={onClose} className="p-2 rounded-xl" style={{ background: BG }}>
              <XMarkIcon className="w-4 h-4" style={{ color: TEXT2 }} />
            </button>
          </div>
        </div>

        <div className="px-5 space-y-4 pt-2">
          {/* Business */}
          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: BG }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[14px] font-black"
              style={{ background: `linear-gradient(135deg, ${BLUE}, #0077AA)` }}
            >
              {notif.businessName[0]}
            </div>
            <div>
              <p className="font-black text-[15px]" style={{ color: TEXT }}>{notif.businessName}</p>
              <p className="text-[11px]" style={{ color: TEXT2 }}>
                {new Date(notif.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {notif.price != null && (
              <span className="mr-auto text-[20px] font-black" style={{ color: BLUE }}>₪{notif.price}</span>
            )}
          </div>

          {/* Addresses */}
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-black text-white" style={{ background: GREEN }}>א</div>
              <div>
                <p className="text-[11px] font-semibold mb-0.5" style={{ color: TEXT2 }}>כתובת איסוף</p>
                <p className="text-[14px] font-semibold" style={{ color: TEXT }}>{notif.pickupAddress}</p>
                <a href={navUrl(notif.pickupAddress, navPref)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold" style={{ color: BLUE }}>🗺️ נווט לאיסוף</a>
              </div>
            </div>
            <div className="w-px h-4 mr-3" style={{ background: BORDER }} />
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-black text-white" style={{ background: ERROR }}>ב</div>
              <div>
                <p className="text-[11px] font-semibold mb-0.5" style={{ color: TEXT2 }}>כתובת מסירה</p>
                <p className="text-[14px] font-semibold" style={{ color: TEXT }}>{notif.dropAddress}</p>
                <a href={navUrl(notif.dropAddress, navPref)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold" style={{ color: BLUE }}>🗺️ נווט למסירה</a>
              </div>
            </div>
          </div>

          {/* Distance */}
          <DistanceInfo notif={notif} />

          {/* Details chips */}
          <div className="flex flex-wrap gap-2">
            {notif.paymentMethod && (
              <span className="text-[12px] px-3 py-1 rounded-full font-bold" style={{ background: BG, color: TEXT2 }}>
                {notif.paymentMethod === 'cash' ? '💵 מזומן' : '📱 ביט'}
              </span>
            )}
            {notif.customerPaid !== undefined && (
              <span className="text-[12px] px-3 py-1 rounded-full font-bold" style={{ background: notif.customerPaid ? '#E8F8F2' : '#FFF4E5', color: notif.customerPaid ? GREEN : ORANGE }}>
                {notif.customerPaid ? '✅ שולם ע"י לקוח' : '💳 גביה בעת המסירה'}
              </span>
            )}
            {notif.requiredVehicle && (
              <span className="text-[12px] px-3 py-1 rounded-full font-bold" style={{ background: '#E6F5FC', color: BLUE }}>
                {notif.requiredVehicle === 'motorcycle' ? '🏍️ אופנוע' : notif.requiredVehicle === 'bicycle' ? '🚲 אופניים' : notif.requiredVehicle === 'scooter' ? '🛵 קטנוע' : '🚗 רכב'}
              </span>
            )}
          </div>

          {/* Description */}
          {notif.description && (
            <div className="rounded-xl px-3 py-2 text-[13px]" style={{ background: BG, color: TEXT2 }}>
              {notif.description}
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={onApprove}
              disabled={accepting}
              className="py-3.5 rounded-2xl font-black text-[14px] text-white col-span-2 transition-all active:scale-95 disabled:opacity-60"
              style={{ background: GREEN }}
            >
              {accepting ? 'מצטרף...' : '✅ אשר משלוח'}
            </button>
            <button
              onClick={onReject}
              className="py-3 rounded-2xl font-bold text-[13px] transition-all active:scale-95"
              style={{ background: '#FFF0F0', color: ERROR, border: `1.5px solid ${ERROR}30` }}
            >
              ❌ דחה
            </button>
            <button
              onClick={onClose}
              className="py-3 rounded-2xl font-semibold text-[13px] transition-all active:scale-95"
              style={{ background: BG, color: TEXT2 }}
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Delivery card ────────────────────────────────────────────
const NotifCard: React.FC<{
  notif: DeliveryNotification;
  navPref: 'waze' | 'google' | 'apple';
  accepting: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDetails: () => void;
  onChat: () => void;
}> = ({ notif, navPref, accepting, onApprove, onReject, onDetails, onChat }) => (
  <div
    className="rounded-2xl p-4"
    style={{ background: CARD_BG, border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
  >
    {/* Business + price */}
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[12px] font-black"
          style={{ background: `linear-gradient(135deg, ${BLUE}, #0077AA)` }}
        >
          {notif.businessName[0]}
        </div>
        <div>
          <p className="text-[13px] font-bold" style={{ color: TEXT }}>{notif.businessName}</p>
          <p className="text-[10px]" style={{ color: TEXT2 }}>
            {new Date(notif.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
      {notif.price != null && (
        <span className="text-[16px] font-black" style={{ color: BLUE }}>₪{notif.price}</span>
      )}
    </div>

    {/* Addresses */}
    <div className="space-y-2 mb-3">
      <div className="flex gap-2 items-start">
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white" style={{ background: GREEN }}>א</div>
        <div>
          <p className="text-[11px] font-semibold" style={{ color: TEXT2 }}>איסוף</p>
          <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{notif.pickupAddress}</p>
        </div>
      </div>
      <div className="w-px h-3 mr-2.5" style={{ background: BORDER }} />
      <div className="flex gap-2 items-start">
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white" style={{ background: ERROR }}>ב</div>
        <div>
          <p className="text-[11px] font-semibold" style={{ color: TEXT2 }}>מסירה</p>
          <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{notif.dropAddress}</p>
        </div>
      </div>
    </div>

    {/* Distance info */}
    <DistanceInfo notif={notif} />

    {/* Navigation link */}
    <a
      href={navUrl(notif.pickupAddress, navPref)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-[11px] font-semibold mb-3"
      style={{ color: BLUE }}
    >
      🗺️ נווט לכתובת האיסוף
    </a>

    {/* Payment / vehicle info tags */}
    <div className="flex flex-wrap gap-1.5 mb-3">
      {notif.paymentMethod && (
        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: BG, color: TEXT2 }}>
          {notif.paymentMethod === 'cash' ? '💵 מזומן' : '📱 ביט'}
        </span>
      )}
      {notif.customerPaid !== undefined && (
        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: notif.customerPaid ? '#E8F8F2' : '#FFF4E5', color: notif.customerPaid ? GREEN : ORANGE }}>
          {notif.customerPaid ? '✅ שולם ע"י לקוח' : '💳 גביה בעת המסירה'}
        </span>
      )}
      {notif.requiredVehicle && (
        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#E6F5FC', color: BLUE }}>
          {notif.requiredVehicle === 'motorcycle' ? '🏍️ אופנוע' : notif.requiredVehicle === 'bicycle' ? '🚲 אופניים' : notif.requiredVehicle === 'scooter' ? '🛵 קטנוע' : '🚗 רכב'}
        </span>
      )}
    </div>

    {notif.description && (
      <div className="rounded-xl px-3 py-2 mb-3 text-[12px]" style={{ background: BG, color: TEXT2 }}>
        {notif.description}
      </div>
    )}

    {/* 4-button grid */}
    <div className="grid grid-cols-2 gap-2">
      {/* Row 1 */}
      <button
        onClick={onApprove}
        disabled={accepting}
        className="py-3 rounded-2xl font-black text-[13px] text-white transition-all active:scale-95 disabled:opacity-60"
        style={{ background: GREEN }}
      >
        {accepting ? '...' : '✅ אשר משלוח'}
      </button>
      <button
        onClick={onReject}
        className="py-3 rounded-2xl font-bold text-[13px] transition-all active:scale-95"
        style={{ background: '#FFF0F0', color: ERROR, border: `1.5px solid ${ERROR}30` }}
      >
        ❌ דחה
      </button>
      {/* Row 2 */}
      <button
        onClick={onDetails}
        className="py-3 rounded-2xl font-bold text-[13px] transition-all active:scale-95"
        style={{ background: '#EAF7FD', color: BLUE, border: `1.5px solid ${BLUE}30` }}
      >
        ℹ️ פרטים נוספים
      </button>
      <button
        onClick={onChat}
        className="py-3 rounded-2xl font-bold text-[13px] transition-all active:scale-95"
        style={{ background: '#FFF4E5', color: ORANGE, border: `1.5px solid ${ORANGE}30` }}
      >
        💬 צ'אט עם העסק
      </button>
    </div>
  </div>
);

const AvailableDeliveries: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [detailNotif, setDetailNotif] = useState<DeliveryNotification | null>(null);
  const [rejectedNotifs, setRejectedNotifs] = useState<DeliveryNotification[]>([]);
  const [showRejected, setShowRejected] = useState(false);
  const prevCountRef = useRef(-1);

  const getRejectedIds = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(`courier_rejected_notifs_${courierId}`) ?? '[]');
    } catch { return []; }
  };

  const setRejectedIds = (ids: string[]) => {
    localStorage.setItem(`courier_rejected_notifs_${courierId}`, JSON.stringify(ids));
  };

  // ─── Core refresh function ────────────────────────────────
  const refresh = useCallback(async () => {
    if (!courierId) return;
    await Promise.all([syncNotificationsDown(), syncDeliveriesDown()]);
    const fresh = getPendingNotifications(courierId);
    // Play sound only when NEW notifications arrive (not on first load)
    if (prevCountRef.current >= 0 && fresh.length > prevCountRef.current) {
      playNewDelivery();
      toast.success(`📦 משלוח חדש זמין!`, { duration: 4000 });
    }
    prevCountRef.current = fresh.length;
    setNotifications(fresh);

    // Load rejected notifs for display
    const rejectedIds = getRejectedIds();
    if (rejectedIds.length > 0) {
      const allNotifs: DeliveryNotification[] = JSON.parse(localStorage.getItem('app_delivery_notifications') ?? '[]');
      const rejected = allNotifs.filter(n => rejectedIds.includes(n.id));
      setRejectedNotifs(rejected);
    }
  }, [courierId]);

  // ─── Polling every 3 seconds ──────────────────────────────
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  // ─── Refresh when tab becomes visible again ───────────────
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  // ─── Refresh when device comes back online ────────────────
  useEffect(() => {
    window.addEventListener('online', refresh);
    return () => window.removeEventListener('online', refresh);
  }, [refresh]);

  // ─── Supabase Realtime ────────────────────────────────────
  useEffect(() => {
    if (!courierId) return;
    const channel = supabase
      .channel('delivery_notifications_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_notifications' }, async () => {
        await syncNotificationsDown();
        const fresh = getPendingNotifications(courierId);
        if (prevCountRef.current >= 0 && fresh.length > prevCountRef.current) {
          playNewDelivery();
          toast.success(`📦 משלוח חדש זמין!`, { duration: 4000 });
        }
        prevCountRef.current = fresh.length;
        setNotifications(fresh);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_notifications' }, async () => {
        await syncNotificationsDown();
        const fresh = getPendingNotifications(courierId);
        prevCountRef.current = fresh.length;
        setNotifications(fresh);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [courierId]);

  const courier = courierId ? getCourier(courierId) : null;
  const isUnavailable = courier?.isAvailable === false;
  const navPref = courier?.navPreference ?? 'waze';

  // ─── Approve flow ─────────────────────────────────────────
  const handleApprove = async (notif: DeliveryNotification) => {
    if (!courierId) return;

    // Block courier who already has an active delivery
    const activeDeliveries = getDeliveriesByCourier(courierId).filter(
      d => ['accepted', 'picked_up'].includes(d.status)
    );
    if (activeDeliveries.length > 0) {
      toast.error('כבר יש לך משלוח פעיל. סיים אותו לפני קבלת משלוח חדש.');
      return;
    }

    setAccepting(notif.id);
    try {
      await syncDeliveriesDown();
      const allDeliveries = getDeliveries();
      const matching = allDeliveries.find(d =>
        notif.deliveryId ? d.id === notif.deliveryId
          : d.businessId === notif.businessId &&
            d.pickupAddress === notif.pickupAddress &&
            d.dropAddress === notif.dropAddress &&
            d.status === 'pending'
      );

      const courierData = getCourier(courierId);
      const courierName = courierData?.name ?? 'שליח';
      const courierRating = courierData?.rating ?? 5;
      const courierVehicle = courierData?.vehicle ?? 'motorcycle';

      if (!matching) {
        toast.error('המשלוח כבר לא זמין — נסה אחד אחר');
        setAccepting(null);
        return;
      }

      await joinCandidatesQueue(matching.id, courierId, courierName, courierRating, courierVehicle);
      await courierApproveDelivery(matching.id, courierId);
      localStorage.setItem('pending_candidacy', JSON.stringify({ deliveryId: matching.id, notifId: notif.id, joinedAt: new Date().toISOString() }));

      acceptNotification(notif.id, courierId);
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
      prevCountRef.current = Math.max(0, prevCountRef.current - 1);
      setDetailNotif(null);
      toast.success('אישרת את המשלוח! ממתין לאישור העסק 🕐');
      // ── Navigate to dashboard so the candidacy poller kicks in ──
      navigate('/courier/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בהצטרפות לתור');
    } finally {
      setAccepting(null);
    }
  };

  // ─── Reject flow ──────────────────────────────────────────
  const handleReject = (notif: DeliveryNotification) => {
    if (!courierId) return;
    dismissNotification(notif.id, courierId);
    // Save to rejected list
    const ids = getRejectedIds();
    if (!ids.includes(notif.id)) {
      setRejectedIds([...ids, notif.id]);
      setRejectedNotifs(prev => [...prev, notif]);
    }
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    prevCountRef.current = Math.max(0, prevCountRef.current - 1);
    setDetailNotif(null);
    toast('דחית את המשלוח', { duration: 2000 });
  };

  // ─── Details flow ─────────────────────────────────────────
  const handleDetails = (notif: DeliveryNotification) => {
    setDetailNotif(notif);
    // Fire-and-forget: mark as viewing
    if (courierId) {
      const courierData = getCourier(courierId);
      const deliveryId = notif.deliveryId;
      if (deliveryId && courierData) {
        markCourierViewing(
          deliveryId,
          courierId,
          courierData.name,
          courierData.rating,
          courierData.vehicle
        ).catch(console.error);
      }
    }
  };

  // ─── Chat flow ────────────────────────────────────────────
  const handleChat = (notif: DeliveryNotification) => {
    if (!courierId || !notif.businessId) return;
    const conv = getOrCreateConversation(notif.businessId, courierId);
    const prefillMsg = `שלום! מעוניין במשלוח מ-${notif.pickupAddress} ל-${notif.dropAddress} (₪${notif.price ?? ''})`;
    navigate(`/courier/chat?convId=${conv.id}&deliveryId=${notif.deliveryId ?? ''}&prefill=${encodeURIComponent(prefillMsg)}`);
  };

  // ─── Un-reject flow ───────────────────────────────────────
  const handleUnreject = (notif: DeliveryNotification) => {
    if (!courierId) return;
    const ids = getRejectedIds().filter(id => id !== notif.id);
    setRejectedIds(ids);
    setRejectedNotifs(prev => prev.filter(n => n.id !== notif.id));
    // Add back to notifications list
    setNotifications(prev => [notif, ...prev]);
    prevCountRef.current += 1;
    toast.success('המשלוח הוחזר לרשימה');
  };

  const handleClearAll = () => {
    if (!courierId) return;
    notifications.forEach(n => dismissNotification(n.id, courierId));
    setNotifications([]);
    prevCountRef.current = 0;
    toast.success('כל ההודעות נוקו');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-5" style={{ background: BG, minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-black" style={{ color: TEXT }}>
          משלוחים פנויים
          {notifications.length > 0 && (
            <span className="mr-2 text-[13px] px-2 py-0.5 rounded-full font-bold" style={{ background: ERROR, color: '#fff' }}>
              {notifications.length}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[12px] font-semibold transition-all active:scale-95"
              style={{ background: '#FDECEA', color: ERROR, border: `1px solid #F5C6C6` }}
            >
              <TrashIcon className="w-4 h-4" />
              נקה
            </button>
          )}
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[12px] font-semibold transition-all active:scale-95"
            style={{ background: BG, color: BLUE, border: `1px solid ${BORDER}` }}
          >
            <ArrowPathIcon className="w-4 h-4" />
            רענן
          </button>
        </div>
      </div>

      {/* Unavailable banner */}
      {isUnavailable && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: '#FDECEA', border: `1px solid #F5C6C6` }}>
          <span className="text-2xl">🔴</span>
          <div>
            <p className="text-[13px] font-black" style={{ color: ERROR }}>אתה מסומן כלא זמין</p>
            <p className="text-[11px]" style={{ color: '#C0392B' }}>
              לא תקבל התראות על משלוחים. שנה את הסטטוס שלך בפרופיל.
            </p>
          </div>
        </div>
      )}

      {/* Active notifications */}
      {!isUnavailable && notifications.length === 0 ? (
        <div
          className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#E6F5FC' }}>
            <BellIcon className="w-8 h-8" style={{ color: BLUE }} />
          </div>
          <p className="font-bold text-[16px]" style={{ color: TEXT }}>אין משלוחים פנויים כרגע</p>
          <p className="text-[12px]" style={{ color: TEXT2 }}>המערכת מסנכרנת בזמן אמת עם השרת...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <NotifCard
              key={n.id}
              notif={n}
              navPref={navPref}
              accepting={accepting === n.id}
              onApprove={() => handleApprove(n)}
              onReject={() => handleReject(n)}
              onDetails={() => handleDetails(n)}
              onChat={() => handleChat(n)}
            />
          ))}
        </div>
      )}

      {/* Rejected section */}
      {rejectedNotifs.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowRejected(!showRejected)}
            className="flex items-center gap-2 text-[13px] font-bold mb-3"
            style={{ color: TEXT2 }}
          >
            {showRejected ? '▾' : '▸'} 📋 משלוחים שדחית ({rejectedNotifs.length})
          </button>
          {showRejected && (
            <div className="space-y-3">
              {rejectedNotifs.map((n) => (
                <div
                  key={n.id}
                  className="rounded-2xl p-4 opacity-70"
                  style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-bold" style={{ color: TEXT }}>{n.businessName}</p>
                    {n.price != null && <span className="text-[14px] font-black" style={{ color: TEXT2 }}>₪{n.price}</span>}
                  </div>
                  <p className="text-[12px] mb-1" style={{ color: TEXT2 }}>📍 {n.pickupAddress}</p>
                  <p className="text-[12px] mb-3" style={{ color: TEXT2 }}>🎯 {n.dropAddress}</p>
                  {!n.takenBy && (
                    <button
                      onClick={() => handleUnreject(n)}
                      className="w-full py-2.5 rounded-2xl font-bold text-[13px] transition-all active:scale-95"
                      style={{ background: '#EAF7FD', color: BLUE, border: `1px solid ${BLUE}30` }}
                    >
                      ↩️ קח אליי בכל זאת
                    </button>
                  )}
                  {n.takenBy && (
                    <p className="text-center text-[11px]" style={{ color: TEXT2 }}>המשלוח כבר נלקח על ידי שליח אחר</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {detailNotif && (
        <DetailModal
          notif={detailNotif}
          navPref={navPref}
          accepting={accepting === detailNotif.id}
          onApprove={() => handleApprove(detailNotif)}
          onReject={() => handleReject(detailNotif)}
          onClose={() => setDetailNotif(null)}
        />
      )}
    </div>
  );
};

export default AvailableDeliveries;
