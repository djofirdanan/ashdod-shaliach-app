import React, { useEffect, useState } from 'react';
import { Truck, Package, MapPin as PhosphorMapPin, Money, Timer } from '@phosphor-icons/react';
import { usePrepCountdown } from '../../../utils/usePrepCountdown';
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
  getBusinesses,
  getReviewsByTarget,
  type StoredDelivery,
} from '../../../services/storage.service';
import {
  getCandidacyStatus,
  withdrawFromQueue,
  syncDeliveriesDown,
  syncCourierDeliveriesDown,
} from '../../../services/sync.service';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { TruckIcon, BellIcon, ChevronLeftIcon, StarIcon, ClockIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const CANDIDACY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const BLUE   = '#009DE0';
const ORANGE = '#F58F1F';
const GREEN  = '#1BA672';
const TEXT   = '#202125';
const TEXT2  = '#757575';
const BORDER = '#E8E8E8';

const STATUS_LABEL: Record<StoredDelivery['status'], string> = {
  scheduled: 'מתוזמן',
  pending:   'ממתין לאיסוף',
  accepted:  'בדרך לאיסוף',
  picked_up: 'בדרך ללקוח',
  delivered: 'נמסר ✓',
  cancelled: 'בוטל',
};

const STATUS_COLOR: Record<StoredDelivery['status'], { bg: string; text: string; border: string }> = {
  scheduled: { bg: '#EEF2FF', text: '#6366F1', border: '#6366F1' },
  pending:   { bg: '#F4F4F4', text: '#757575', border: '#9CA3AF' },
  accepted:  { bg: '#EAF7FD', text: BLUE,      border: BLUE      },
  picked_up: { bg: '#FFF8E6', text: '#F58F1F', border: '#F58F1F' },
  delivered: { bg: '#E8F8F0', text: '#1BA672', border: '#1BA672' },
  cancelled: { bg: '#FFF0F0', text: '#E23437', border: '#E23437' },
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
  joinedAt?:  string;
}

// ── Prep timer pill ────────────────────────────────────────────
const PrepTimerPill: React.FC<{ prepReadyAt: string | undefined; prepMinutes: number | undefined }> = ({
  prepReadyAt, prepMinutes,
}) => {
  const prep = usePrepCountdown(prepReadyAt);
  if (!prepReadyAt && !prepMinutes) return null;

  const bg     = prep.urgency === 'ready' ? 'rgba(16,185,129,0.25)' : prep.urgency === 'soon' ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.18)';
  const border = prep.urgency === 'ready' ? 'rgba(16,185,129,0.5)' : prep.urgency === 'soon' ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.3)';
  const color  = '#fff';

  return (
    <div
      className="mx-4 mb-2 rounded-xl px-3 py-2 flex items-center justify-between"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div className="flex items-center gap-2">
        <Timer size={14} style={{ color }} />
        <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {prep.isPast ? 'ההזמנה מוכנה לאיסוף!' : 'מוכן לאיסוף בעוד'}
        </span>
      </div>
      {!prep.isPast ? (
        <span className="text-[18px] font-black tabular-nums" style={{ color }}>{prep.label}</span>
      ) : (
        <span className="text-[14px] font-black" style={{ color }}>עכשיו! 🎉</span>
      )}
    </div>
  );
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  return 'ערב טוב';
}

// ── Active delivery status steps ──────────────────────────────
const DELIVERY_STEPS = [
  { key: 'accepted',  label: 'בדרך לאיסוף' },
  { key: 'picked_up', label: 'אסף' },
  { key: 'delivered', label: 'נמסר' },
] as const;

type DeliveryStepKey = typeof DELIVERY_STEPS[number]['key'];

