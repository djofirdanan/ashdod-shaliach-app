import React, { useEffect, useState, useCallback } from 'react';
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
  const [countdown, setCountdown] = useState(45);
  const [exiting, setExiting] = useState(false);

  // Countdown timer
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

  return (
    <div
      className="relative w-full max-w-sm"
      style={{
        animation: exiting ? 'slideOut 0.4s ease-in forwards' : 'slideIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
        transform: `translateY(${index * 4}px) scale(${1 - index * 0.02})`,
        zIndex: 100 - index,
        opacity: exiting ? 0 : 1,
      }}
    >
      <div
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(145deg, #0a1628 0%, #0f2044 60%, #1a1050 100%)',
          border: '1px solid rgba(83,58,253,0.4)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(83,58,253,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Progress bar */}
        <div className="h-0.5 w-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${(countdown / 45) * 100}%`,
              background: countdown > 15
                ? 'linear-gradient(90deg, #533afd, #ea2261)'
                : 'linear-gradient(90deg, #ea2261, #ff6b35)',
              transition: 'width 1s linear',
            }}
          />
        </div>

        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)', boxShadow: '0 4px 12px rgba(83,58,253,0.4)' }}
            >
              <TruckIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(83,58,253,0.25)', color: '#a89bff', border: '1px solid rgba(83,58,253,0.3)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#533afd] animate-pulse inline-block" />
                  משלוח חדש
                </span>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {age < 60 ? `לפני ${age}ש׳` : 'עכשיו'}
                </span>
              </div>
              <p className="text-white font-bold text-[15px] leading-tight mt-0.5">{notif.businessName}</p>
            </div>
          </div>
          <button
            onClick={() => { setExiting(true); setTimeout(onDismiss, 400); }}
            className="p-1.5 rounded-lg flex-shrink-0 transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Addresses */}
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPinIcon className="w-3 h-3 text-green-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>איסוף</p>
              <p className="text-[13px] text-white leading-tight">{notif.pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPinIcon className="w-3 h-3 text-red-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>מסירה</p>
              <p className="text-[13px] text-white leading-tight">{notif.dropAddress}</p>
            </div>
          </div>
          {notif.price && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(83,58,253,0.12)', border: '1px solid rgba(83,58,253,0.2)' }}>
              <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>תשלום שליח</span>
              <span className="text-[16px] font-bold text-white">₪{notif.price}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-4 pb-4 flex gap-2.5">
          <button
            onClick={onAccept}
            className="flex-1 py-3 rounded-xl font-bold text-[14px] text-white flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #533afd, #ea2261)',
              boxShadow: '0 4px 16px rgba(83,58,253,0.4)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
          >
            <CheckIcon className="w-4 h-4" />
            אני רוצה לקחת!
          </button>
          <button
            onClick={onDetails}
            className="px-4 py-3 rounded-xl font-semibold text-[13px] flex items-center gap-1.5 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
          >
            <InformationCircleIcon className="w-4 h-4" />
            פרטים
          </button>
        </div>

        {/* Countdown */}
        <div className="px-4 pb-3 flex items-center gap-1.5">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            נסגר אוטומטית בעוד {countdown} שניות
          </span>
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
          ✅ אני לוקח את המשלוח
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
            <p className="text-[11px] text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> כתובת איסוף</p>
            <p className="font-medium text-gray-800 text-sm mt-0.5">{notif.pickupAddress}</p>
          </div>
          <div className="border-t border-gray-200 pt-2">
            <p className="text-[11px] text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> כתובת מסירה</p>
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
  const authUser = useSelector((state: RootState) => state.auth.user);

  // Determine if current user is a courier
  const courierToken = localStorage.getItem('admin_token') || '';
  const isCourier = courierToken.startsWith('courier-') || portalUser?.type === 'courier';
  const courierId = portalUser?.type === 'courier'
    ? portalUser.id
    : courierToken.startsWith('courier-')
      ? courierToken.replace('courier-', '')
      : null;

  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [detailNotif, setDetailNotif] = useState<DeliveryNotification | null>(null);

  const refresh = useCallback(() => {
    if (!courierId) return;
    const pending = storageService.getPendingNotifications(courierId);
    setNotifications(pending.slice(0, 3)); // show max 3
  }, [courierId]);

  useEffect(() => {
    if (!courierId) return;
    refresh();
    const interval = setInterval(refresh, 4000);
    // Cross-tab notifications via storage event
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'app_notif_ping' || e.key === NOTIF_KEY_WATCH) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => { clearInterval(interval); window.removeEventListener('storage', onStorage); };
  }, [courierId, refresh]);

  const handleAccept = (notif: DeliveryNotification) => {
    if (!courierId) return;
    storageService.acceptNotification(notif.id, courierId);
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    // Toast-style success (using DOM since toast might not be available here)
    const el = document.createElement('div');
    el.textContent = '✅ קיבלת את המשלוח! בדוק את לוח הבקרה.';
    el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#533afd;color:white;padding:12px 24px;border-radius:12px;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(83,58,253,0.4);font-family:inherit;';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
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
          from { opacity: 0; transform: translateX(120%) scale(0.85); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes slideOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(120%) scale(0.85); }
        }
      `}</style>

      {/* Stack of notification cards — bottom right */}
      <div
        className="fixed z-50 flex flex-col-reverse gap-3"
        style={{ bottom: 24, left: 16, right: 16, maxWidth: 400, margin: '0 auto' }}
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
