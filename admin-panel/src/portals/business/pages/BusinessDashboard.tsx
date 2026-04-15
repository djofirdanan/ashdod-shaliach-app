import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import {
  getDeliveriesByBusiness,
  getBusiness,
  getDeliveries,
  getOrCreateConversation,
  updateDelivery,
  type StoredDelivery,
} from '../../../services/storage.service';
import { syncDeliveriesDown, getCandidates, rejectCandidate, acceptCandidate, type DeliveryCandidate } from '../../../services/sync.service';
import { supabase } from '../../../lib/supabase';
import { TruckIcon, PlusIcon, ChevronLeftIcon, XMarkIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const BLUE  = '#009DE0';
const GREEN = '#1BA672';

const STATUS_LABEL: Record<StoredDelivery['status'], string> = {
  scheduled: '📅 מתוזמן',
  pending:   'ממתין לשליח',
  accepted:  'שליח בדרך לאיסוף',
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

// ─── Candidate review sheet ───────────────────────────────────────────────────
const CandidateReviewSheet: React.FC<{
  deliveryId: string;
  businessId: string;
  onClose: () => void;
  onAccepted: () => void;
}> = ({ deliveryId, businessId, onClose, onAccepted }) => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<DeliveryCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = async () => {
    // 1. Fetch waiting candidates
    const list = await getCandidates(deliveryId);

    // 2. Auto-reject stale heartbeats (> 60s old)
    const STALE_MS = 60_000;
    const now = Date.now();
    for (const c of list) {
      if (now - new Date(c.lastHeartbeat).getTime() > STALE_MS) {
        await rejectCandidate(deliveryId, c.courierId);
      }
    }
    // Re-fetch after auto-rejects
    const fresh = await getCandidates(deliveryId);
    setCandidates(fresh);
  };

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryId]);

  const top = candidates[0] ?? null;

  const handleAccept = async () => {
    if (!top) return;
    setLoading(true);
    await acceptCandidate(deliveryId, top.courierId);
    // Update delivery in local storage + Supabase
    updateDelivery(deliveryId, {
      status: 'accepted',
      courierId: top.courierId,
      courierName: top.courierName,
      acceptedAt: new Date().toISOString(),
    });
    // Open or create chat conversation
    const conv = getOrCreateConversation(businessId, top.courierId);
    setLoading(false);
    onAccepted();
    navigate(`/business/chat?convId=${conv.id}&deliveryId=${deliveryId}`);
    onClose();
  };

  const handleReject = async () => {
    if (!top) return;
    await rejectCandidate(deliveryId, top.courierId);
    await refresh();
    toast.success('הועבר למועמד הבא');
  };

  const vehicleEmoji = (v: string) =>
    v === 'motorcycle' ? '🏍️' : v === 'bicycle' ? '🚲' : v === 'scooter' ? '🛵' : '🚗';

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-t-3xl pb-8 pt-2 px-5" style={{ background: '#fff' }} dir="rtl">
        <div className="w-10 h-1 rounded-full mx-auto my-3" style={{ background: '#E8E8E8' }} />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-black" style={{ color: '#202125' }}>
            {candidates.length === 0 ? '🔍 מחפש שליחים...' : `🏍️ שליח מגיע! (${candidates.length} מועמדים)`}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5" style={{ color: '#757575' }} />
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-[40px] mb-3 animate-pulse">🔍</div>
            <p className="text-[15px] font-bold" style={{ color: '#202125' }}>מחפש שליחים זמינים...</p>
            <p className="text-[12px] mt-1" style={{ color: '#757575' }}>ההודעה נשלחה לכל השליחים הזמינים</p>
          </div>
        ) : top ? (
          <>
            {/* Queue counter */}
            {candidates.length > 1 && (
              <div className="flex gap-1.5 mb-4 justify-center">
                {candidates.map((_, i) => (
                  <div key={i} className="h-1.5 rounded-full flex-1" style={{ background: i === 0 ? BLUE : '#E8E8E8', maxWidth: 40 }} />
                ))}
              </div>
            )}

            {/* Top candidate card */}
            <div className="rounded-2xl p-4 mb-4" style={{ background: '#F4F4F4', border: `2px solid ${BLUE}30` }}>
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-[22px] font-black flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${BLUE}, #0077a8)` }}>
                  {top.courierName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-black text-[17px]" style={{ color: '#202125' }}>{top.courierName}</p>
                  {/* Stars */}
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} style={{ color: i <= Math.round(top.courierRating) ? '#F58F1F' : '#E8E8E8', fontSize: 14 }}>★</span>
                    ))}
                    <span className="text-[11px] mr-1" style={{ color: '#757575' }}>{top.courierRating.toFixed(1)}</span>
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: '#757575' }}>
                    {vehicleEmoji(top.courierVehicle)} · ממתין{' '}
                    {Math.round((Date.now() - new Date(top.joinedAt).getTime()) / 1000)} שניות
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 py-3.5 rounded-2xl font-bold text-[14px] transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#F4F4F4', color: '#757575' }}
              >
                {candidates.length > 1 ? `⏭️ הבא בתור (${candidates.length - 1})` : '❌ דחה'}
              </button>
              <button
                onClick={handleAccept}
                disabled={loading}
                className="flex-2 flex-1 py-3.5 rounded-2xl font-black text-[15px] text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: GREEN, boxShadow: `0 6px 20px ${GREEN}40` }}
              >
                ✅ בחר שליח זה
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

