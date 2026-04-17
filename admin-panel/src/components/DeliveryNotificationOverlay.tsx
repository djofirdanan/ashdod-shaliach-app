import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  MapPinIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Siren, Timer } from '@phosphor-icons/react';
import type { RootState } from '../store';
import * as storageService from '../services/storage.service';
import type { DeliveryNotification } from '../services/storage.service';
import { syncNotificationsDown, joinCandidatesQueue, syncDeliveriesDown } from '../services/sync.service';
import { supabase } from '../lib/supabase';
import { playNewDelivery } from '../utils/sounds';
import toast from 'react-hot-toast';
import { usePrepCountdown } from '../utils/usePrepCountdown';

// ETA options the courier can pick
const ETA_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];

// ─── Prep time row (only when delivery has prepReadyAt) ─────────
const PrepTimeRow: React.FC<{ prepReadyAt?: string; prepMinutes?: number }> = ({
  prepReadyAt, prepMinutes,
}) => {
  const prep = usePrepCountdown(prepReadyAt);
  if (!prepReadyAt && !prepMinutes) return null;

  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-xl"
      style={{
        background: prep.urgency === 'ready'
          ? 'rgba(16,185,129,0.12)'
          : 'rgba(0,157,224,0.10)',
        border: `1px solid ${prep.urgency === 'ready' ? 'rgba(16,185,129,0.25)' : 'rgba(0,157,224,0.2)'}`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <Timer size={13} style={{ color: prep.urgency === 'ready' ? '#10b981' : '#009DE0' }} />
        <span className="text-[11px] font-semibold" style={{ color: prep.urgency === 'ready' ? '#065f46' : '#0c4a6e' }}>
          {prep.isPast ? 'מוכן לאיסוף עכשיו!' : 'ההזמנה תהיה מוכנה בערך בעוד:'}
        </span>
      </div>
      {!prep.isPast && (
        <span className="text-[14px] font-black tabular-nums" style={{ color: '#009DE0' }}>
          {prep.label}
        </span>
      )}
    </div>
  );
};

// ─── Single notification card ─────────────────────────────────
const NotifCard: React.FC<{
  notif: DeliveryNotification;
  courierId: string;
  onAccept: (etaMinutes: number) => void;
  onDismiss: () => void;
  index: number;
}> = ({ notif, onAccept, onDismiss, index }) => {
  const [countdown, setCountdown] = useState(60);
  const [exiting,   setExiting]   = useState(false);
  const [phase,     setPhase]     = useState<'default' | 'eta'>('default');

  // Look up delivery for prep time info
  const delivery = storageService.getDeliveries().find(
    d => d.id === notif.deliveryId || (
      d.businessId === notif.businessId &&
      d.pickupAddress === notif.pickupAddress &&
      d.dropAddress === notif.dropAddress
    )
  );

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); setExiting(true); setTimeout(onDismiss, 350); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onDismiss]);

  const age = Math.round((Date.now() - new Date(notif.createdAt).getTime()) / 1000);
  const progressPct = (countdown / 60) * 100;

  const dismiss = () => { setExiting(true); setTimeout(onDismiss, 350); };

  return (
    <div
      className="relative w-full"
      style={{
        animation: exiting
          ? 'notifOut 0.35s ease-in forwards'
          : 'notifIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
        transform: `scale(${1 - index * 0.03}) translateY(${index * 8}px)`,
        zIndex: 200 - index,
      }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#FFFFFF',
          border: '1.5px solid rgba(0,157,224,0.25)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,157,224,0.12)',
        }}
      >
        {/* Progress bar */}
        <div className="h-1 w-full" style={{ background: '#F0F0F0' }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${progressPct}%`,
              background: progressPct > 33
                ? 'linear-gradient(90deg, #009DE0, #2563eb)'
                : 'linear-gradient(90deg, #f59e0b, #ef4444)',
              transition: 'width 1s linear',
            }}
          />
        </div>

        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #009DE0, #2563eb)' }}
            >
              <Siren size={18} weight="fill" style={{ color: '#fff' }} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: '#EAF7FD', color: '#009DE0' }}
                >
                  ● משלוח חדש!
                </span>
                <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                  {age < 60 ? `לפני ${age}ש׳` : 'עכשיו'}
                </span>
              </div>
              <p className="font-black text-[16px] leading-tight" style={{ color: '#202125' }}>
                {notif.businessName}
              </p>
            </div>
          </div>

          {/* Price + close */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {notif.price != null && (
              <div
                className="px-2.5 py-1 rounded-xl text-center"
                style={{ background: '#EAF7FD' }}
              >
                <p className="text-[18px] font-black leading-none" style={{ color: '#009DE0' }}>₪{notif.price}</p>
              </div>
            )}
            <button
              onClick={dismiss}
              className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
              style={{ color: '#9CA3AF' }}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Addresses */}
        <div className="px-4 pb-2 space-y-1.5">
          <div className="flex items-start gap-2.5 px-3 py-2 rounded-xl" style={{ background: '#F8FFFE' }}>
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPinIcon className="w-3 h-3 text-emerald-600" />
            </div>
            <div>
              <p className="text-[9px] font-bold" style={{ color: '#9CA3AF' }}>איסוף</p>
              <p className="text-[13px] font-semibold leading-tight" style={{ color: '#202125' }}>{notif.pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 px-3 py-2 rounded-xl" style={{ background: '#FFF8F8' }}>
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPinIcon className="w-3 h-3 text-red-500" />
            </div>
            <div>
              <p className="text-[9px] font-bold" style={{ color: '#9CA3AF' }}>מסירה</p>
              <p className="text-[13px] font-semibold leading-tight" style={{ color: '#202125' }}>{notif.dropAddress}</p>
            </div>
          </div>

          {/* Prep time row — only if set */}
          {(delivery?.prepReadyAt || delivery?.prepMinutes) && (
            <PrepTimeRow prepReadyAt={delivery.prepReadyAt} prepMinutes={delivery.prepMinutes} />
          )}
        </div>

        {/* ── Phase: default — "אני מגיע!" button ── */}
        {phase === 'default' && (
          <div className="px-4 pb-3 flex gap-2">
            <button
              onClick={() => setPhase('eta')}
              className="flex-1 py-3 rounded-xl font-black text-[14px] text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #009DE0, #2563eb)',
                boxShadow: '0 4px 14px rgba(0,157,224,0.35)',
              }}
            >
              ✋ אני מגיע!
            </button>
          </div>
        )}

        {/* ── Phase: ETA selection ── */}
        {phase === 'eta' && (
          <div className="px-4 pb-4">
            <p className="text-[12px] font-bold text-center mb-2.5" style={{ color: '#202125' }}>
              תוך כמה זמן תאסוף?
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {ETA_OPTIONS.map(m => (
                <button
                  key={m}
                  onClick={() => onAccept(m)}
                  className="py-2.5 rounded-xl font-black text-[13px] transition-all active:scale-95 hover:scale-105 flex flex-col items-center justify-center gap-0"
                  style={{
                    background: 'linear-gradient(135deg, #009DE0, #2563eb)',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(0,157,224,0.3)',
                  }}
                >
                  <span className="text-[15px] font-black leading-tight">{m}</span>
                  <span className="text-[9px] font-semibold opacity-80 leading-tight">דקות</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPhase('default')}
              className="w-full mt-2 py-2 rounded-xl text-[12px] font-semibold"
              style={{ color: '#9CA3AF', background: '#F4F4F4' }}
            >
              חזור
            </button>
          </div>
        )}

        {/* Countdown footer */}
        <div
          className="px-4 pb-3 text-center text-[10px] font-semibold"
          style={{ color: '#9CA3AF' }}
        >
          נסגר אוטומטית בעוד {countdown} שניות
        </div>
      </div>
    </div>
  );
};

// ─── Main Overlay ─────────────────────────────────────────────
export const DeliveryNotificationOverlay: React.FC = () => {
  const navigate   = useNavigate();
  const portalUser = useSelector((state: RootState) => state.auth.currentPortalUser);

  const courierToken = localStorage.getItem('admin_token') || '';
  const isCourier    = courierToken.startsWith('courier-') || portalUser?.type === 'courier';
  const courierId    = portalUser?.type === 'courier'
    ? portalUser.id
    : courierToken.startsWith('courier-')
      ? courierToken.replace('courier-', '')
      : null;

  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const prevCountRef = useRef(-1);

  const refresh = useCallback(async () => {
    if (!courierId) return;
    const courierInfo = storageService.getCourier(courierId);
    if (courierInfo?.isAvailable === false) {
      setNotifications([]);
      prevCountRef.current = 0;
      return;
    }
    await syncNotificationsDown();
    const pending = storageService.getPendingNotifications(courierId);
    if (prevCountRef.current >= 0 && pending.length > prevCountRef.current) {
      playNewDelivery();
    }
    prevCountRef.current = pending.length;
    setNotifications(pending.slice(0, 3));
  }, [courierId]);

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

  useEffect(() => {
    if (!courierId) return;
    const channel = supabase
      .channel(`overlay_notif_${courierId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_notifications' }, () => refresh())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_notifications' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [courierId, refresh]);

  const handleAccept = async (notif: DeliveryNotification, etaMinutes: number) => {
    if (!courierId) return;

    const courierData   = storageService.getCourier(courierId);
    const courierName   = courierData?.name ?? 'שליח';
    const courierRating = courierData?.rating ?? 5;
    const courierVehicle = courierData?.vehicle ?? 'motorcycle';

    let deliveryId = notif.deliveryId;
    if (!deliveryId) {
      await syncDeliveriesDown().catch(() => {});
      const all = storageService.getDeliveries();
      const match = all.find(d =>
        d.businessId === notif.businessId &&
        d.pickupAddress === notif.pickupAddress &&
        d.dropAddress === notif.dropAddress &&
        d.status === 'pending'
      );
      deliveryId = match?.id;
    }

    if (deliveryId) {
      await joinCandidatesQueue(deliveryId, courierId, courierName, courierRating, courierVehicle, etaMinutes);
      localStorage.setItem('pending_candidacy', JSON.stringify({
        deliveryId,
        notifId: notif.id,
        joinedAt: new Date().toISOString(),
      }));
      toast.success(`✋ אישרת! מגיע בעוד ${etaMinutes} דק׳ — ממתין לאישור העסק`, {
        duration: 5000,
        style: { background: '#009DE0', color: '#fff', fontWeight: 700, borderRadius: 14, direction: 'rtl' },
      });
    } else {
      toast.error('המשלוח כבר לא זמין');
    }

    storageService.acceptNotification(notif.id, courierId);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    navigate('/courier/dashboard');
  };

  const handleDismiss = (notifId: string) => {
    if (!courierId) return;
    storageService.dismissNotification(notifId, courierId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  const courierData = courierId ? storageService.getCourier(courierId) : null;
  if (!isCourier || notifications.length === 0 || courierData?.isAvailable === false) return null;

  return (
    <>
      <style>{`
        @keyframes notifIn {
          from { opacity: 0; transform: translateY(-24px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes notifOut {
          from { opacity: 1; transform: translateY(0) scale(1);     }
          to   { opacity: 0; transform: translateY(-16px) scale(0.94); }
        }
      `}</style>

      {/* Soft backdrop */}
      <div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.28)' }}
      />

      {/* Card stack — top of screen */}
      <div
        className="fixed z-50 flex flex-col gap-2"
        style={{ top: 72, left: 10, right: 10, maxWidth: 420, margin: '0 auto' }}
        dir="rtl"
      >
        {notifications.map((notif, i) => (
          <NotifCard
            key={notif.id}
            notif={notif}
            courierId={courierId!}
            index={i}
            onAccept={eta => handleAccept(notif, eta)}
            onDismiss={() => handleDismiss(notif.id)}
          />
        ))}
      </div>
    </>
  );
};
