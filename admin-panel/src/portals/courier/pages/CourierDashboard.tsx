import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import {
  getCourier,
  getDeliveriesByCourier,
  getPendingNotifications,
  getDeliveries,
  getActiveDeliveryForCourier,
  getOrCreateConversation,
  type StoredDelivery,
} from '../../../services/storage.service';
import {
  getCandidacyStatus,
  withdrawFromQueue,
  syncDeliveriesDown,
} from '../../../services/sync.service';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { TruckIcon, BellIcon, ChevronLeftIcon, StarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const CANDIDACY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const BLUE   = '#009DE0';
const ORANGE = '#F58F1F';

const STATUS_LABEL: Record<StoredDelivery['status'], string> = {
  scheduled: '📅 מתוזמן',
  pending:   'ממתין לאיסוף',
  accepted:  'בדרך לאיסוף',
  picked_up: 'בדרך ללקוח',
  delivered: 'נמסר ✓',
  cancelled: 'בוטל',
};

const STATUS_COLOR: Record<StoredDelivery['status'], { bg: string; text: string }> = {
  scheduled: { bg: '#EEF2FF', text: '#6366F1' },
  pending:   { bg: '#F4F4F4', text: '#757575' },
  accepted:  { bg: '#EAF7FD', text: BLUE },
  picked_up: { bg: '#FFF8E6', text: '#F58F1F' },
  delivered: { bg: '#E8F8F0', text: '#1BA672' },
  cancelled: { bg: '#FFF0F0', text: '#E23437' },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        i <= Math.round(rating)
          ? <StarSolid  key={i} className="w-4 h-4" style={{ color: '#F58F1F' }} />
          : <StarIcon   key={i} className="w-4 h-4" style={{ color: '#E8E8E8' }} />
      ))}
    </div>
  );
}

interface PendingCandidacy {
  deliveryId: string;
  notifId:    string;
  joinedAt?:  string;  // written when joining so we can compute wait time
}

const CourierDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user     = useSelector((s: RootState) => s.auth.user);

  const token     = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [deliveries,    setDeliveries]    = useState<StoredDelivery[]>([]);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [earnings,      setEarnings]      = useState({ today: 0, thisWeek: 0, thisMonth: 0 });
  const [rating,        setRating]        = useState(5);
  const [totalDone,     setTotalDone]     = useState(0);
  const [courierName,   setCourierName]   = useState('');

  // "Waiting in queue" card state
  const [candidacy,     setCandidacy]     = useState<PendingCandidacy | null>(null);
  const [waitSeconds,   setWaitSeconds]   = useState(0);
  const [queueDelivery, setQueueDelivery] = useState<StoredDelivery | null>(null);

  useEffect(() => {
    if (!courierId) return;
    const d       = getDeliveriesByCourier(courierId);
    const pending = getPendingNotifications(courierId);
    const courier = getCourier(courierId);
    setDeliveries(d);
    setPendingCount(pending.length);
    if (courier) {
      setEarnings(courier.earnings);
      setRating(courier.rating);
      setTotalDone(courier.totalDeliveries);
      setCourierName(courier.name);
    }
  }, [courierId]);

  // Poll pending_candidacy every 3s — also checks acceptance / rejection / timeout
  useEffect(() => {
    if (!courierId) return;

    const check = async () => {
      const raw = localStorage.getItem('pending_candidacy');
      if (!raw) { setCandidacy(null); setQueueDelivery(null); return; }
      try {
        const parsed: PendingCandidacy = JSON.parse(raw);

        // Fix 3 — Timeout: auto-withdraw after 10 minutes of no response
        if (parsed.joinedAt) {
          const age = Date.now() - new Date(parsed.joinedAt).getTime();
          if (age > CANDIDACY_TIMEOUT_MS) {
            await withdrawFromQueue(parsed.deliveryId, courierId).catch(() => {});
            localStorage.removeItem('pending_candidacy');
            setCandidacy(null); setQueueDelivery(null);
            toast('⏰ פג תוקף — לא קיבלת אישור תוך 10 דקות', {
              style: { background: '#202125', color: '#fff', fontWeight: 700, borderRadius: 14, direction: 'rtl' },
              duration: 5000,
            });
            return;
          }
        }

        // Fix 1+2 — Check real status from Supabase
        const status = await getCandidacyStatus(parsed.deliveryId, courierId).catch(() => null);
        if (status === 'accepted') {
          const deliveryId = parsed.deliveryId; // save before removing
          localStorage.removeItem('pending_candidacy');
          setCandidacy(null); setQueueDelivery(null);
          await syncDeliveriesDown().catch(() => {});
          setDeliveries(getDeliveriesByCourier(courierId));
          // Navigate to chat automatically
          const delivery = getDeliveries().find(d => d.id === deliveryId);
          if (delivery?.businessId) {
            const conv = getOrCreateConversation(delivery.businessId, courierId);
            toast.success('🎉 נבחרת! פותח את הצ׳אט...', { duration: 3000 });
            navigate(`/courier/chat?convId=${conv.id}&deliveryId=${deliveryId}`);
          } else {
            toast.success('🎉 נבחרת! המשלוח שלך', { duration: 8000 });
          }
          return;
        }
        if (status === 'rejected') {
          localStorage.removeItem('pending_candidacy');
          setCandidacy(null); setQueueDelivery(null);
          toast('😔 לא נבחרת הפעם — נסה משלוח אחר', {
            style: { background: '#202125', color: '#fff', fontWeight: 700, borderRadius: 14, direction: 'rtl' },
            duration: 5000,
          });
          return;
        }

        // Still waiting
        setCandidacy(parsed);
        const allDel = getDeliveries();
        setQueueDelivery(allDel.find(x => x.id === parsed.deliveryId) ?? null);
        if (parsed.joinedAt) {
          setWaitSeconds(Math.round((Date.now() - new Date(parsed.joinedAt).getTime()) / 1000));
        }
      } catch { setCandidacy(null); }
    };

    check();
    const id = setInterval(check, 3_000);
    return () => clearInterval(id);
  }, [courierId]);

  // Fix 1 — Supabase realtime for INSTANT notification (no polling delay)
  useEffect(() => {
    if (!courierId) return;
    const channel = supabase
      .channel(`courier_candidacy_${courierId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'delivery_candidates', filter: `courier_id=eq.${courierId}` },
        async (payload) => {
          const newStatus = (payload.new as { status?: string }).status;
          if (newStatus === 'accepted') {
            const raw = localStorage.getItem('pending_candidacy');
            localStorage.removeItem('pending_candidacy');
            setCandidacy(null); setQueueDelivery(null);
            await syncDeliveriesDown().catch(() => {});
            setDeliveries(getDeliveriesByCourier(courierId));
            // Navigate to chat automatically
            if (raw) {
              try {
                const { deliveryId } = JSON.parse(raw) as PendingCandidacy;
                const delivery = getDeliveries().find(d => d.id === deliveryId);
                if (delivery?.businessId) {
                  const conv = getOrCreateConversation(delivery.businessId, courierId);
                  toast.success('🎉 נבחרת! פותח את הצ׳אט...', { duration: 3000 });
                  navigate(`/courier/chat?convId=${conv.id}&deliveryId=${deliveryId}`);
                  return;
                }
              } catch { /* ignore */ }
            }
            toast.success('🎉 נבחרת! המשלוח שלך', { duration: 8000 });
          } else if (newStatus === 'rejected') {
            if (localStorage.getItem('pending_candidacy')) {
              localStorage.removeItem('pending_candidacy');
              setCandidacy(null); setQueueDelivery(null);
              toast('😔 לא נבחרת הפעם — נסה משלוח אחר', {
                style: { background: '#202125', color: '#fff', fontWeight: 700, borderRadius: 14, direction: 'rtl' },
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [courierId]);

  const displayName   = courierName || user?.name || 'שליח';
  const activeDelivery = deliveries.find(d => ['accepted','picked_up'].includes(d.status));
  const activeBanner = getActiveDeliveryForCourier(courierId);

  return (
    <div className="max-w-lg mx-auto" dir="rtl">

      {/* ── Hero greeting ── */}
      <div
        className="px-5 pt-6 pb-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 55%, #009DE0 100%)' }}
      >
        {/* decorative circle */}
        <div className="absolute -left-8 -top-8 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute -left-4 bottom-2 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <p className="text-white/75 text-[13px] font-medium mb-1 relative z-10">שלום,</p>
        <h1 className="text-white text-[24px] font-black mb-2 relative z-10">{displayName} 👋</h1>
        <div className="flex items-center gap-2 relative z-10">
          <StarRating rating={rating} />
          <span className="text-white/80 text-[12px] font-semibold">{rating.toFixed(1)}</span>
          <span className="text-white/50 text-[11px]">·</span>
          <span className="text-white/75 text-[12px]">{totalDone} משלוחים</span>
        </div>
      </div>

      {/* ── Active delivery banner ── */}
      {activeBanner && !candidacy && (
        <div className="px-4 -mt-3">
          <div
            className="w-full rounded-2xl p-4 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #EAF7FD, #F0FBFF)', border: `1.5px solid ${BLUE}30`, boxShadow: `0 4px 16px ${BLUE}15` }}
            onClick={() => {
              if (activeBanner.businessId) {
                const conv = getOrCreateConversation(activeBanner.businessId, courierId);
                navigate(`/courier/chat?convId=${conv.id}&deliveryId=${activeBanner.id}`);
              }
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full animate-pulse flex-shrink-0" style={{ background: activeBanner.status === 'picked_up' ? ORANGE : BLUE }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black" style={{ color: activeBanner.status === 'picked_up' ? ORANGE : BLUE }}>
                  {activeBanner.status === 'accepted' ? '🛵 בדרך לאיסוף' : '📦 בדרך ללקוח'}
                </p>
                <p className="text-[11px] truncate" style={{ color: '#757575' }}>{activeBanner.businessName} · ₪{activeBanner.price}</p>
              </div>
              <span className="text-[11px] font-bold" style={{ color: BLUE }}>נהל ›</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Waiting in queue card ── */}
      {candidacy && (
        <div className="px-4 -mt-3">
          <div
            className="w-full rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, #FFF8E6, #FFFCF0)',
              border: '2px solid #F58F1F40',
              boxShadow: '0 4px 16px rgba(245,143,31,0.12)',
            }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: '#F58F1F20' }}
                >
                  <ClockIcon className="w-5 h-5" style={{ color: '#F58F1F' }} />
                </div>
                <div>
                  <p className="font-black text-[14px]" style={{ color: '#202125' }}>ממתין לאישור העסק</p>
                  {waitSeconds > 0 && (
                    <p className="text-[11px]" style={{ color: '#F58F1F' }}>
                      {waitSeconds < 60
                        ? `${waitSeconds} שניות בתור`
                        : `${Math.floor(waitSeconds / 60)} דקות בתור`}
                    </p>
                  )}
                </div>
              </div>
              {/* Animated dots */}
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: '#F58F1F',
                      opacity: 0.4 + i * 0.3,
                      animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Delivery info */}
            {queueDelivery && (
              <div
                className="rounded-xl px-3 py-2 space-y-1"
                style={{ background: 'rgba(245,143,31,0.07)' }}
              >
                <p className="text-[12px]" style={{ color: '#757575' }}>
                  📍 <span className="font-semibold" style={{ color: '#202125' }}>{queueDelivery.dropAddress}</span>
                </p>
                <p className="text-[12px]" style={{ color: '#757575' }}>
                  💰 <span className="font-bold" style={{ color: '#F58F1F' }}>₪{queueDelivery.price}</span>
                  {queueDelivery.pickupAddress && (
                    <> &nbsp;·&nbsp; 🏠 {queueDelivery.pickupAddress}</>
                  )}
                </p>
              </div>
            )}

            <p className="text-[11px] mt-2 text-center" style={{ color: '#AAAAAA' }}>
              אל תסגור את האפליקציה — תקבל התראה כשתאושר
            </p>
          </div>
        </div>
      )}

      {/* ── Available deliveries banner ── */}
      {pendingCount > 0 && !candidacy && (
        <div className="px-4 -mt-3">
          <button
            onClick={() => navigate('/courier/available')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98]"
            style={{ background: '#FFFFFF', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', border: `1.5px solid ${BLUE}40` }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#EAF7FD' }}
            >
              <BellIcon className="w-5 h-5" style={{ color: BLUE }} />
            </div>
            <div className="flex-1 text-right">
              <p className="font-black text-[15px]" style={{ color: '#202125' }}>
                {pendingCount} {pendingCount === 1 ? 'משלוח פנוי' : 'משלוחים פנויים'}
              </p>
              <p className="text-[12px]" style={{ color: '#757575' }}>לחץ לצפייה וקבלה</p>
            </div>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: BLUE }}
            >
              <ChevronLeftIcon className="w-4 h-4 text-white" />
            </div>
          </button>
        </div>
      )}

      {/* ── Earnings cards (pulled up over hero) ── */}
      <div className="px-4 -mt-5">
        <div
          className="rounded-2xl p-4 mb-3"
          style={{
            background: '#ffffff',
            boxShadow: '0 4px 24px rgba(37,99,235,0.12)',
            border: '1px solid rgba(37,99,235,0.08)',
          }}
        >
          <p className="portal-section-title px-0 mb-3">הכנסות</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'היום',  value: earnings.today,    grad: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', text: '#1E40AF', val: '#2563EB' },
              { label: 'השבוע', value: earnings.thisWeek, grad: 'linear-gradient(135deg,#FFF7ED,#FED7AA)', text: '#92400E', val: '#F97316' },
              { label: 'החודש', value: earnings.thisMonth,grad: 'linear-gradient(135deg,#ECFDF5,#A7F3D0)', text: '#065F46', val: '#059669' },
            ].map(e => (
              <div
                key={e.label}
                className="rounded-xl p-3 text-center"
                style={{ background: e.grad }}
              >
                <p className="text-[20px] font-black leading-tight" style={{ color: e.val }}>₪{e.value}</p>
                <p className="text-[10px] font-semibold mt-0.5" style={{ color: e.text }}>{e.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active delivery ── */}
      {activeDelivery && (
        <div className="px-4 mt-1">
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
              border: '1.5px solid rgba(37,99,235,0.18)',
              boxShadow: '0 4px 16px rgba(37,99,235,0.10)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="status-live" />
                <span
                  className="text-[12px] font-bold px-3 py-1 rounded-full"
                  style={{
                    background: STATUS_COLOR[activeDelivery.status].bg,
                    color:      STATUS_COLOR[activeDelivery.status].text,
                  }}
                >
                  {STATUS_LABEL[activeDelivery.status]}
                </span>
              </div>
              <span className="text-[17px] font-black" style={{ color: '#F97316' }}>₪{activeDelivery.price}</span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-start gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 mt-0.5"
                  style={{ background: '#1BA672' }}
                >א</span>
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: '#6B7280' }}>איסוף</p>
                  <p className="text-[13px] font-semibold" style={{ color: '#1E3A8A' }}>{activeDelivery.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 mt-0.5"
                  style={{ background: '#E23437' }}
                >ב</span>
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: '#6B7280' }}>מסירה</p>
                  <p className="text-[13px] font-semibold" style={{ color: '#1E3A8A' }}>{activeDelivery.dropAddress}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/courier/deliveries')}
              className="btn-cta-blue w-full py-3 rounded-2xl font-bold text-[13px] text-white transition-all active:scale-95"
            >
              נהל משלוח
            </button>
          </div>
        </div>
      )}

      {/* ── CTA ── */}
      {!activeDelivery && (
        <div className="px-4 mt-2 pb-6">
          <button
            onClick={() => navigate('/courier/available')}
            className="btn-cta-orange w-full py-4 rounded-2xl font-black text-[15px] text-white flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <TruckIcon className="w-5 h-5" />
            {pendingCount > 0 ? `ראה ${pendingCount} משלוחים פנויים` : 'חפש משלוחים פנויים'}
          </button>
        </div>
      )}
      {activeDelivery && <div className="pb-6" />}
    </div>
  );
};

export default CourierDashboard;