// ─── Live tracking status sheet ──────────────────────────────────────────────
const STEPS: Array<{ status: StoredDelivery['status']; label: string; emoji: string }> = [
  { status: 'pending',   label: 'מחפש שליח...',        emoji: '🔍' },
  { status: 'accepted',  label: 'שליח בדרך לאיסוף',   emoji: '🏍️' },
  { status: 'picked_up', label: 'בדרך אליך',           emoji: '📦' },
  { status: 'delivered', label: 'נמסר בהצלחה! ✅',    emoji: '🎉' },
];
const STEP_ORDER: StoredDelivery['status'][] = ['pending', 'accepted', 'picked_up', 'delivered'];

const TrackingSheet: React.FC<{
  deliveryId: string;
  businessId: string;
  onClose: () => void;
}> = ({ deliveryId, businessId, onClose }) => {
  const navigate  = useNavigate();
  const [delivery, setDelivery] = useState<StoredDelivery | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDelivery = async () => {
    await syncDeliveriesDown().catch(() => {});
    const d = getDeliveries().find(x => x.id === deliveryId) ?? null;
    setDelivery(d);
    if (d?.status === 'delivered' || d?.status === 'cancelled') {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    fetchDelivery();
    intervalRef.current = setInterval(fetchDelivery, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [deliveryId]);

  if (!delivery) return null;

  const isDone      = delivery.status === 'delivered' || delivery.status === 'cancelled';
  const isCancelled = delivery.status === 'cancelled';
  const currentIdx  = STEP_ORDER.indexOf(delivery.status as StoredDelivery['status']);

  const handleOpenChat = () => {
    if (!delivery.courierId) return;
    const conv = getOrCreateConversation(businessId, delivery.courierId);
    navigate(`/business/chat?convId=${conv.id}&deliveryId=${deliveryId}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl pb-8 pt-2 px-5"
        style={{ background: '#fff', animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
        dir="rtl"
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>

        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full mx-auto my-3" style={{ background: '#E8E8E8' }} />

        {/* Close */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-black" style={{ color: '#202125' }}>
            {isCancelled ? '❌ המשלוח בוטל' : isDone ? '🎉 נמסר בהצלחה!' : '📡 עוקב אחר המשלוח'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <XMarkIcon className="w-5 h-5" style={{ color: '#757575' }} />
          </button>
        </div>

        {/* Delivery summary */}
        <div
          className="rounded-2xl p-3 mb-4 space-y-1"
          style={{ background: '#F4F4F4' }}
        >
          <p className="text-[12px]" style={{ color: '#757575' }}>
            📍 <span className="font-semibold" style={{ color: '#202125' }}>{delivery.dropAddress}</span>
          </p>
          <p className="text-[12px]" style={{ color: '#757575' }}>
            💰 <span className="font-bold" style={{ color: BLUE }}>₪{delivery.price}</span>
            {delivery.courierName && (
              <> &nbsp;·&nbsp; 🧑‍✈️ <span style={{ color: '#202125' }}>{delivery.courierName}</span></>
            )}
          </p>
        </div>

        {/* Steps */}
        {!isCancelled && (
          <div className="space-y-3 mb-5">
            {STEPS.map((step, idx) => {
              const done    = currentIdx >= idx;
              const active  = currentIdx === idx;
              return (
                <div key={step.status} className="flex items-center gap-3">
                  {/* Circle */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[16px] transition-all"
                    style={{
                      background: done ? BLUE : '#E8E8E8',
                      boxShadow: active ? `0 0 0 4px ${BLUE}30` : undefined,
                      animation: active ? 'pulse 1.5s infinite' : undefined,
                    }}
                  >
                    {done ? (active ? step.emoji : '✓') : <span style={{ opacity: 0.3 }}>{step.emoji}</span>}
                  </div>
                  {/* Label */}
                  <div className="flex-1">
                    <p
                      className="text-[14px] font-bold"
                      style={{ color: done ? '#202125' : '#AAAAAA' }}
                    >
                      {step.label}
                    </p>
                    {active && step.status === 'pending' && (
                      <p className="text-[11px] mt-0.5" style={{ color: '#757575' }}>
                        מחפש שליח זמין בסביבה...
                      </p>
                    )}
                    {active && step.status === 'accepted' && delivery.courierName && (
                      <p className="text-[11px] mt-0.5" style={{ color: '#757575' }}>
                        {delivery.courierName} מגיע לאיסוף
                      </p>
                    )}
                  </div>
                  {/* Connection line */}
                  {idx < STEPS.length - 1 && (
                    <div className="absolute" style={{ display: 'none' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {delivery.courierId && !isDone && (
            <button
              onClick={handleOpenChat}
              className="w-full py-3.5 rounded-2xl font-bold text-[14px] text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: BLUE, boxShadow: `0 6px 20px ${BLUE}30` }}
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              פתח צ׳אט עם השליח
            </button>
          )}
          <button
            onClick={() => { onClose(); navigate('/business/deliveries'); }}
            className="w-full py-3 rounded-2xl font-semibold text-[13px] transition-all active:scale-95"
            style={{ background: '#F4F4F4', color: '#757575' }}
          >
            {isDone ? 'סגור' : 'הסתר ועקוב מהרקע'}
          </button>
        </div>
      </div>
    </div>
  );
};

const BusinessDashboard: React.FC = () => {
  const navigate        = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useSelector((s: RootState) => s.auth.user);

  const token      = localStorage.getItem('admin_token') ?? '';
  const businessId = token.startsWith('business-') ? token.replace('business-', '') : '';

  // Live tracking sheet
  const trackingId = searchParams.get('tracking');

  const [deliveries, setDeliveries] = useState<StoredDelivery[]>([]);
  const [balance,    setBalance]    = useState(0);
  const [bizName,    setBizName]    = useState('');

  useEffect(() => {
    if (!businessId) return;
    const load = async () => {
      await syncDeliveriesDown().catch(() => {});
      const d   = getDeliveriesByBusiness(businessId);
      const biz = getBusiness(businessId);
      setDeliveries(d);
      setBalance(biz?.balance ?? 0);
      if (biz?.businessName) setBizName(biz.businessName);

      // ── On mount: check if any pending delivery already has waiting candidates
      //    (handles the case where the courier joined before the page loaded) ──
      if (!searchParams.get('tracking')) {
        const pending = d.filter(x => x.status === 'pending' || x.status === 'scheduled');
        for (const pd of pending) {
          const { data } = await supabase
            .from('delivery_candidates')
            .select('id')
            .eq('delivery_id', pd.id)
            .eq('status', 'waiting')
            .limit(1);
          if (data && data.length > 0) {
            setSearchParams({ tracking: pd.id });
            break;
          }
        }
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // ── Realtime: when a courier joins queue for ANY of our pending deliveries,
  //    auto-open the CandidateReviewSheet for that delivery ──────────────────
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`business_candidates_${businessId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_candidates' },
        (payload) => {
          const deliveryId = (payload.new as { delivery_id?: string }).delivery_id;
          if (!deliveryId) return;
          // Only care about our own deliveries
          const allDel = getDeliveries();
          const myDel = allDel.find(d => d.id === deliveryId && d.businessId === businessId);
          if (!myDel || !['pending', 'scheduled'].includes(myDel.status)) return;
          // Auto-open the candidate review sheet
          setSearchParams({ tracking: deliveryId });
          setDeliveries(getDeliveriesByBusiness(businessId));
          toast('🏍️ שליח הצטרף לתור!', { icon: '🔔' });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId, setSearchParams]);

  const activeCount = deliveries.filter(d => ['pending','accepted','picked_up'].includes(d.status)).length;
  const doneCount   = deliveries.filter(d => d.status === 'delivered').length;
  const recent      = [...deliveries].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const displayName = bizName || user?.name || 'עסק';

  return (
    <div className="max-w-lg mx-auto" dir="rtl">

      {/* ── Hero greeting banner ── */}
      <div
        className="px-5 pt-6 pb-7"
        style={{ background: BLUE }}
      >
        <p className="text-white/80 text-[13px] font-medium mb-1">שלום,</p>
        <h1 className="text-white text-[24px] font-black mb-5">{displayName} 👋</h1>

        {/* Quick-action card */}
        <button
          onClick={() => navigate('/business/new-delivery')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]"
          style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.35)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#FFFFFF' }}
          >
            <PlusIcon className="w-6 h-6" style={{ color: BLUE }} />
          </div>
          <div className="flex-1 text-right">
            <p className="text-white font-black text-[16px]">בקש משלוח חדש</p>
            <p className="text-white/70 text-[12px]">שליח יאסוף תוך דקות</p>
          </div>
          <ChevronLeftIcon className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="px-4 -mt-3">
        <div
          className="grid grid-cols-3 gap-3 rounded-2xl p-4"
          style={{ background: '#FFFFFF', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
        >
          {[
            { label: 'סה"כ',    value: deliveries.length, color: '#202125' },
            { label: 'פעילים',  value: activeCount,        color: BLUE      },
            { label: 'הושלמו',  value: doneCount,          color: '#1BA672' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-[22px] font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#AAAAAA' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Balance chip ── */}
      {balance !== 0 && (
        <div className="px-4 mt-3">
          <div
            className="flex items-center justify-between px-4 py-3 rounded-2xl"
            style={{ background: '#FFFFFF', border: '1px solid #E8E8E8' }}
          >
            <p className="text-[13px] font-semibold" style={{ color: '#757575' }}>יתרת חשבון</p>
            <p
              className="text-[18px] font-black"
              style={{ color: balance >= 0 ? '#1BA672' : '#E23437' }}
            >
              ₪{balance.toFixed(0)}
            </p>
          </div>
        </div>
      )}

      {/* ── Recent deliveries ── */}
      <div className="px-4 mt-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-black" style={{ color: '#202125' }}>משלוחים אחרונים</h2>
          {deliveries.length > 0 && (
            <button
              onClick={() => navigate('/business/deliveries')}
              className="text-[13px] font-semibold flex items-center gap-0.5"
              style={{ color: BLUE }}
            >
              הכל
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {deliveries.length === 0 ? (
          /* Empty state */
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
            style={{ background: '#FFFFFF', border: '1px solid #E8E8E8' }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: '#EAF7FD' }}
            >
              <TruckIcon className="w-8 h-8" style={{ color: BLUE }} />
            </div>
            <div>
              <p className="font-black text-[16px]" style={{ color: '#202125' }}>אין משלוחים עדיין</p>
              <p className="text-[13px] mt-1" style={{ color: '#757575' }}>הזמן את המשלוח הראשון שלך</p>
            </div>
            <button
              onClick={() => navigate('/business/new-delivery')}
              className="px-6 py-3 rounded-2xl text-white font-bold text-[14px] transition-all active:scale-95"
              style={{ background: BLUE }}
            >
              בקש משלוח ראשון
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map(d => {
              const sc = STATUS_COLOR[d.status];
              const isTrackable = ['pending', 'accepted', 'picked_up'].includes(d.status);
              return (
                <div
                  key={d.id}
                  onClick={() => isTrackable && setSearchParams({ tracking: d.id })}
                  className="rounded-2xl p-4 transition-all active:scale-[0.99]"
                  style={{
                    background: '#FFFFFF',
                    border: isTrackable ? `1.5px solid ${BLUE}30` : '1px solid #E8E8E8',
                    boxShadow: isTrackable ? `0 2px 12px ${BLUE}10` : '0 1px 4px rgba(0,0,0,0.04)',
                    cursor: isTrackable ? 'pointer' : 'default',
                  }}
                >
                  {/* Row 1: status + time */}
                  <div className="flex items-center justify-between mb-2.5">
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: sc.bg, color: sc.text }}
                    >
                      {STATUS_LABEL[d.status]}
                    </span>
                    <div className="flex items-center gap-2">
                      {isTrackable && (
                        <span className="text-[11px] font-semibold" style={{ color: BLUE }}>
                          📡 עקוב
                        </span>
                      )}
                      <span className="text-[11px]" style={{ color: '#AAAAAA' }}>
                        {formatDate(d.createdAt)} • {formatTime(d.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: address */}
                  <p className="text-[14px] font-semibold" style={{ color: '#202125' }}>
                    📍 {d.dropAddress}
                  </p>

                  {/* Row 3: courier + price */}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[12px]" style={{ color: '#757575' }}>
                      {d.courierName ? `שליח: ${d.courierName}` : 'ממתין לשליח'}
                    </p>
                    <p className="text-[15px] font-black" style={{ color: BLUE }}>
                      ₪{d.price}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Live delivery tracking / candidate review sheet ── */}
      {trackingId && businessId && (() => {
        const d = deliveries.find(x => x.id === trackingId);
        if (!d) return null;
        if (d.status === 'pending' || d.status === 'scheduled') {
          return (
            <CandidateReviewSheet
              deliveryId={trackingId}
              businessId={businessId}
              onClose={() => setSearchParams({})}
              onAccepted={() => setSearchParams({})}
            />
          );
        }
        return (
          <TrackingSheet
            deliveryId={trackingId}
            businessId={businessId}
            onClose={() => setSearchParams({})}
          />
        );
      })()}
    </div>
  );
};

export default BusinessDashboard;
