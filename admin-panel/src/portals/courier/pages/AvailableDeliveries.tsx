import React, { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  getPendingNotifications,
  acceptNotification,
  dismissNotification,
  getDeliveries,
  getCourier,
  type DeliveryNotification,
} from '../../../services/storage.service';
import { syncNotificationsDown, syncDeliveriesDown, joinCandidatesQueue } from '../../../services/sync.service';
import { supabase } from '../../../lib/supabase';
import { playNewDelivery } from '../../../utils/sounds';
import { BellIcon, ArrowPathIcon, TrashIcon, MapPinIcon } from '@heroicons/react/24/outline';

// ─── Design tokens ────────────────────────────────────────────
const BLUE    = '#009DE0';
const BG      = '#F4F4F4';
const CARD_BG = '#FFFFFF';
const TEXT    = '#202125';
const TEXT2   = '#757575';
const BORDER  = '#E8E8E8';
const SUCCESS = '#1BA672';
const WARNING = '#F58F1F';
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
          style={{ background: '#FFF4E5', color: WARNING }}
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

const AvailableDeliveries: React.FC = () => {
  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const prevCountRef = useRef(-1);

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

  // ─── Supabase Realtime: instant push on new notifications ─
  useEffect(() => {
    if (!courierId) return;
    const channel = supabase
      .channel('delivery_notifications_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_notifications' },
        async () => {
          // New notification inserted → refresh immediately
          await syncNotificationsDown();
          const fresh = getPendingNotifications(courierId);
          if (prevCountRef.current >= 0 && fresh.length > prevCountRef.current) {
            playNewDelivery();
            toast.success(`📦 משלוח חדש זמין!`, { duration: 4000 });
          }
          prevCountRef.current = fresh.length;
          setNotifications(fresh);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'delivery_notifications' },
        async () => {
          await syncNotificationsDown();
          const fresh = getPendingNotifications(courierId);
          prevCountRef.current = fresh.length;
          setNotifications(fresh);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [courierId]);

  const courier = courierId ? getCourier(courierId) : null;
  const isUnavailable = courier?.isAvailable === false;
  const navPref = courier?.navPreference ?? 'waze';

  // ─── Accept delivery — join candidates queue ─────────────
  const handleAccept = async (notif: DeliveryNotification) => {
    if (!courierId) return;
    setAccepting(notif.id);
    try {
      // Sync deliveries from Supabase to find the matching delivery
      await syncDeliveriesDown();
      const allDeliveries = getDeliveries();
      const matching = allDeliveries.find(
        (d) =>
          d.businessId === notif.businessId &&
          d.pickupAddress === notif.pickupAddress &&
          d.status === 'pending'
      );

      // Get courier data from localStorage
      const courierData = getCourier(courierId);
      const courierName = courierData?.name ?? 'שליח';
      const courierRating = courierData?.rating ?? 5;
      const courierVehicle = courierData?.vehicle ?? 'motorcycle';

      if (matching) {
        await joinCandidatesQueue(matching.id, courierId, courierName, courierRating, courierVehicle);
        // Store pending candidacy in localStorage
        localStorage.setItem('pending_candidacy', JSON.stringify({ deliveryId: matching.id, notifId: notif.id, joinedAt: new Date().toISOString() }));
      }

      // Mark notification as taken
      acceptNotification(notif.id, courierId);
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
      prevCountRef.current = Math.max(0, prevCountRef.current - 1);

      toast.success('נוספת לתור! ממתין לאישור העסק 🕐');
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בהצטרפות לתור');
    } finally {
      setAccepting(null);
    }
  };

  const handleDismiss = (notif: DeliveryNotification) => {
    if (!courierId) return;
    dismissNotification(notif.id, courierId);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    prevCountRef.current = Math.max(0, prevCountRef.current - 1);
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
            <span
              className="mr-2 text-[13px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: ERROR, color: '#fff' }}
            >
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
        <div
          className="rounded-2xl p-4 mb-4 flex items-center gap-3"
          style={{ background: '#FDECEA', border: `1px solid #F5C6C6` }}
        >
          <span className="text-2xl">🔴</span>
          <div>
            <p className="text-[13px] font-black" style={{ color: ERROR }}>אתה מסומן כלא זמין</p>
            <p className="text-[11px]" style={{ color: '#C0392B' }}>
              לא תקבל התראות על משלוחים. שנה את הסטטוס שלך בפרופיל.
            </p>
          </div>
        </div>
      )}

      {!isUnavailable && notifications.length === 0 ? (
        <div
          className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: '#E6F5FC' }}
          >
            <BellIcon className="w-8 h-8" style={{ color: BLUE }} />
          </div>
          <p className="font-bold text-[16px]" style={{ color: TEXT }}>אין משלוחים פנויים כרגע</p>
          <p className="text-[12px]" style={{ color: TEXT2 }}>
            המערכת מסנכרנת בזמן אמת עם השרת...
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="rounded-2xl p-4"
              style={{
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {/* Business + price */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[12px] font-black"
                    style={{ background: `linear-gradient(135deg, ${BLUE}, #0077AA)` }}
                  >
                    {n.businessName[0]}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: TEXT }}>{n.businessName}</p>
                    <p className="text-[10px]" style={{ color: TEXT2 }}>
                      {new Date(n.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {n.price != null && (
                  <span className="text-[16px] font-black" style={{ color: BLUE }}>
                    ₪{n.price}
                  </span>
                )}
              </div>

              {/* Addresses */}
              <div className="space-y-2 mb-3">
                <div className="flex gap-2 items-start">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                    style={{ background: SUCCESS }}
                  >א</div>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: TEXT2 }}>איסוף</p>
                    <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{n.pickupAddress}</p>
                  </div>
                </div>
                <div className="w-px h-3 mr-2.5" style={{ background: BORDER }} />
                <div className="flex gap-2 items-start">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                    style={{ background: ERROR }}
                  >ב</div>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: TEXT2 }}>מסירה</p>
                    <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{n.dropAddress}</p>
                  </div>
                </div>
              </div>

              {/* Distance info */}
              <DistanceInfo notif={n} />

              {/* Navigation link — uses courier's preferred nav app */}
              <a
                href={navUrl(n.pickupAddress, navPref)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-semibold mb-3"
                style={{ color: BLUE }}
              >
                🗺️ נווט לכתובת האיסוף
              </a>

              {/* Payment / vehicle info tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {n.paymentMethod && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: BG, color: TEXT2 }}
                  >
                    {n.paymentMethod === 'cash' ? '💵 מזומן' : '📱 ביט'}
                  </span>
                )}
                {n.customerPaid !== undefined && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                    style={{
                      background: n.customerPaid ? '#E8F8F2' : '#FFF4E5',
                      color: n.customerPaid ? SUCCESS : WARNING,
                    }}
                  >
                    {n.customerPaid ? '✅ שולם ע"י לקוח' : '💳 גביה בעת המסירה'}
                  </span>
                )}
                {n.requiredVehicle && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: '#E6F5FC', color: BLUE }}
                  >
                    {n.requiredVehicle === 'motorcycle' ? '🏍️ אופנוע' : n.requiredVehicle === 'bicycle' ? '🚲 אופניים' : n.requiredVehicle === 'scooter' ? '🛵 קטנוע' : '🚗 רכב'}
                  </span>
                )}
              </div>

              {n.description && (
                <div
                  className="rounded-xl px-3 py-2 mb-3 text-[12px]"
                  style={{ background: BG, color: TEXT2 }}
                >
                  {n.description}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(n)}
                  disabled={accepting === n.id}
                  className="flex-1 py-3 rounded-2xl text-white font-black text-[14px] transition-all active:scale-95 disabled:opacity-60"
                  style={{
                    background: BLUE,
                    boxShadow: '0 4px 12px rgba(0,157,224,0.30)',
                  }}
                >
                  {accepting === n.id ? 'מצטרף לתור...' : 'אני מגיע! ✋'}
                </button>
                <button
                  onClick={() => handleDismiss(n)}
                  className="px-4 py-3 rounded-2xl font-bold text-[13px] transition-all active:scale-95"
                  style={{ background: BG, color: TEXT2, border: `1px solid ${BORDER}` }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvailableDeliveries;
