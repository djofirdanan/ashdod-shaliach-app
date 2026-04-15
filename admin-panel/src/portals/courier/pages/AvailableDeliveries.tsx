import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { RootState } from '../../../store';
import {
  getPendingNotifications,
  acceptNotification,
  dismissNotification,
  updateDelivery,
  getDeliveries,
  getCourier,
  getOrCreateConversation,
  type DeliveryNotification,
} from '../../../services/storage.service';
import { syncNotificationsDown, syncDeliveriesDown } from '../../../services/sync.service';
import { playNewDelivery } from '../../../utils/sounds';
import { BellIcon, ArrowPathIcon, TrashIcon, MapPinIcon } from '@heroicons/react/24/outline';

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
      // Geocode pickup + drop
      const [p, d] = await Promise.all([
        geocodeAddress(notif.pickupAddress),
        geocodeAddress(notif.dropAddress),
      ]);
      if (cancelled) return;
      if (p && d) setPickupToDropKm(haversineKm(p.lat, p.lng, d.lat, d.lng));

      // My location → pickup
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          if (p) {
            const km = haversineKm(pos.coords.latitude, pos.coords.longitude, p.lat, p.lng);
            setMyToPickupKm(km);
            // Estimate: avg 25 km/h in city
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
          style={{ background: '#f0f4f8', color: '#533afd' }}
        >
          <MapPinIcon className="w-3 h-3" />
          מרחק משלוח: {pickupToDropKm.toFixed(1)} ק"מ
        </span>
      )}
      {myToPickupKm !== null && myToPickupMin !== null && (
        <span
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: '#fff7ed', color: '#f59e0b' }}
        >
          🛵 {myToPickupKm.toFixed(1)} ק"מ ממני • ~{myToPickupMin} דק' לאיסוף
        </span>
      )}
    </div>
  );
};

// ─── Google Maps navigation link ──────────────────────────────
function mapsLink(from: string, to: string): string {
  const f = encodeURIComponent(from + ', ישראל');
  const t = encodeURIComponent(to + ', ישראל');
  return `https://www.google.com/maps/dir/?api=1&origin=${f}&destination=${t}`;
}

