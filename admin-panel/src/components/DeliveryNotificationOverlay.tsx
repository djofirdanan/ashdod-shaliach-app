import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  TruckIcon,
  MapPinIcon,
  XMarkIcon,
  CheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import type { RootState } from '../store';
import * as storageService from '../services/storage.service';
import type { DeliveryNotification } from '../services/storage.service';
import { syncNotificationsDown, joinCandidatesQueue } from '../services/sync.service';
import { supabase } from '../lib/supabase';
import { playNewDelivery } from '../utils/sounds';
import { Modal } from './ui/Modal';

// ─── Single notification card ─────────────────────────────────
const NotifCard: React.FC<{
  notif: DeliveryNotification;
  courierId: string;
  onAccept: () => void;
  onDismiss: () => void;
  onDetails: () => void;
  index: number;
}> = ({ notif, onAccept, onDismiss, onDetails, index }) => {
  const [countdown, setCountdown] = useState(60);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(t); setExiting(true); setTimeout(onDismiss, 400); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onDismiss]);

  const age = Math.round((Date.now() - new Date(notif.createdAt).getTime()) / 1000);
  const progressPct = (countdown / 60) * 100;

  return (
    <div
      className="relative w-full"
      style={{
        animation: exiting
          ? 'slideOut 0.4s ease-in forwards'
          : 'slideIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
        transform: `scale(${1 - index * 0.025}) translateY(${index * 6}px)`,
        zIndex: 200 - index,
        opacity: exiting ? 0 : undefined,
      }}
    >
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0d1f3c 0%, #0f2044 55%, #1a1050 100%)',
          border: '1.5px solid rgba(83,58,253,0.5)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(83,58,253,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Countdown bar */}
        <div className="h-1 w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full"
            style={{
              width: `${progressPct}%`,
              background: progressPct > 33
                ? 'linear-gradient(90deg, #533afd, #ea2261)'
                : 'linear-gradient(90deg, #ea2261, #ff4444)',
              transition: 'width 1s linear, background 0.5s',
            }}
          />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #533afd, #ea2261)',
                boxShadow: '0 6px 16px rgba(83,58,253,0.5)',
              }}
            >
              <TruckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(83,58,253,0.3)', color: '#a89bff', border: '1px solid rgba(83,58,253,0.4)' }}
                >
                  <span className="w-2 h-2 rounded-full bg-[#533afd] animate-pulse inline-block" />
                  🚨 משלוח חדש!
                </span>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {age < 60 ? `לפני ${age}ש׳` : 'עכשיו'}
                </span>
              </div>
              <p className="text-white font-black text-[17px] leading-tight">{notif.businessName}</p>
            </div>
          </div>
          <button
            onClick={() => { setExiting(true); setTimeout(onDismiss, 400); }}
            className="p-2 rounded-xl flex-shrink-0 transition-colors hover:bg-white/10 mt-0.5"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Price badge (if present) */}
        {notif.price != null && (
          <div className="px-5 pb-2">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(83,58,253,0.2)', border: '1px solid rgba(83,58,253,0.3)' }}
            >
              <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>תשלום:</span>
              <span className="text-[20px] font-black text-white">₪{notif.price}</span>
            </div>
          </div>
        )}

        {/* Addresses */}
        <div className="px-5 pb-3 space-y-2">
          <div className="flex items-start gap-3 px-3 py-2.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="w-6 h-6 rounded-full bg-green-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPinIcon className="w-3.5 h-3.5 text-green-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>איסוף</p>
              <p className="text-[14px] text-white font-medium leading-tight">{notif.pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>
          <div className="flex items-start gap-3 px-3 py-2.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="w-6 h-6 rounded-full bg-red-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPinIcon className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>מסירה</p>
              <p className="text-[14px] text-white font-medium leading-tight">{notif.dropAddress}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-4 flex gap-3">
          <button
            onClick={onAccept}
            className="flex-1 py-3.5 rounded-2xl font-black text-[15px] text-white flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #533afd, #ea2261)',
              boxShadow: '0 6px 20px rgba(83,58,253,0.5)',
            }}
          >
            <CheckIcon className="w-5 h-5" />
            אני מגיע! ✋
          </button>
          <button
            onClick={onDetails}
            className="px-4 py-3.5 rounded-2xl font-bold text-[13px] flex items-center gap-1.5 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <InformationCircleIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Countdown */}
        <div className="px-5 pb-4">
          <div
            className="w-full py-1.5 rounded-xl text-center text-[11px] font-semibold"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
          >
            נסגר אוטומטית בעוד {countdown} שניות
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Details modal ────────────────────────────────────────────
const DetailModal: React.FC<{
  notif: DeliveryNotification | null;
  onClose: () => void;
  onAccept: () => void;
}> = ({ notif, onClose, onAccept }) => (
  <Modal isOpen={!!notif} onClose={onClose} title="פרטי משלוח" size="sm"
    footer={
      <>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">סגור</button>
        <button
          onClick={() => { onAccept(); onClose(); }}
          className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
        >
          ✋ אני מגיע!
        </button>
      </>
    }
  >
    {notif && (
      <div className="space-y-3 text-right" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] text-gray-400 mb-1">עסק</p>
            <p className="font-bold text-gray-900 text-sm">{notif.businessName}</p>
          </div>
          {notif.price && (
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-[11px] text-purple-400 mb-1">תשלום</p>
              <p className="font-bold text-purple-700 text-xl">₪{notif.price}</p>
            </div>
          )}
        </div>
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <div>
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> כתובת איסוף
            </p>
            <p className="font-medium text-gray-800 text-sm mt-0.5">{notif.pickupAddress}</p>
          </div>
          <div className="border-t border-gray-200 pt-2">
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> כתובת מסירה
            </p>
            <p className="font-medium text-gray-800 text-sm mt-0.5">{notif.dropAddress}</p>
          </div>
        </div>
        {notif.description && (
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-[11px] text-amber-500 mb-1">הערות</p>
            <p className="text-sm text-gray-700">{notif.description}</p>
          </div>
        )}
        <p className="text-[11px] text-gray-400 text-center">
          פורסם ב-{new Date(notif.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    )}
  </Modal>
);

// ─── Main Overlay ─────────────────────────────────────────────
export const DeliveryNotificationOverlay: React.FC = () => {
  const portalUser = useSelector((state: RootState) => state.auth.currentPortalUser);

  const courierToken = localStorage.getItem('admin_token') || '';
  const isCourier = courierToken.startsWith('courier-') || portalUser?.type === 'courier';
  const courierId = portalUser?.type === 'courier'
    ? portalUser.id
    : courierToken.startsWith('courier-')
      ? courierToken.replace('courier-', '')
      : null;

  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [detailNotif, setDetailNotif] = useState<DeliveryNotification | null>(null);
  const prevCountRef = useRef(-1);

  const refresh = useCallback(async () => {
    if (!courierId) return;
    await syncNotificationsDown();
    const pending = storageService.getPendingNotifications(courierId);
    // Play sound when NEW notifications arrive (not on first load)
    if (prevCountRef.current >= 0 && pending.length > prevCountRef.current) {
      playNewDelivery();
    }
    prevCountRef.current = pending.length;
    setNotifications(pending.slice(0, 3));
  }, [courierId]);

  // ─── Polling every 4 seconds ──────────────────────────────────
  useEffect(() => {
    if (!courierId) return;
    refresh();
    const interval = setInterval(refresh, 4000);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'app_notif_ping' || e.key === 'app_delivery_notifications') refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => { clearInterval(interval); window.removeEventListener('storage', onStorage); };
  }, [courierId, refresh]);

  // ─── Supabase Realtime: instant push on new notifications ─────
  useEffect(() => {
    if (!courierId) return;
    const channel = supabase
      .channel(`overlay_notif_${courierId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_notifications' },
        () => { refresh(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'delivery_notifications' },
        () => { refresh(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [courierId, refresh]);

  const handleAccept = async (notif: DeliveryNotification) => {
    if (!courierId) return;

    // 1. Find matching pending delivery — prefer deliveryId link, fall back to address
    const allDeliveries = storageService.getDeliveries();
    const matching = allDeliveries.find(d =>
      notif.deliveryId ? d.id === notif.deliveryId
        : d.businessId === notif.businessId &&
          d.pickupAddress === notif.pickupAddress &&
          d.dropAddress === notif.dropAddress &&
          d.status === 'pending'
    );

    const courierData = storageService.getCourier(courierId);
    const courierName = courierData?.name ?? 'שליח';
    const courierRating = courierData?.rating ?? 5;
    const courierVehicle = courierData?.vehicle ?? 'motorcycle';

    // 2. Join the candidates queue
    if (matching) {
      await joinCandidatesQueue(matching.id, courierId, courierName, courierRating, courierVehicle);
      // Store pending candidacy in localStorage
      localStorage.setItem('pending_candidacy', JSON.stringify({ deliveryId: matching.id, notifId: notif.id, joinedAt: new Date().toISOString() }));
    }

    // 3. Mark notification as taken (removes from overlay)
    storageService.acceptNotification(notif.id, courierId);

    // 4. Remove from overlay
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
  };

  const handleDismiss = (notifId: string) => {
    if (!courierId) return;
    storageService.dismissNotification(notifId, courierId);
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  if (!isCourier || notifications.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(110%) scale(0.8); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes slideOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(110%) scale(0.8); }
        }
      `}</style>

      {/* Overlay dim for top notification only */}
      {notifications.length > 0 && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        />
      )}

      {/* Notification stack */}
      <div
        className="fixed z-50 flex flex-col-reverse gap-3"
        style={{ bottom: 24, left: 12, right: 12, maxWidth: 440, margin: '0 auto' }}
        dir="rtl"
      >
        {notifications.map((notif, i) => (
          <NotifCard
            key={notif.id}
            notif={notif}
            courierId={courierId!}
            index={i}
            onAccept={() => handleAccept(notif)}
            onDismiss={() => handleDismiss(notif.id)}
            onDetails={() => setDetailNotif(notif)}
          />
        ))}
      </div>

      {/* Detail modal */}
      <DetailModal
        notif={detailNotif}
        onClose={() => setDetailNotif(null)}
        onAccept={() => detailNotif && handleAccept(detailNotif)}
      />
    </>
  );
};

const NOTIF_KEY_WATCH = 'app_delivery_notifications';
void NOTIF_KEY_WATCH; // suppress unused warning