const StatusStepper: React.FC<{ status: StoredDelivery['status'] }> = ({ status }) => {
  const activeIdx = DELIVERY_STEPS.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-0 mx-4 mb-3">
      {DELIVERY_STEPS.map((step, i) => {
        const isDone    = activeIdx > i;
        const isCurrent = activeIdx === i;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-300"
                style={{
                  background: isDone
                    ? 'rgba(255,255,255,0.9)'
                    : isCurrent
                    ? 'rgba(255,255,255,0.95)'
                    : 'rgba(255,255,255,0.2)',
                  color: isDone
                    ? GREEN
                    : isCurrent
                    ? (status === 'accepted' ? BLUE : ORANGE)
                    : 'rgba(255,255,255,0.5)',
                  boxShadow: isCurrent ? '0 0 0 3px rgba(255,255,255,0.3)' : 'none',
                  border: isCurrent ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent',
                }}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                className="text-[10px] font-semibold mt-1 text-center leading-tight"
                style={{
                  color: isCurrent ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)',
                  fontWeight: isCurrent ? 800 : 500,
                }}
              >
                {step.label}
              </span>
            </div>
            {i < DELIVERY_STEPS.length - 1 && (
              <div
                className="h-0.5 flex-1 mb-4 transition-all duration-300"
                style={{
                  background: isDone
                    ? 'rgba(255,255,255,0.7)'
                    : 'rgba(255,255,255,0.2)',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

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
  const [reviews,       setReviews]       = useState<{rating: number; comment?: string}[]>([]);
  const [activeBizCount, setActiveBizCount] = useState(0);
  const [todayCount,    setTodayCount]    = useState(0);
  const [weekCount,     setWeekCount]     = useState(0);
  const [monthCount,    setMonthCount]    = useState(0);
  const [dismissedFromDash, setDismissedFromDash] = useState<Set<string>>(new Set());
  const [activeBannerState, setActiveBannerState] = useState<StoredDelivery | null>(null);

  const [candidacy,     setCandidacy]     = useState<PendingCandidacy | null>(null);
  const [waitSeconds,   setWaitSeconds]   = useState(0);
  const [queueDelivery, setQueueDelivery] = useState<StoredDelivery | null>(null);

  // Poll active delivery with Supabase sync
  useEffect(() => {
    if (!courierId) return;
    const refresh = async () => {
      await syncCourierDeliveriesDown(courierId).catch(() => {});
      setActiveBannerState(getActiveDeliveryForCourier(courierId) ?? null);
      setDeliveries(getDeliveriesByCourier(courierId));
    };
    refresh();
    const id = setInterval(refresh, 5_000);
    return () => clearInterval(id);
  }, [courierId]);

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
    const now = new Date();
    const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekDay     = now.getDay();
    const weekStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekDay).toISOString();
    const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    setTodayCount(d.filter(x => x.status === 'delivered' && (x.deliveredAt ?? x.createdAt) >= todayStart).length);
    setWeekCount(d.filter(x => x.status === 'delivered' && (x.deliveredAt ?? x.createdAt) >= weekStart).length);
    setMonthCount(d.filter(x => x.status === 'delivered' && (x.deliveredAt ?? x.createdAt) >= monthStart).length);
    const revs = getReviewsByTarget(courierId);
    setReviews(revs.map(r => ({ rating: r.rating, comment: r.comment })));
    setActiveBizCount(getBusinesses().filter(b => b.isActive && !b.isBlocked).length);
  }, [courierId]);

  // Poll pending_candidacy every 3s
  useEffect(() => {
    if (!courierId) return;

    const check = async () => {
      const raw = localStorage.getItem('pending_candidacy');
      if (!raw) { setCandidacy(null); setQueueDelivery(null); return; }
      try {
        const parsed: PendingCandidacy = JSON.parse(raw);

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

        const status = await getCandidacyStatus(parsed.deliveryId, courierId).catch(() => null);
        if (status === 'accepted') {
          const deliveryId = parsed.deliveryId;
          localStorage.removeItem('pending_candidacy');
          setCandidacy(null); setQueueDelivery(null);
          await syncDeliveriesDown().catch(() => {});
          setDeliveries(getDeliveriesByCourier(courierId));
          const delivery = getDeliveries().find(d => d.id === deliveryId);
          if (delivery?.businessId) {
            const conv = getOrCreateConversation(delivery.businessId, courierId);
            toast.success('נבחרת! פותח את הצ׳אט...', { duration: 3000 });
            navigate(`/courier/chat?convId=${conv.id}&deliveryId=${deliveryId}`);
          } else {
            toast.success('נבחרת! המשלוח שלך', { duration: 8000 });
          }
          return;
        }
        if (status === 'rejected') {
          localStorage.removeItem('pending_candidacy');
          setCandidacy(null); setQueueDelivery(null);
          toast('לא נבחרת הפעם — נסה משלוח אחר', {
            style: { background: '#202125', color: '#fff', fontWeight: 700, borderRadius: 14, direction: 'rtl' },
            duration: 5000,
          });
          return;
        }

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

  // Supabase realtime for INSTANT notification
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
            if (raw) {
              try {
                const { deliveryId } = JSON.parse(raw) as PendingCandidacy;
                const delivery = getDeliveries().find(d => d.id === deliveryId);
                if (delivery?.businessId) {
                  const conv = getOrCreateConversation(delivery.businessId, courierId);
                  toast.success('נבחרת! פותח את הצ׳אט...', { duration: 3000 });
                  navigate(`/courier/chat?convId=${conv.id}&deliveryId=${deliveryId}`);
                  return;
                }
              } catch { /* ignore */ }
            }
            toast.success('נבחרת! המשלוח שלך', { duration: 8000 });
          } else if (newStatus === 'rejected') {
            if (localStorage.getItem('pending_candidacy')) {
              localStorage.removeItem('pending_candidacy');
              setCandidacy(null); setQueueDelivery(null);
              toast('לא נבחרת הפעם — נסה משלוח אחר', {
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

  const displayName = courierName || user?.name || 'שליח';
  const activeBanner = activeBannerState;
  const greeting    = getGreeting();
  const avgRating   = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : rating;

  return (
    <div className="w-full max-w-lg mx-auto" dir="rtl">

      {/* ── Hero header ── */}
      <div
        className="px-5 pt-5 pb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 55%, #009DE0 100%)' }}
      >
        <div className="absolute -left-6 -top-6 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="absolute left-16 -bottom-8 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />

        {/* Greeting row */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex-1">
            <p className="text-white/70 text-[12px] font-medium">{greeting},</p>
            <h1 className="text-white text-[22px] font-black leading-tight">{displayName}</h1>
          </div>
        </div>

        {/* Rating + stat pills row */}
        <div className="flex items-center flex-wrap gap-2 mt-3 relative z-10">
          <button
            onClick={() => navigate('/courier/profile')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-white/90 text-[11px] font-bold mr-1">{avgRating.toFixed(1)}</span>
          </button>

          {/* Pill badges for delivery counts */}
          <span
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
          >
            היום <strong className="text-white">{todayCount}</strong>
          </span>
          <span
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
          >
            שבוע <strong className="text-white">{weekCount}</strong>
          </span>
          <span
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
          >
            חודש <strong className="text-white">{monthCount}</strong>
          </span>
        </div>

        {/* Support chat button */}
        <button
          onClick={() => navigate('/courier/chat?support=1')}
          className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold relative z-10 transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
        >
          <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
          צ׳אט תמיכה
        </button>
      </div>

      <div className="px-4 space-y-3 py-4">

        {/* ── Earnings card ── */}
        <div
          className="rounded-2xl p-4"
          style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>
            הכנסות
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'היום',  value: earnings.today,     color: '#2563EB', bg: '#EFF6FF', icon: '📅' },
              { label: 'השבוע', value: earnings.thisWeek,  color: '#F97316', bg: '#FFF7ED', icon: '📊' },
              { label: 'החודש', value: earnings.thisMonth, color: '#059669', bg: '#ECFDF5', icon: '💰' },
            ].map(e => (
              <div
                key={e.label}
                className="rounded-xl px-2 py-3 text-center flex flex-col items-center gap-1"
                style={{ background: e.bg, border: `1px solid ${e.color}20` }}
              >
                <span className="text-[16px]">{e.icon}</span>
                <p className="text-[20px] font-black leading-none tabular-nums" style={{ color: e.color }}>
                  ₪{e.value}
                </p>
                <p className="text-[10px] font-semibold" style={{ color: e.color + 'AA' }}>{e.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Waiting in queue card ── */}
        {candidacy && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg,#FFF8E6,#FFFCF0)',
              border: '2px solid #F58F1F40',
              boxShadow: '0 4px 16px rgba(245,143,31,0.12)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 flex-shrink-0" style={{ color: '#F58F1F' }} />
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
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#F58F1F' }} />
            </div>
            {queueDelivery && (
              <div className="rounded-xl px-3 py-2 space-y-1" style={{ background: 'rgba(245,143,31,0.08)' }}>
                <p className="text-[12px] font-medium" style={{ color: '#202125' }}>{queueDelivery.dropAddress}</p>
                <p className="text-[12px] font-bold" style={{ color: '#F58F1F' }}>₪{queueDelivery.price}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Active delivery card ── */}
        {activeBanner && !candidacy && (
          <div
            className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.98]"
            style={{
              background: activeBanner.status === 'accepted'
                ? 'linear-gradient(135deg,#0077AA,#009DE0)'
                : 'linear-gradient(135deg,#d97706,#F58F1F)',
              boxShadow: activeBanner.status === 'accepted'
                ? '0 6px 24px rgba(0,157,224,0.35)'
                : '0 6px 24px rgba(245,143,31,0.35)',
            }}
            onClick={() => navigate('/courier/deliveries')}
          >
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-2">
              <div className="w-3 h-3 rounded-full animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.9)' }} />
              <div className="flex-1">
                <p className="text-white font-black text-[16px]">
                  {activeBanner.status === 'accepted' ? '🚚 בדרך לאיסוף' : '📦 בדרך ללקוח'}
                </p>
                <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {activeBanner.businessName} · ₪{activeBanner.price} · {activeBanner.paymentMethod === 'bit' ? 'ביט' : 'מזומן'}
                </p>
              </div>
              <span className="text-white/70 text-[20px]">›</span>
            </div>

            {/* Status step progression */}
            <StatusStepper status={activeBanner.status} />

            {/* Prep countdown */}
            {activeBanner.status === 'accepted' && (
              <PrepTimerPill prepReadyAt={activeBanner.prepReadyAt} prepMinutes={activeBanner.prepMinutes} />
            )}

            {/* Addresses */}
            <div className="mx-4 mb-3 rounded-xl p-3 space-y-2" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <div className="flex items-start gap-2">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.3)', color: '#fff' }}
                >
                  א
                </span>
                <div>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.65)' }}>איסוף</p>
                  <p className="text-[12px] font-semibold text-white">{activeBanner.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.3)', color: '#fff' }}
                >
                  ב
                </span>
                <div>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.65)' }}>מסירה</p>
                  <p className="text-[12px] font-semibold text-white">{activeBanner.dropAddress}</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/courier/deliveries'); }}
                className="flex-1 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-200 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.35)' }}
              >
                פרטי המשלוח
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeBanner.businessId) {
                    const conv = getOrCreateConversation(activeBanner.businessId, courierId);
                    navigate(`/courier/chat?convId=${conv.id}&deliveryId=${activeBanner.id}`);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-200 active:scale-95"
                style={{
                  background: 'rgba(255,255,255,0.92)',
                  color: activeBanner.status === 'accepted' ? '#009DE0' : '#d97706',
                }}
              >
                💬 צ'אט עם העסק
              </button>
            </div>
          </div>
        )}

        {/* ── CTA: Find deliveries — pulses when there are pending deliveries ── */}
        {!activeBanner && !candidacy && (
          <button
            onClick={() => navigate('/courier/available')}
            className={`w-full py-4 rounded-2xl font-black text-[15px] text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-95${pendingCount > 0 ? ' animate-bounce' : ''}`}
            style={{
              background: pendingCount > 0
                ? 'linear-gradient(135deg,#1BA672,#059669)'
                : 'linear-gradient(135deg,#F97316,#EA580C)',
              boxShadow: pendingCount > 0
                ? '0 4px 20px rgba(27,166,114,0.4)'
                : '0 4px 16px rgba(249,115,22,0.3)',
            }}
          >
            <TruckIcon className="w-5 h-5" />
            {pendingCount > 0
              ? `${pendingCount} משלוחים פנויים — קח אחד`
              : 'חפש משלוחים פנויים'}
          </button>
        )}

        {/* ── Recent deliveries ── */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[15px] font-black" style={{ color: TEXT }}>משלוחים אחרונים</h2>
            {deliveries.length > 0 && (
              <button
                onClick={() => navigate('/courier/deliveries')}
                className="text-[12px] font-bold transition-all duration-200 active:scale-95"
                style={{ color: BLUE }}
              >
                הכל ›
              </button>
            )}
          </div>

          {deliveries.filter(d => !dismissedFromDash.has(d.id)).length === 0 ? (
            /* Improved empty state */
            <div
              className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
              style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div className="relative w-14 h-14">
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: '#EFF6FF', transform: 'rotate(6deg)' }}
                />
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center"
                  style={{ background: '#EFF6FF' }}
                >
                  <TruckIcon className="w-7 h-7" style={{ color: '#2563EB' }} />
                </div>
              </div>
              <div>
                <p className="font-bold text-[14px] mb-1" style={{ color: TEXT }}>
                  עדיין אין משלוחים
                </p>
                <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
                  המשלוחים שלך יופיעו כאן ברגע שתתחיל
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {deliveries
                .filter(d => !dismissedFromDash.has(d.id))
                .slice(0, 5)
                .map(d => {
                  const sc       = STATUS_COLOR[d.status];
                  const isActive = ['accepted', 'picked_up'].includes(d.status);
                  return (
                    <div
                      key={d.id}
                      className="rounded-2xl p-3 overflow-hidden"
                      style={{
                        background: '#FFFFFF',
                        border: `1px solid ${BORDER}`,
                        /* Colored left border based on status */
                        borderRight: `4px solid ${sc.border}`,
                        boxShadow: isActive ? `0 2px 10px ${sc.text}18` : 'none',
                      }}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1">
                          {/* businessName prominently */}
                          {d.businessName && (
                            <p className="text-[13px] font-black mb-0.5" style={{ color: TEXT }}>
                              {d.businessName}
                            </p>
                          )}
                          <p className="text-[12px] font-medium truncate" style={{ color: TEXT2 }}>
                            {d.dropAddress}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 mr-2">
                          <span
                            className="text-[11px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ background: sc.bg, color: sc.text }}
                          >
                            {STATUS_LABEL[d.status]}
                          </span>
                          <span className="text-[12px] font-black tabular-nums" style={{ color: ORANGE }}>
                            ₪{d.price}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
                        {new Date(d.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {isActive && (
                        <button
                          onClick={() => navigate('/courier/deliveries')}
                          className="mt-2 w-full py-2 rounded-xl text-[12px] font-bold transition-all duration-200 active:scale-95"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          נהל משלוח ›
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CourierDashboard;
