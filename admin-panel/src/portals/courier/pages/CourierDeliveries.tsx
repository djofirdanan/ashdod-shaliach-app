import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowsClockwise, Timer } from '@phosphor-icons/react';
import { useJsApiLoader } from '@react-google-maps/api';
import DeliveryMap from '../../../components/DeliveryMap';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getDeliveriesByCourier,
  getDeliveries,
  updateDelivery,
  addMessage,
  addDeliveryNotification,
  getBusiness,
  getCourier,
  getOrCreateConversation,
  formatOrderNumber,
  type StoredDelivery,
} from '../../../services/storage.service';
import { withdrawFromQueue, syncDeliveriesDown, syncCourierDeliveriesDown, getCandidacyStatus } from '../../../services/sync.service';
import { supabase } from '../../../lib/supabase';
import {
  XMarkIcon,
  TruckIcon,
  ArchiveBoxIcon,
  CheckIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  InformationCircleIcon,
  CreditCardIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

// ─── Design tokens ──────────────────────────────────────────────
const BLUE   = '#009DE0';
const GREEN  = '#059669';   // emerald-600 — professional, muted green
const ORANGE = '#F58F1F';
const RED    = '#E23437';
const TEXT   = '#202125';
const TEXT2  = '#757575';
const DONE   = '#1e293b';   // slate-800 — timeline completed steps

type Tab = 'pending_approval' | 'active' | 'completed' | 'archived';

const statusLabel: Record<StoredDelivery['status'], string> = {
  scheduled: 'מתוזמן',
  pending: 'ממתין לשליח',
  accepted: 'בדרך לאיסוף',
  picked_up: 'בדרך ללקוח',
  delivered: 'נמסר',
  cancelled: 'בוטל',
};

const statusColor: Record<StoredDelivery['status'], string> = {
  scheduled: BLUE,
  pending: TEXT2,
  accepted: BLUE,
  picked_up: ORANGE,
  delivered: GREEN,
  cancelled: RED,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Prep countdown hook ─────────────────────────────────────────
function usePrepCountdown(prepReadyAt: string | undefined): {
  label: string; secLeft: number; isPast: boolean; urgency: 'ok' | 'soon' | 'ready';
} {
  const [state, setState] = useState({ label: '', secLeft: 0, isPast: false, urgency: 'ok' as 'ok' | 'soon' | 'ready' });
  useEffect(() => {
    if (!prepReadyAt) { setState({ label: '', secLeft: 0, isPast: false, urgency: 'ok' }); return; }
    const calc = () => {
      const diff = new Date(prepReadyAt).getTime() - Date.now();
      if (diff <= 0) {
        setState({ label: 'מוכן לאיסוף!', secLeft: 0, isPast: true, urgency: 'ready' });
        return;
      }
      const totalSec = Math.ceil(diff / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      const label = `${m}:${String(s).padStart(2, '0')}`;
      const urgency: 'ok' | 'soon' | 'ready' = m < 2 ? 'soon' : 'ok';
      setState({ label, secLeft: totalSec, isPast: false, urgency });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [prepReadyAt]);
  return state;
}

// ─── PrepCountdownBanner ──────────────────────────────────────────
const PrepCountdownBanner: React.FC<{ prepReadyAt: string | undefined; prepMinutes: number | undefined }> = ({
  prepReadyAt, prepMinutes,
}) => {
  const { label, isPast, urgency } = usePrepCountdown(prepReadyAt);
  if (!prepReadyAt && !prepMinutes) return null;

  const bgMap    = { ok: 'linear-gradient(135deg,#1d4ed8,#2563eb)', soon: 'linear-gradient(135deg,#d97706,#f59e0b)', ready: 'linear-gradient(135deg,#059669,#10b981)' };
  const subLabel = isPast ? 'ההזמנה מוכנה לאיסוף עכשיו!' : urgency === 'soon' ? 'כמעט מוכן — התקרב לאיסוף' : 'ממתין להכנת ההזמנה';

  return (
    <div
      className="rounded-2xl mb-2 overflow-hidden"
      style={{ background: bgMap[urgency], boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}
    >
      <div className="px-4 py-4 flex items-center gap-3">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.18)' }}
        >
          {isPast
            ? <CheckIcon className="w-6 h-6 text-white" />
            : <Timer size={24} style={{ color: '#fff' }} />
          }
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-[11px] font-semibold mb-0.5">{subLabel}</p>
          {!isPast ? (
            <p className="text-white font-black tabular-nums" style={{ fontSize: 38, lineHeight: 1 }}>
              {label}
            </p>
          ) : (
            <p className="text-white font-black text-[22px]">מוכן! 🎉</p>
          )}
          {!isPast && prepMinutes && (
            <p className="text-white/60 text-[10px] mt-0.5">
              זמן הכנה: {prepMinutes} דק׳
            </p>
          )}
        </div>
        {/* Pulsing dot — only when not ready */}
        {!isPast && (
          <div
            className="w-3 h-3 rounded-full animate-pulse flex-shrink-0"
            style={{ background: urgency === 'soon' ? '#fef08a' : 'rgba(255,255,255,0.7)' }}
          />
        )}
      </div>
    </div>
  );
};

// ─── DistanceInfo ────────────────────────────────────────────────
const LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry'];

/** Maps courier vehicle type → travel mode string (safe to call before google API loads) */
type TravelModeStr = 'DRIVING' | 'BICYCLING';
function getVehicleTravelModeStr(vehicle?: string): TravelModeStr {
  if (vehicle === 'bicycle') return 'BICYCLING';
  // car / motorcycle / scooter — all use road routing
  return 'DRIVING';
}
/** Converts mode string → google enum (ONLY call inside useEffect after isLoaded) */
function resolveGoogleTravelMode(modeStr: TravelModeStr): google.maps.TravelMode {
  if (modeStr === 'BICYCLING') return google.maps.TravelMode.BICYCLING;
  return google.maps.TravelMode.DRIVING;
}

const VEHICLE_LABEL: Record<string, string> = {
  car:        'רכב',
  motorcycle: 'אופנוע',
  scooter:    'קטנוע',
  bicycle:    'אופניים',
};

function fmtKm(meters: number): string {
  const km = meters / 1000;
  return km < 1 ? `${Math.round(meters)} מ׳` : `${km.toFixed(1)} ק״מ`;
}
function fmtMins(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} דק׳`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} שע׳ ${rem} דק׳` : `${h} שע׳`;
}

interface SegmentInfo { dist: string; duration: string; }

const DistanceInfo: React.FC<{ pickupAddress: string; dropAddress: string; courierId: string }> = (
  { pickupAddress, dropAddress, courierId }
) => {
  const vehicle        = getCourier(courierId)?.vehicle;
  // ⚠️  Do NOT call google.maps.* here — google global isn't loaded yet.
  //     Use a plain string enum instead; resolve to google enum inside useEffect.
  const travelModeStr  = getVehicleTravelModeStr(vehicle);
  const vehicleLabel   = vehicle ? (VEHICLE_LABEL[vehicle] ?? vehicle) : 'רכב';

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: LIBRARIES,
  });
  const [toPickup,  setToPickup]  = useState<SegmentInfo | null>(null);
  const [toDropOff, setToDropOff] = useState<SegmentInfo | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    // ✅ google global is available here (isLoaded guarantees it)
    const travelMode = resolveGoogleTravelMode(travelModeStr);
    const geocoder   = new google.maps.Geocoder();
    const svc        = new google.maps.DirectionsService();

    // ── Geocode both addresses first (same method as DeliveryMap) ──
    // Using componentRestrictions ensures we get Israeli locations,
    // not an ambiguous match in another country / city.
    const geocodeAddress = (address: string): Promise<google.maps.LatLngLiteral | null> =>
      new Promise((resolve) => {
        geocoder.geocode(
          { address, componentRestrictions: { country: 'il' } },
          (results, status) => {
            if (status === 'OK' && results?.[0]) {
              const loc = results[0].geometry.location;
              resolve({ lat: loc.lat(), lng: loc.lng() });
            } else {
              resolve(null);
            }
          }
        );
      });

    // ── Route: pickup → drop-off (coordinate-based, matches the map) ──
    Promise.all([
      geocodeAddress(pickupAddress),
      geocodeAddress(dropAddress),
    ]).then(([pickupLatLng, dropLatLng]) => {
      if (!pickupLatLng || !dropLatLng) return;
      svc.route(
        { origin: pickupLatLng, destination: dropLatLng, travelMode },
        (result, status) => {
          if (status === 'OK' && result?.routes[0]?.legs[0]) {
            const leg = result.routes[0].legs[0];
            setToDropOff({
              dist:     fmtKm(leg.distance?.value ?? 0),
              duration: fmtMins(leg.duration?.value ?? 0),
            });
          }
        }
      );
    });

    // ── Route: courier GPS → pickup (coordinate-based) ──────────────
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const courierLatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          geocodeAddress(pickupAddress).then((pickupLatLng) => {
            setLoading(false);
            if (!pickupLatLng) return;
            svc.route(
              { origin: courierLatLng, destination: pickupLatLng, travelMode },
              (result, status) => {
                if (status === 'OK' && result?.routes[0]?.legs[0]) {
                  const leg = result.routes[0].legs[0];
                  setToPickup({
                    dist:     fmtKm(leg.distance?.value ?? 0),
                    duration: fmtMins(leg.duration?.value ?? 0),
                  });
                }
              }
            );
          });
        },
        () => { setLoading(false); },
        { timeout: 6000, maximumAge: 30_000 }
      );
    } else {
      setLoading(false);
    }
  }, [isLoaded, pickupAddress, dropAddress, travelModeStr]);

  // Show a subtle shimmer while calculating
  if (loading && !toPickup && !toDropOff) {
    return (
      <div className="rounded-2xl px-4 py-3 mb-2 flex items-center justify-center gap-2"
        style={{ background: '#EEF8FF', border: '1px solid #009DE020' }}>
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#009DE0', borderTopColor: 'transparent' }} />
        <span className="text-[12px]" style={{ color: '#009DE0' }}>מחשב מרחק לפי {vehicleLabel}…</span>
      </div>
    );
  }

  if (!toPickup && !toDropOff) return null;

  return (
    <div
      className="rounded-2xl mb-2 overflow-hidden"
      style={{ background: '#EEF8FF', border: '1px solid #009DE020' }}
    >
      {/* Vehicle badge */}
      <div className="px-4 pt-2.5 pb-1 flex items-center gap-1.5">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: '#009DE015', color: '#009DE0' }}>
          {vehicleLabel}
        </span>
        <span className="text-[10px]" style={{ color: '#8898aa' }}>זמן נסיעה משוער</span>
      </div>

      <div className="flex divide-x divide-x-reverse" style={{ borderTop: '1px solid #009DE015' }}>
        {toPickup && (
          <div className="flex-1 px-4 py-3 text-center" style={{ borderLeft: toDropOff ? '1px solid #009DE015' : 'none' }}>
            <p className="text-[10px] font-semibold mb-1" style={{ color: '#8898aa' }}>ממיקומך לאיסוף</p>
            <p className="text-[18px] font-black leading-none" style={{ color: '#009DE0' }}>{toPickup.dist}</p>
            <p className="text-[12px] font-bold mt-1" style={{ color: '#009DE0AA' }}>{toPickup.duration}</p>
          </div>
        )}
        {!toPickup && toDropOff && null /* only drop-off, skip left col */}
        {toDropOff && (
          <div className="flex-1 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold mb-1" style={{ color: '#8898aa' }}>מאיסוף למסירה</p>
            <p className="text-[18px] font-black leading-none" style={{ color: '#F58F1F' }}>{toDropOff.dist}</p>
            <p className="text-[12px] font-bold mt-1" style={{ color: '#F58F1FAA' }}>{toDropOff.duration}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── DeliveryActionSheet ─────────────────────────────────────────
interface ActionSheetProps {
  delivery: StoredDelivery | null;
  courierId: string;
  updating: string | null;
  onClose: () => void;
  onStatusUpdate: (d: StoredDelivery, s: 'picked_up' | 'delivered') => void;
  onOpenChat: (d: StoredDelivery) => void;
  onCancel: (d: StoredDelivery) => void;
}

const STEPS = [
  { key: 'accepted',  label: 'קיבלת את המשלוח', Icon: TruckIcon      },
  { key: 'picked_up', label: 'אספת את החבילה',  Icon: ArchiveBoxIcon },
  { key: 'delivered', label: 'נמסר ללקוח',       Icon: CheckIcon      },
] as const;

function fmtTime(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}
function fmtDateTime(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const STATUS_ORDER: StoredDelivery['status'][] = ['accepted', 'picked_up', 'delivered'];

function stepDone(deliveryStatus: StoredDelivery['status'], stepKey: string): boolean {
  const di = STATUS_ORDER.indexOf(deliveryStatus as typeof STATUS_ORDER[number]);
  const si = STATUS_ORDER.indexOf(stepKey as typeof STATUS_ORDER[number]);
  return si !== -1 && di >= si;
}

function isCurrent(deliveryStatus: StoredDelivery['status'], stepKey: string): boolean {
  return deliveryStatus === stepKey;
}

const DeliveryActionSheet: React.FC<ActionSheetProps> = ({
  delivery,
  courierId,
  updating,
  onClose,
  onStatusUpdate,
  onOpenChat,
  onCancel,
}) => {
  const [mapFullscreen, setMapFullscreen] = useState(false);

  if (!delivery) return null;

  const d = delivery;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        dir="rtl"
        className="fixed bottom-0 right-0 left-0 z-50 rounded-t-3xl overflow-y-auto"
        style={{
          background: '#FFFFFF',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.18)',
          animation: 'slideUp 0.28s ease',
          maxHeight: '92vh',
        }}
      >
        {/* Handle + close */}
        <div className="sticky top-0 bg-white pt-4 px-5 pb-2 z-10">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full" style={{ background: '#E8E8E8' }} />
          </div>
          <div className="flex items-start justify-between">
            {/* Header: business name + price + badge */}
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-black truncate" style={{ color: TEXT }}>{d.businessName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: statusColor[d.status] + '18', color: statusColor[d.status] }}
                >
                  {statusLabel[d.status]}
                </span>
                <span className="flex items-center gap-1 text-[14px] font-black" style={{ color: BLUE }}>
                  <BanknotesIcon className="w-4 h-4" />
                  ₪{d.price}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
              style={{ background: '#F4F4F4' }}
            >
              <XMarkIcon className="w-5 h-5" style={{ color: TEXT2 }} />
            </button>
          </div>
        </div>

        {/* ── Prep countdown banner — shown when status=accepted ── */}
        {d.status === 'accepted' && d.prepReadyAt && (
          <div className="mx-5 mb-1">
            <PrepCountdownBanner prepReadyAt={d.prepReadyAt} prepMinutes={d.prepMinutes} />
          </div>
        )}

        {/* Earnings banner */}
        <div className="mx-5 mb-1 rounded-2xl py-3 text-center" style={{ background: 'linear-gradient(135deg, #047857, #059669)' }}>
          <p className="text-white font-black text-[15px]">
            במשלוח זה תרוויח ₪{d.price}
            <span className="text-white/80 font-semibold text-[13px]"> — {d.paymentMethod === 'bit' ? 'ביט' : 'מזומן'}</span>
          </p>
        </div>

        <div className="px-5 pb-8 space-y-3">
          {/* ── Timeline ── */}
          <div
            className="rounded-2xl p-3"
            style={{ background: '#F8F8F8', border: '1px solid #E8E8E8' }}
          >
            {/* Created row */}
            <div className="flex items-start gap-3 mb-0.5">
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: '#ECFDF5' }}>
                  <BellIcon className="w-4 h-4" style={{ color: '#059669' }} />
                </div>
                <div className="w-px mt-1" style={{ height: 14, background: '#D1D5DB' }} />
              </div>
              <div className="flex-1 flex items-center justify-between pt-1.5">
                <p className="text-[12px] font-semibold" style={{ color: TEXT }}>הזמנה התקבלה</p>
                <p className="text-[11px] font-semibold tabular-nums" style={{ color: TEXT2 }}>
                  {fmtDateTime(d.createdAt)}
                </p>
              </div>
            </div>

            {STEPS.map((step, idx) => {
              const done    = stepDone(d.status, step.key);
              const current = isCurrent(d.status, step.key);
              const { Icon, label } = step;
              const ts = step.key === 'accepted' ? fmtTime(d.acceptedAt)
                       : step.key === 'picked_up' ? fmtTime(d.pickedUpAt)
                       : fmtTime(d.deliveredAt);
              const circleColor = current ? BLUE : done ? DONE : '#D1D5DB';
              const lineColor   = done && !current ? DONE : '#D1D5DB';
              return (
                <div key={step.key} className="flex items-start gap-3">
                  {/* Icon column — fixed width keeps vertical line aligned */}
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: circleColor,
                        boxShadow: current ? `0 0 0 4px ${BLUE}25` : undefined,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: done || current ? '#fff' : '#9CA3AF' }} />
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="w-px mt-1" style={{ height: 14, background: lineColor }} />
                    )}
                  </div>
                  {/* Label + timestamp — pt aligns text center with icon circle */}
                  <div className="flex-1 flex items-center justify-between pt-1.5">
                    <p className="text-[12px] font-semibold" style={{ color: done || current ? TEXT : TEXT2 }}>
                      {label}
                    </p>
                    {(done || current) && ts ? (
                      <p className="text-[11px] font-semibold tabular-nums" style={{ color: current ? BLUE : TEXT2 }}>
                        {ts}
                      </p>
                    ) : current && !ts ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse"
                        style={{ background: `${BLUE}18`, color: BLUE }}>
                        עכשיו
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Delivery info card ── */}
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: '#F8F8F8', border: '1px solid #E8E8E8' }}
          >
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <MapPinIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
              <div>
                <p className="text-[11px] font-semibold" style={{ color: TEXT2 }}>איסוף</p>
                <p className="text-[13px] font-medium" style={{ color: TEXT }}>{d.pickupAddress}</p>
              </div>
            </div>

            {/* Drop */}
            <div className="flex items-start gap-3">
              <MapPinIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: RED }} />
              <div>
                <p className="text-[11px] font-semibold" style={{ color: TEXT2 }}>מסירה</p>
                <p className="text-[13px] font-medium" style={{ color: TEXT }}>{d.dropAddress}</p>
              </div>
            </div>

            {/* Customer name */}
            {d.customerName && (
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 flex-shrink-0" style={{ color: TEXT2 }} />
                <p className="text-[13px] font-medium" style={{ color: TEXT }}>{d.customerName}</p>
              </div>
            )}

            {/* Customer phone */}
            {d.customerPhone && (
              <div className="flex items-center gap-3">
                <PhoneIcon className="w-5 h-5 flex-shrink-0" style={{ color: TEXT2 }} />
                <a
                  href={`tel:${d.customerPhone}`}
                  className="text-[13px] font-medium underline"
                  style={{ color: BLUE }}
                >
                  {d.customerPhone}
                </a>
              </div>
            )}

            {/* Description */}
            {d.description && (
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: TEXT2 }} />
                <p className="text-[13px]" style={{ color: TEXT }}>{d.description}</p>
              </div>
            )}

            {/* Payment */}
            <div className="flex items-center gap-3">
              <CreditCardIcon className="w-5 h-5 flex-shrink-0" style={{ color: TEXT2 }} />
              <p className="text-[13px] font-medium" style={{ color: TEXT }}>
                {d.paymentMethod === 'bit' ? 'ביט' : 'מזומן'}
                {' · '}
                <span style={{ color: d.customerPaid ? GREEN : RED }}>
                  {d.customerPaid ? 'שולם' : 'לא שולם'}
                </span>
              </p>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3">
              <ClockIcon className="w-5 h-5 flex-shrink-0" style={{ color: TEXT2 }} />
              <p className="text-[12px]" style={{ color: TEXT2 }}>{formatDate(d.createdAt)}</p>
            </div>
          </div>

          {/* ── Map — shown for active deliveries ── */}
          {(d.status === 'accepted' || d.status === 'picked_up') && (
            <div>
              {/* Smart distance panel */}
              <DistanceInfo
                pickupAddress={d.pickupAddress}
                dropAddress={d.dropAddress}
                courierId={courierId}
              />

              {/* Map with fullscreen button */}
              <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E8E8' }}>
                <DeliveryMap
                  pickupAddress={d.pickupAddress}
                  dropAddress={d.dropAddress}
                  height={280}
                />
                {/* Fullscreen button overlay */}
                <button
                  onClick={() => setMapFullscreen(true)}
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-[12px] transition-all active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                    color: '#009DE0',
                    border: '1px solid rgba(0,157,224,0.2)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                  מסך מלא
                </button>
              </div>
            </div>
          )}

          {/* ── Fullscreen map overlay ── */}
          {mapFullscreen && (d.status === 'accepted' || d.status === 'picked_up') && (
            <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: '#000' }}>
              {/* Header bar */}
              <div
                className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
              >
                <div dir="rtl">
                  <p className="text-white font-black text-[14px]">
                    {d.status === 'accepted' ? '🚚 נווט לאיסוף' : '📦 נווט למסירה'}
                  </p>
                  <p className="text-white/60 text-[11px] truncate max-w-[220px]">
                    {d.status === 'accepted' ? d.pickupAddress : d.dropAddress}
                  </p>
                </div>
                <button
                  onClick={() => setMapFullscreen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Full-height map */}
              <div className="flex-1">
                <DeliveryMap
                  pickupAddress={d.pickupAddress}
                  dropAddress={d.dropAddress}
                  height={window.innerHeight - 60}
                />
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="space-y-3">
            {d.status === 'accepted' && (
              <button
                onClick={() => onStatusUpdate(d, 'picked_up')}
                disabled={updating === d.id}
                className="w-full py-3.5 rounded-2xl font-bold text-[14px] text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                style={{ background: ORANGE, boxShadow: `0 4px 14px ${ORANGE}40` }}
              >
                <TruckIcon className="w-5 h-5" />
                {updating === d.id ? '...' : 'אספתי את החבילה'}
              </button>
            )}

            {d.status === 'picked_up' && (
              <button
                onClick={() => onStatusUpdate(d, 'delivered')}
                disabled={updating === d.id}
                className="w-full py-3.5 rounded-2xl font-bold text-[14px] text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                style={{ background: GREEN, boxShadow: `0 4px 14px ${GREEN}40` }}
              >
                <CheckIcon className="w-5 h-5" />
                {updating === d.id ? '...' : 'מסרתי ללקוח'}
              </button>
            )}

            {/* Chat button — always visible */}
            <button
              onClick={() => onOpenChat(d)}
              className="w-full py-3.5 rounded-2xl font-bold text-[14px] text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: BLUE, boxShadow: `0 4px 14px ${BLUE}40` }}
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              צ׳אט עם העסק
            </button>

            {/* Cancel — only for active (not yet picked up) deliveries */}
            {d.status === 'accepted' && (
              <button
                onClick={() => onCancel(d)}
                className="w-full py-3 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: '#FFF0F0', color: RED, border: `1px solid ${RED}30` }}
              >
                <XMarkIcon className="w-4 h-4" />
                לא יכול לבצע — בטל
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

// ─── Swipeable archive card ────────────────────────────────────
const SwipeToArchive: React.FC<{
  onArchive: () => void;
  children: React.ReactNode;
}> = ({ onArchive, children }) => {
  const startX = useRef(0);
  const [swipeX, setSwipeX] = useState(0);
  const THRESHOLD = 70;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    if (dx > 0) setSwipeX(Math.min(dx, THRESHOLD + 30));
  };

  const handleTouchEnd = () => {
    if (swipeX >= THRESHOLD) {
      onArchive();
    }
    setSwipeX(0);
  };

  const progress = Math.min(swipeX / THRESHOLD, 1);

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {swipeX > 8 && (
        <div
          className="absolute inset-0 flex items-center px-4 rounded-2xl"
          style={{ background: `rgba(27,166,114,${Math.min(progress, 0.9)})` }}
        >
          <div className="flex items-center gap-2">
            <ArchiveBoxIcon className="w-5 h-5 text-white" />
            <span className="text-white text-[13px] font-black">ארכיון</span>
          </div>
        </div>
      )}
      <div
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? 'transform 0.2s ease' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ─── CourierDeliveries ────────────────────────────────────────
const CourierDeliveries: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [deliveries, setDeliveries] = useState<StoredDelivery[]>([]);
  const [tab,        setTab]        = useState<Tab>('active');
  const [updating,   setUpdating]   = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<StoredDelivery | null>(null);

  const mountedRef = useRef(false);
  const prevStatusMapRef = useRef<Map<string, string>>(new Map());
  const prevPrepReadyAtRef = useRef<Map<string, string | undefined>>(new Map());

  /**
   * Full load: sync both the global deliveries AND courier-specific deliveries
   * from Supabase into localStorage, then read back from localStorage.
   */
  const load = async (silent = false) => {
    if (!courierId) return;
    // Always sync courier-specific deliveries so newly-accepted ones appear
    if (!silent) {
      await Promise.all([
        syncDeliveriesDown().catch(() => {}),
        syncCourierDeliveriesDown(courierId).catch(() => {}),
      ]);
    } else {
      // Fire both in background without awaiting
      syncDeliveriesDown().catch(() => {});
      syncCourierDeliveriesDown(courierId).catch(() => {});
    }
    const d = getDeliveriesByCourier(courierId);
    setDeliveries(d.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    // Auto-open action sheet when a delivery first becomes accepted
    // Also detect prep time changes and show notification banner
    d.forEach(del => {
      const prevStatus   = prevStatusMapRef.current.get(del.id);
      const prevPrepAt   = prevPrepReadyAtRef.current.get(del.id);

      if (mountedRef.current && del.status === 'accepted' && prevStatus && prevStatus !== 'accepted') {
        setTab('active');
        setActiveSheet(del);
      }
      // Notify courier when business updates prep time on an active delivery
      if (mountedRef.current && del.prepReadyAt && del.prepReadyAt !== prevPrepAt && prevPrepAt !== undefined) {
        const readyTime = new Date(del.prepReadyAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        toast(
          `⏱ העסק עדכן זמן הכנה — מוכן בשעה ${readyTime}`,
          {
            duration: 8000,
            style: {
              background: '#1d4ed8',
              color: '#fff',
              fontWeight: 700,
              borderRadius: 14,
              direction: 'rtl',
              fontSize: 14,
            },
          }
        );
      }

      prevStatusMapRef.current.set(del.id, del.status);
      prevPrepReadyAtRef.current.set(del.id, del.prepReadyAt);
    });
    mountedRef.current = true;
    // Keep activeSheet in sync if it's open
    setActiveSheet(prev => {
      if (!prev) return null;
      const fresh = d.find(x => x.id === prev.id);
      return fresh ?? prev;
    });
  };

  // Initial load + poll every 5 seconds
  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 5000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierId]);

  // Supabase realtime — fires instantly when courier_id is set on a delivery
  // (covers both UPDATE of existing row AND cases where courier_id changes)
  useEffect(() => {
    if (!courierId) return;
    const channel = supabase
      .channel(`courier_deliveries_rt_${courierId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deliveries', filter: `courier_id=eq.${courierId}` },
        async (payload) => {
          // Pull the specific delivery immediately so we don't wait for the next poll cycle
          await syncCourierDeliveriesDown(courierId).catch(() => {});
          const newRow = payload.new as Record<string, unknown>;
          // If just became accepted, clear pending_candidacy and switch to active tab
          if (newRow.status === 'accepted') {
            const rawCand = localStorage.getItem('pending_candidacy');
            if (rawCand) {
              try {
                const p = JSON.parse(rawCand) as { deliveryId?: string };
                if (p.deliveryId === (newRow.id as string)) {
                  localStorage.removeItem('pending_candidacy');
                }
              } catch { /* ignore */ }
            }
            setTab('active');
            toast.success('אושרת למשלוח! פרטים בכרטיסייה "פעילים"', {
              duration: 6000,
              style: { background: '#1BA672', color: '#fff', fontWeight: 700, borderRadius: 14, direction: 'rtl' },
            });
          }
          load(true);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierId]);

  interface CandidacyInfo {
    deliveryId: string;
    notifId: string;
    joinedAt: string;
    delivery: StoredDelivery | null;
  }
  const [candidacyInfo, setCandidacyInfo] = useState<CandidacyInfo | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  /**
   * Poll pending_candidacy every 3 s:
   * - Update UI state
   * - If the delivery's status changed to 'accepted' (business approved this courier),
   *   clear the candidacy key, switch to "active" tab, and open the action sheet.
   * - Also poll Supabase candidacy status directly for instant detection.
   */
  useEffect(() => {
    const check = async () => {
      const raw = localStorage.getItem('pending_candidacy');
      if (!raw) { setCandidacyInfo(null); return; }
      try {
        const p: { deliveryId: string; notifId: string; joinedAt?: string } = JSON.parse(raw);

        // Re-fetch from Supabase so localStorage is always current
        await syncCourierDeliveriesDown(courierId).catch(() => {});
        const allDel = getDeliveries();
        const delivery = allDel.find(d => d.id === p.deliveryId) ?? null;

        // ── APPROVAL DETECTED: delivery now has this courier as its courier ──
        if (delivery && delivery.courierId === courierId && delivery.status === 'accepted') {
          localStorage.removeItem('pending_candidacy');
          setCandidacyInfo(null);
          setTab('active');
          setActiveSheet(delivery);
          toast.success('אושרת למשלוח!', {
            duration: 6000,
            style: { background: '#1BA672', color: '#fff', fontWeight: 700, borderRadius: 14, direction: 'rtl' },
          });
          load(true);
          return;
        }

        // ── ALSO CHECK: candidacy row in Supabase was accepted ──
        if (courierId) {
          const status = await getCandidacyStatus(p.deliveryId, courierId).catch(() => null);
          if (status === 'accepted' && delivery) {
            localStorage.removeItem('pending_candidacy');
            setCandidacyInfo(null);
            // Force re-sync to get the updated courier_id on the delivery
            await syncCourierDeliveriesDown(courierId).catch(() => {});
            const refreshed = getDeliveries().find(d => d.id === p.deliveryId) ?? delivery;
            if (refreshed.courierId === courierId) {
              setTab('active');
              setActiveSheet(refreshed);
            } else {
              setTab('active');
            }
            toast.success('אושרת למשלוח!', {
              duration: 6000,
              style: { background: '#1BA672', color: '#fff', fontWeight: 700, borderRadius: 14, direction: 'rtl' },
            });
            load(true);
            return;
          }
          // If candidacy was rejected, clean up silently
          if (status === 'rejected') {
            localStorage.removeItem('pending_candidacy');
            setCandidacyInfo(null);
            toast('הבקשה שלך לא אושרה', {
              style: { background: '#202125', color: '#fff', fontWeight: 600, borderRadius: 14, direction: 'rtl' },
            });
            return;
          }
        }

        setCandidacyInfo({
          deliveryId: p.deliveryId,
          notifId: p.notifId,
          joinedAt: p.joinedAt ?? new Date().toISOString(),
          delivery,
        });
      } catch { setCandidacyInfo(null); }
    };
    check();
    const id = setInterval(check, 3_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierId]);

  const handleWithdraw = async () => {
    if (!candidacyInfo || !courierId) return;
    setWithdrawing(true);
    await withdrawFromQueue(candidacyInfo.deliveryId, courierId);
    localStorage.removeItem('pending_candidacy');
    setCandidacyInfo(null);
    setWithdrawing(false);
    toast.success('יצאת מהתור');
  };

  const filtered = deliveries.filter((d) => {
    if (tab === 'pending_approval') return false; // handled separately
    if (tab === 'active')    return ['accepted', 'picked_up'].includes(d.status) && !d.archived;
    if (tab === 'completed') return ['delivered', 'cancelled'].includes(d.status) && !d.archived;
    if (tab === 'archived')  return d.archived === true;
    return false;
  });

  const handleStatusUpdate = async (d: StoredDelivery, newStatus: 'picked_up' | 'delivered') => {
    setUpdating(d.id);
    try {
      const update: Partial<StoredDelivery> = { status: newStatus };
      if (newStatus === 'picked_up') update.pickedUpAt  = new Date().toISOString();
      if (newStatus === 'delivered') update.deliveredAt = new Date().toISOString();
      updateDelivery(d.id, update);
      toast.success(newStatus === 'picked_up' ? 'אספת את החבילה!' : 'מסרת בהצלחה!');
      setActiveSheet(null);
      load();
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בעדכון הסטטוס');
    } finally {
      setUpdating(null);
    }
  };

  const handleOpenChat = (d: StoredDelivery) => {
    const conv = getOrCreateConversation(d.businessId, courierId);
    setActiveSheet(null);
    navigate(`/courier/chat?convId=${conv.id}&deliveryId=${d.id}`);
  };

  const handleCourierCancel = (d: StoredDelivery) => {
    const ok = window.confirm('לבטל את המשלוח? הוא יחזור לרשימת הפנויים לשליחים אחרים.');
    if (!ok) return;

    const courierData = getCourier(courierId);
    const courierDisplayName = courierData?.name ?? 'שליח';

    // 1. Reset delivery to PENDING — NOT cancelled! clears courier assignment
    updateDelivery(d.id, {
      status: 'pending',
      courierId: undefined,
      courierName: undefined,
      cancelledBy: courierId,
      cancelAction: 'find_new',
      cancelledAt: new Date().toISOString(),
    });

    // 2. Send notification to business chat: "courier cancelled, re-published"
    const conv = getOrCreateConversation(d.businessId, courierId);
    addMessage(conv.id, {
      senderId: 'system',
      senderName: 'מערכת',
      senderType: 'courier' as const,
      content: `${courierDisplayName} ביטל את המשלוח.\nהמשלוח חזר לרשימת הפנויים — שליחים אחרים יוכלו לקחת אותו.`,
      messageType: 'text' as const,
    });

    // 3. Re-publish to all relevant couriers (triggers sound + badge)
    const business = getBusiness(d.businessId);
    addDeliveryNotification({
      deliveryId: d.id,
      businessId: d.businessId,
      businessName: business?.businessName ?? d.businessId,
      pickupAddress: d.pickupAddress,
      dropAddress: d.dropAddress,
      price: d.price,
      paymentMethod: d.paymentMethod,
      customerPaid: d.customerPaid,
      requiredVehicle: d.requiredVehicle,
      description: d.description,
    });

    setActiveSheet(null);
    toast('ביטלת את המשלוח — הוא נשלח שוב לשליחים אחרים', {
      style: { background: '#202125', color: '#fff', fontWeight: 700, borderRadius: 14, direction: 'rtl' },
      duration: 5000,
    });
    load();
  };

  const handleArchive = (id: string) => {
    updateDelivery(id, { archived: true });
    toast.success('הועבר לארכיון');
    load();
  };

  const handleUnarchive = (id: string) => {
    updateDelivery(id, { archived: false });
    toast.success('הוחזר מהארכיון');
    load();
  };

  const archivedCount = deliveries.filter(d => d.archived).length;

  return (
    <div className="max-w-lg mx-auto px-4 py-5" style={{ background: '#F4F4F4', minHeight: '100vh' }}>
      <h1 className="text-[20px] font-black mb-5" style={{ color: TEXT }}>המשלוחים שלי</h1>

      {/* Tabs */}
      <div
        className="flex mb-4 overflow-x-auto scrollbar-none"
        style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E8E8E8', overflow: 'hidden' }}
      >
        {([
          { id: 'pending_approval' as Tab, label: 'לאישורי', badge: candidacyInfo ? 1 : null },
          { id: 'active'    as Tab, label: 'פעילים',  badge: null },
          { id: 'completed' as Tab, label: 'הושלמו',  badge: null },
          { id: 'archived'  as Tab, label: 'ארכיון',  badge: archivedCount > 0 ? archivedCount : null },
        ]).map((t, i, arr) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 text-[12px] sm:text-[13px] font-bold transition-all flex items-center justify-center gap-1 min-h-[44px]"
            style={{
              background: tab === t.id ? BLUE : '#FFFFFF',
              color: tab === t.id ? '#FFFFFF' : TEXT2,
              borderRight: i < arr.length - 1 ? '1px solid #E8E8E8' : 'none',
            }}
          >
            {t.label}
            {t.badge !== null && (
              <span
                className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={{
                  background: tab === t.id ? 'rgba(255,255,255,0.3)' : RED,
                  color: '#FFFFFF',
                  minWidth: '18px',
                  textAlign: 'center',
                }}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'completed' && (
        <p className="text-[11px] mb-3 text-center" style={{ color: TEXT2 }}>
          החלק ימינה כדי להעביר לארכיון
        </p>
      )}

      {tab === 'pending_approval' ? (
        candidacyInfo === null ? (
          <div className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center" style={{ background: '#FFFFFF', border: '1px solid #E8E8E8' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#E6F6FC' }}>
              <ClockIcon className="w-7 h-7" style={{ color: BLUE }} />
            </div>
            <p className="text-[14px] font-bold" style={{ color: TEXT }}>אין משלוחים ממתינים לאישורך</p>
            <p className="text-[12px]" style={{ color: TEXT2 }}>כשתצטרף לתור של משלוח, הוא יופיע כאן</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '2px solid #F58F1F25', boxShadow: '0 4px 16px rgba(245,143,31,0.10)' }}>
            {/* Amber header */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'linear-gradient(90deg,#FFF8E6,#FFFCF0)', borderBottom: '1px solid #F58F1F20' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ORANGE }}>
                <ClockIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-black" style={{ color: TEXT }}>ממתין לאישור העסק</p>
                <p className="text-[11px] font-semibold" style={{ color: ORANGE }}>
                  {Math.round((Date.now() - new Date(candidacyInfo.joinedAt).getTime()) / 60000)} דקות בתור
                </p>
              </div>
              {/* Pulsing indicator */}
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: ORANGE }} />
            </div>

            {/* Delivery info */}
            {candidacyInfo.delivery && (
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
                  <div>
                    <p className="text-[10px]" style={{ color: '#AAAAAA' }}>איסוף</p>
                    <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{candidacyInfo.delivery.pickupAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: RED }} />
                  <div>
                    <p className="text-[10px]" style={{ color: '#AAAAAA' }}>מסירה</p>
                    <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{candidacyInfo.delivery.dropAddress}</p>
                  </div>
                </div>
                {candidacyInfo.delivery.description && (
                  <p className="text-[11px] pr-6" style={{ color: TEXT2 }}>{candidacyInfo.delivery.description}</p>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <BanknotesIcon className="w-4 h-4" style={{ color: BLUE }} />
                  <span className="text-[15px] font-black" style={{ color: BLUE }}>₪{candidacyInfo.delivery.price}</span>
                  {candidacyInfo.delivery.businessName && (
                    <span className="text-[11px] mr-1" style={{ color: TEXT2 }}>· {candidacyInfo.delivery.businessName}</span>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-4 pb-4">
              <p className="text-[11px] text-center mb-3" style={{ color: '#AAAAAA' }}>אל תסגור את האפליקציה — תקבל התראה כשתאושר</p>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="w-full py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#FFF0F0', color: RED, border: `1.5px solid ${RED}30` }}
              >
                <XMarkIcon className="w-4 h-4" />
                {withdrawing ? '...' : 'יציאה מהתור'}
              </button>
            </div>
          </div>
        )
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
          style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: '#E6F6FC' }}
          >
            {tab === 'archived'
              ? <ArchiveBoxIcon className="w-7 h-7" style={{ color: BLUE }} />
              : <TruckIcon      className="w-7 h-7" style={{ color: BLUE }} />
            }
          </div>
          <p className="text-[14px] font-bold" style={{ color: TEXT }}>
            {tab === 'active' ? 'אין משלוחים פעילים' : tab === 'completed' ? 'אין היסטוריה עדיין' : 'הארכיון ריק'}
          </p>
          <p className="text-[12px]" style={{ color: TEXT2 }}>
            {tab === 'active'
              ? 'משלוחים שקיבלת יופיעו כאן'
              : tab === 'completed'
              ? 'משלוחים שהושלמו יופיעו כאן'
              : 'משלוחים שהועברו לארכיון יופיעו כאן'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const cardContent = (
              <div
                className="rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98]"
                style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
                onClick={() => tab !== 'archived' ? setActiveSheet(d) : undefined}
              >
                {/* Order number + Status + price */}
                <div className="flex items-center justify-between mb-1">
                  {d.orderNumber ? (
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#061b31', letterSpacing: '-0.5px' }}>
                      {formatOrderNumber(d.orderNumber)}
                    </span>
                  ) : <div />}
                  <span className="text-[14px] font-black" style={{ color: BLUE }}>₪{d.price}</span>
                </div>
                <div className="mb-3">
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: statusColor[d.status] + '18', color: statusColor[d.status] }}
                  >
                    {statusLabel[d.status]}
                  </span>
                </div>

                {/* Business name */}
                <p className="text-[12px] font-semibold mb-2" style={{ color: TEXT2 }}>
                  {d.businessName}
                </p>

                {/* Addresses */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex gap-2 items-start">
                    <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
                    <p className="text-[13px]" style={{ color: TEXT }}>{d.pickupAddress}</p>
                  </div>
                  <div className="w-px h-3 mr-2" style={{ background: '#E8E8E8' }} />
                  <div className="flex gap-2 items-start">
                    <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: RED }} />
                    <p className="text-[13px]" style={{ color: TEXT }}>{d.dropAddress}</p>
                  </div>
                </div>

                {/* Time */}
                <p className="text-[11px] mb-2" style={{ color: TEXT2 }}>{formatDate(d.createdAt)}</p>

                {/* Tap hint for active */}
                {tab === 'active' && (
                  <p className="text-[11px] font-semibold" style={{ color: BLUE }}>
                    לחץ לפרטים ופעולות
                  </p>
                )}

                {/* Unarchive button */}
                {tab === 'archived' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUnarchive(d.id); }}
                    className="w-full mt-2 py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-95"
                    style={{
                      background: 'transparent',
                      color: BLUE,
                      border: `1.5px solid ${BLUE}`,
                    }}
                  >
                    הוצא מהארכיון
                  </button>
                )}
              </div>
            );

            return tab === 'completed' ? (
              <SwipeToArchive key={d.id} onArchive={() => handleArchive(d.id)}>
                {cardContent}
              </SwipeToArchive>
            ) : (
              <div key={d.id}>{cardContent}</div>
            );
          })}
        </div>
      )}

      {/* ── Delivery action sheet ── */}
      <DeliveryActionSheet
        delivery={activeSheet}
        courierId={courierId}
        updating={updating}
        onClose={() => setActiveSheet(null)}
        onStatusUpdate={handleStatusUpdate}
        onOpenChat={handleOpenChat}
        onCancel={handleCourierCancel}
      />
    </div>
  );
};

export default CourierDeliveries;