const AvailableDeliveries: React.FC = () => {
  const user = useSelector((s: RootState) => s.auth.user);
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const prevCountRef = useRef(-1);

  const refresh = useCallback(async () => {
    if (!courierId) return;
    await Promise.all([syncNotificationsDown(), syncDeliveriesDown()]);
    const fresh = getPendingNotifications(courierId);
    // Play sound when new notifications arrive
    if (prevCountRef.current >= 0 && fresh.length > prevCountRef.current) {
      playNewDelivery();
      toast.success(`📦 משלוח חדש זמין!`, { duration: 4000 });
    }
    prevCountRef.current = fresh.length;
    setNotifications(fresh);
  }, [courierId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 6000);
    return () => clearInterval(id);
  }, [refresh]);

  const courier = courierId ? getCourier(courierId) : null;
  const isUnavailable = courier?.isAvailable === false;

  const handleAccept = async (notif: DeliveryNotification) => {
    if (!courierId || !user) return;
    setAccepting(notif.id);
    try {
      acceptNotification(notif.id, courierId);

      const allDeliveries = getDeliveries();
      const matching = allDeliveries.find(
        (d) =>
          d.businessId === notif.businessId &&
          d.pickupAddress === notif.pickupAddress &&
          d.status === 'pending'
      );

      const courierData = getCourier(courierId);
      const courierName = courierData?.name ?? user.name ?? 'שליח';

      let deliveryId = matching?.id;
      if (matching) {
        updateDelivery(matching.id, {
          status: 'accepted',
          courierId,
          courierName,
          acceptedAt: new Date().toISOString(),
        });
      }

      // Open chat with business
      const conv = getOrCreateConversation(notif.businessId, courierId);
      toast.success('קיבלת את המשלוח! עובר לצ׳אט...');
      const params = new URLSearchParams({ convId: conv.id });
      if (deliveryId) params.set('deliveryId', deliveryId);
      navigate(`/courier/chat?${params.toString()}`);
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בקבלת המשלוח');
    } finally {
      setAccepting(null);
    }
  };

  const handleDismiss = (notif: DeliveryNotification) => {
    if (!courierId) return;
    dismissNotification(notif.id, courierId);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
  };

  const handleClearAll = () => {
    if (!courierId) return;
    notifications.forEach(n => dismissNotification(n.id, courierId));
    setNotifications([]);
    toast.success('כל ההודעות נוקו');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-black" style={{ color: '#061b31' }}>
          משלוחים פנויים
          {notifications.length > 0 && (
            <span
              className="mr-2 text-[13px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: '#ea2261', color: '#fff' }}
            >
              {notifications.length}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
              style={{ background: '#fff0f0', color: '#ef4444', border: '1px solid #fecdd3' }}
            >
              <TrashIcon className="w-4 h-4" />
              נקה
            </button>
          )}
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
            style={{ background: '#f0f4f8', color: '#533afd', border: '1px solid #e8ecf0' }}
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
          style={{ background: '#fef2f2', border: '1px solid #fecdd3' }}
        >
          <span className="text-2xl">🔴</span>
          <div>
            <p className="text-[13px] font-black" style={{ color: '#ef4444' }}>אתה מסומן כלא זמין</p>
            <p className="text-[11px]" style={{ color: '#f87171' }}>
              לא תקבל התראות על משלוחים. שנה את הסטטוס שלך בכפתור "זמין/לא זמין" למעלה.
            </p>
          </div>
        </div>
      )}

      {!isUnavailable && notifications.length === 0 ? (
        <div
          className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
          style={{ background: '#fff', border: '1px solid #e8ecf0' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: '#f0f4f8' }}
          >
            <BellIcon className="w-8 h-8" style={{ color: '#8898aa' }} />
          </div>
          <p className="font-bold text-[16px]" style={{ color: '#061b31' }}>אין משלוחים פנויים כרגע</p>
          <p className="text-[12px]" style={{ color: '#8898aa' }}>
            המערכת מסנכרנת עם השרת כל 6 שניות...
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="rounded-2xl p-4"
              style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(83,58,253,0.06)' }}
            >
              {/* Business + price */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[12px] font-black"
                    style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
                  >
                    {n.businessName[0]}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: '#061b31' }}>{n.businessName}</p>
                    <p className="text-[10px]" style={{ color: '#8898aa' }}>
                      {new Date(n.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {n.price != null && (
                  <span className="text-[16px] font-black" style={{ color: '#533afd' }}>
                    ₪{n.price}
                  </span>
                )}
              </div>

              {/* Addresses */}
              <div className="space-y-2 mb-3">
                <div className="flex gap-2 items-start">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                    style={{ background: '#533afd' }}
                  >א</div>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: '#8898aa' }}>איסוף</p>
                    <p className="text-[13px] font-semibold" style={{ color: '#061b31' }}>{n.pickupAddress}</p>
                  </div>
                </div>
                <div className="w-px h-3 mr-2.5" style={{ background: '#e8ecf0' }} />
                <div className="flex gap-2 items-start">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                    style={{ background: '#ea2261' }}
                  >ב</div>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: '#8898aa' }}>מסירה</p>
                    <p className="text-[13px] font-semibold" style={{ color: '#061b31' }}>{n.dropAddress}</p>
                  </div>
                </div>
              </div>

              {/* Distance info */}
              <DistanceInfo notif={n} />

              {/* Google Maps link */}
              <a
                href={mapsLink(n.pickupAddress, n.dropAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-semibold mb-3"
                style={{ color: '#533afd' }}
              >
                🗺️ פתח בGoogle Maps
              </a>

              {/* Payment / vehicle info tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {n.paymentMethod && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#f0f4f8', color: '#8898aa' }}>
                    {n.paymentMethod === 'cash' ? '💵 מזומן' : '📱 ביט'}
                  </span>
                )}
                {n.customerPaid !== undefined && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: n.customerPaid ? '#f0fdf4' : '#fff7ed', color: n.customerPaid ? '#10b981' : '#f59e0b' }}
                  >
                    {n.customerPaid ? '✅ שולם ע"י לקוח' : '💳 גביה בעת המסירה'}
                  </span>
                )}
                {n.requiredVehicle && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#eef2ff', color: '#533afd' }}>
                    {n.requiredVehicle === 'motorcycle' ? '🏍️ אופנוע' : n.requiredVehicle === 'bicycle' ? '🚲 אופניים' : n.requiredVehicle === 'scooter' ? '🛵 קטנוע' : '🚗 רכב'}
                  </span>
                )}
              </div>

              {n.description && (
                <div
                  className="rounded-xl px-3 py-2 mb-3 text-[12px]"
                  style={{ background: '#f6f9fc', color: '#8898aa' }}
                >
                  {n.description}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(n)}
                  disabled={accepting === n.id}
                  className="flex-1 py-3 rounded-xl text-white font-black text-[14px] transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)', boxShadow: '0 4px 12px rgba(83,58,253,0.25)' }}
                >
                  {accepting === n.id ? 'מקבל...' : '✅ קבל משלוח'}
                </button>
                <button
                  onClick={() => handleDismiss(n)}
                  className="px-4 py-3 rounded-xl font-bold text-[13px] transition-all active:scale-95"
                  style={{ background: '#f0f4f8', color: '#8898aa', border: '1px solid #e8ecf0' }}
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
