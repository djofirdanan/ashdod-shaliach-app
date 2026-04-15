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
  addDeliveryNotification,
  type StoredDelivery,
} from '../../../services/storage.service';
import { syncDeliveriesDown, getCandidates, rejectCandidate, acceptCandidate, getCandidateStats, type DeliveryCandidate } from '../../../services/sync.service';
import { getActiveDeliveryForBusiness } from '../../../services/storage.service';
import { supabase } from '../../../lib/supabase';
import {
  TruckIcon, PlusIcon, ChevronLeftIcon, XMarkIcon,
  ChatBubbleLeftRightIcon, MagnifyingGlassIcon,
  CheckIcon, MapPinIcon, BanknotesIcon, ClockIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const BLUE   = '#009DE0';
const GREEN  = '#1BA672';
const ORANGE = '#F58F1F';

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

// ─── Candidate review sheet ───────────────────────────────────────────────────
const VEHICLE_LABEL: Record<string, string> = {
  motorcycle: 'אופנוע',
  scooter: 'קטנוע',
  bicycle: 'אופניים',
  car: 'רכב',
};

const CandidateReviewSheet: React.FC<{
  deliveryId: string;
  businessId: string;
  onClose: () => void;
  onAccepted: () => void;
}> = ({ deliveryId, businessId, onClose, onAccepted }) => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<DeliveryCandidate[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [stats,      setStats]      = useState({ viewing: 0, approved: 0, rejectedByCourier: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Delivery details for display
  const delivery = getDeliveries().find(d => d.id === deliveryId) ?? null;

  const refresh = async () => {
    const list = await getCandidates(deliveryId);
    const STALE_MS = 60_000;
    const now = Date.now();
    for (const c of list) {
      if (now - new Date(c.lastHeartbeat).getTime() > STALE_MS) {
        await rejectCandidate(deliveryId, c.courierId);
      }
    }
    setCandidates(await getCandidates(deliveryId));
    const s = await getCandidateStats(deliveryId);
    setStats(s);
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
    updateDelivery(deliveryId, {
      status: 'accepted',
      courierId: top.courierId,
      courierName: top.courierName,
      acceptedAt: new Date().toISOString(),
    });
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

  const waitSec = top ? Math.round((Date.now() - new Date(top.joinedAt).getTime()) / 1000) : 0;
  const waitLabel = waitSec < 60 ? `${waitSec} שנ׳` : `${Math.floor(waitSec / 60)} דק׳`;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-lg rounded-t-3xl pb-8 pt-2 px-5"
        style={{ background: '#fff', animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
        dir="rtl"
      >
        <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        <div className="w-10 h-1 rounded-full mx-auto my-3" style={{ background: '#E8E8E8' }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: candidates.length > 0 ? '#E8F8F0' : '#F4F4F4' }}>
              {candidates.length > 0
                ? <TruckIcon className="w-4 h-4" style={{ color: GREEN }} />
                : <MagnifyingGlassIcon className="w-4 h-4" style={{ color: '#AAAAAA' }} />
              }
            </div>
            <h2 className="text-[17px] font-black" style={{ color: '#202125' }}>
              {candidates.length === 0
                ? 'מחפש שליחים...'
                : `שליח מגיע! (${candidates.length} ${candidates.length === 1 ? 'מועמד' : 'מועמדים'})`
              }
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: '#F4F4F4' }}>
            <XMarkIcon className="w-4 h-4" style={{ color: '#757575' }} />
          </button>
        </div>

        {/* Candidate stats bar */}
        {(stats.viewing + stats.approved + stats.rejectedByCourier) > 0 && (
          <div className="flex gap-2 mb-3">
            <div className="flex-1 rounded-xl p-2 text-center" style={{ background: '#EAF7FD' }}>
              <p className="text-[18px] font-black" style={{ color: BLUE }}>{stats.viewing}</p>
              <p className="text-[10px] font-semibold" style={{ color: BLUE }}>צופים</p>
            </div>
            <div className="flex-1 rounded-xl p-2 text-center" style={{ background: '#E8F8F0' }}>
              <p className="text-[18px] font-black" style={{ color: GREEN }}>{stats.approved}</p>
              <p className="text-[10px] font-semibold" style={{ color: GREEN }}>אישרו</p>
            </div>
            <div className="flex-1 rounded-xl p-2 text-center" style={{ background: '#FFF0F0' }}>
              <p className="text-[18px] font-black" style={{ color: '#E23437' }}>{stats.rejectedByCourier}</p>
              <p className="text-[10px] font-semibold" style={{ color: '#E23437' }}>דחו</p>
            </div>
          </div>
        )}

        {/* Delivery details card — always visible */}
        {delivery && (
          <div className="rounded-2xl p-3 mb-4 space-y-2" style={{ background: '#F8F9FA', border: '1px solid #E8E8E8' }}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#AAAAAA' }}>פרטי המשלוח</p>
            <div className="flex items-start gap-2">
              <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#1BA672' }} />
              <div className="min-w-0">
                <p className="text-[10px]" style={{ color: '#AAAAAA' }}>איסוף</p>
                <p className="text-[13px] font-semibold truncate" style={{ color: '#202125' }}>{delivery.pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#E23437' }} />
              <div className="min-w-0">
                <p className="text-[10px]" style={{ color: '#AAAAAA' }}>מסירה</p>
                <p className="text-[13px] font-semibold truncate" style={{ color: '#202125' }}>{delivery.dropAddress}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: '#E8E8E8' }}>
              <BanknotesIcon className="w-4 h-4" style={{ color: BLUE }} />
              <span className="text-[14px] font-black" style={{ color: BLUE }}>₪{delivery.price}</span>
              {delivery.description && (
                <span className="text-[11px] truncate" style={{ color: '#757575' }}>· {delivery.description}</span>
              )}
            </div>
          </div>
        )}

        {candidates.length === 0 ? (
          /* Empty state */
          <div className="py-6 flex flex-col items-center gap-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: '#F4F4F4' }}
            >
              <MagnifyingGlassIcon className="w-8 h-8 animate-pulse" style={{ color: '#AAAAAA' }} />
            </div>
            <p className="text-[15px] font-bold" style={{ color: '#202125' }}>מחפש שליחים זמינים...</p>
            <p className="text-[12px]" style={{ color: '#757575' }}>ההודעה נשלחה לכל השליחים הזמינים</p>
          </div>
        ) : top ? (
          <>
            {/* Queue progress dots */}
            {candidates.length > 1 && (
              <div className="flex gap-1.5 mb-4 justify-center">
                {candidates.map((_, i) => (
                  <div key={i} className="h-1.5 rounded-full transition-all" style={{ background: i === 0 ? BLUE : '#E8E8E8', width: i === 0 ? 24 : 12 }} />
                ))}
              </div>
            )}

            {/* Courier card */}
            <div className="rounded-2xl p-4 mb-4" style={{ background: '#F4F4F4', border: `2px solid ${BLUE}20` }}>
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-[22px] font-black flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${BLUE}, #0077a8)` }}
                >
                  {top.courierName.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black text-[17px]" style={{ color: '#202125' }}>{top.courierName}</p>

                  {/* Star rating */}
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} style={{ color: i <= Math.round(top.courierRating) ? '#F58F1F' : '#E8E8E8', fontSize: 13 }}>★</span>
                    ))}
                    <span className="text-[11px] mr-1 font-semibold" style={{ color: '#757575' }}>{top.courierRating.toFixed(1)}</span>
                  </div>

                  {/* Vehicle + wait time */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: '#E8E8E8' }}>
                      <TruckIcon className="w-3 h-3" style={{ color: '#757575' }} />
                      <span className="text-[11px] font-semibold" style={{ color: '#757575' }}>
                        {VEHICLE_LABEL[top.courierVehicle] ?? top.courierVehicle}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: '#E8E8E8' }}>
                      <ClockIcon className="w-3 h-3" style={{ color: '#757575' }} />
                      <span className="text-[11px] font-semibold" style={{ color: '#757575' }}>ממתין {waitLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 py-3.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#F4F4F4', color: '#757575' }}
              >
                {candidates.length > 1 ? (
                  <>
                    <ArrowRightIcon className="w-4 h-4" />
                    הבא בתור ({candidates.length - 1})
                  </>
                ) : (
                  <>
                    <XMarkIcon className="w-4 h-4" />
                    דחה
                  </>
                )}
              </button>
              <button
                onClick={handleAccept}
                disabled={loading}
                className="flex-1 py-3.5 rounded-2xl font-black text-[15px] text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                style={{ background: GREEN, boxShadow: `0 6px 20px ${GREEN}40` }}
              >
                <CheckIcon className="w-5 h-5" />
                בחר שליח זה
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

// ─── Live tracking status sheet ──────────────────────────────────────────────
const STEPS: Array<{
  status: StoredDelivery['status'];
  label: string;
  tsField?: 'acceptedAt' | 'pickedUpAt' | 'deliveredAt';
}> = [
  { status: 'pending',   label: 'מחפש שליח...',      tsField: undefined     },
  { status: 'accepted',  label: 'שליח בדרך לאיסוף', tsField: 'acceptedAt'  },
  { status: 'picked_up', label: 'בדרך אליך',          tsField: 'pickedUpAt'  },
  { status: 'delivered', label: 'נמסר בהצלחה',        tsField: 'deliveredAt' },
];
const STEP_ORDER: StoredDelivery['status'][] = ['pending', 'accepted', 'picked_up', 'delivered'];

const NOTIFY_MSGS: Partial<Record<StoredDelivery['status'], string>> = {
  accepted:  '🛵 שליח קיבל את ההזמנה — בדרך לאיסוף',
  picked_up: '📦 החבילה נאספה — השליח בדרך אליך!',
  delivered: '✅ המשלוח נמסר בהצלחה!',
  cancelled: '❌ המשלוח בוטל',
};

const TrackingSheet: React.FC<{
  deliveryId: string;
  businessId: string;
  onClose: () => void;
}> = ({ deliveryId, businessId, onClose }) => {
  const navigate  = useNavigate();
  const [delivery, setDelivery] = useState<StoredDelivery | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatusRef = useRef<StoredDelivery['status'] | null>(null);

  const fetchDelivery = async () => {
    await syncDeliveriesDown().catch(() => {});
    const d = getDeliveries().find(x => x.id === deliveryId) ?? null;

    // Fire notification when status advances
    if (d && prevStatusRef.current !== null && prevStatusRef.current !== d.status) {
      const msg = NOTIFY_MSGS[d.status];
      if (msg) toast(msg, { duration: 6000, icon: undefined,
        style: { background: '#202125', color: '#FFFFFF', fontWeight: 700, borderRadius: 16, direction: 'rtl' } });
    }
    if (d) prevStatusRef.current = d.status;

    setDelivery(d);
    if (d?.status === 'delivered' || d?.status === 'cancelled') {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    fetchDelivery();
    intervalRef.current = setInterval(fetchDelivery, 3000);

    // Supabase realtime — instant notification without waiting for next poll
    const channel = supabase
      .channel(`delivery_track_${deliveryId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deliveries', filter: `id=eq.${deliveryId}` },
        () => { fetchDelivery(); }
      )
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Business cancel — show modal with options
  const handleCancelDelivery = () => setShowCancelModal(true);

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
            {isCancelled ? 'המשלוח בוטל' : isDone ? 'נמסר בהצלחה' : 'מעקב משלוח'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <XMarkIcon className="w-5 h-5" style={{ color: '#757575' }} />
          </button>
        </div>

        {/* Delivery summary */}
        <div className="rounded-2xl p-3 mb-4 space-y-2" style={{ background: '#F4F4F4' }}>
          <div className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#E23437' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#202125' }}>{delivery.dropAddress}</span>
          </div>
          <div className="flex items-center gap-2">
            <BanknotesIcon className="w-4 h-4 flex-shrink-0" style={{ color: BLUE }} />
            <span className="text-[13px] font-bold" style={{ color: BLUE }}>₪{delivery.price}</span>
            {delivery.courierName && (
              <>
                <span style={{ color: '#E8E8E8' }}>·</span>
                <TruckIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#757575' }} />
                <span className="text-[13px]" style={{ color: '#202125' }}>{delivery.courierName}</span>
              </>
            )}
          </div>
        </div>

        {/* Steps timeline */}
        {!isCancelled && (
          <div
            className="rounded-2xl p-4 mb-5 space-y-0"
            style={{ background: '#F8F9FA', border: '1px solid #E8E8E8' }}
          >
            {/* "Order created" row */}
            <div className="flex items-center gap-3 mb-1">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: '#E8F8F0' }}>
                  <CheckIcon className="w-4 h-4" style={{ color: GREEN }} />
                </div>
                <div className="w-0.5 my-1" style={{ height: 16, background: GREEN }} />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <p className="text-[13px] font-semibold" style={{ color: '#202125' }}>הזמנה נשלחה</p>
                <p className="text-[11px] font-bold tabular-nums" style={{ color: GREEN }}>
                  {fmtDateTime(delivery.createdAt)}
                </p>
              </div>
            </div>

            {STEPS.map((step, idx) => {
              const done    = currentIdx >= idx;
              const active  = currentIdx === idx;
              const ts      = step.tsField ? fmtTime(delivery[step.tsField] as string | undefined) : null;
              return (
                <div key={step.status}>
                  <div className="flex items-center gap-3">
                    {/* Circle + connector */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: done ? BLUE : '#E8E8E8',
                          boxShadow: active ? `0 0 0 4px ${BLUE}30` : undefined,
                        }}
                      >
                        {done && !active
                          ? <CheckIcon className="w-4 h-4 text-white" />
                          : idx === 0 ? <MagnifyingGlassIcon className="w-4 h-4" style={{ color: done ? '#fff' : '#AAAAAA' }} />
                          : idx === 1 ? <TruckIcon className="w-4 h-4" style={{ color: done ? '#fff' : '#AAAAAA' }} />
                          : idx === 2 ? <MapPinIcon className="w-4 h-4" style={{ color: done ? '#fff' : '#AAAAAA' }} />
                          : <CheckIcon className="w-4 h-4" style={{ color: done ? '#fff' : '#AAAAAA' }} />
                        }
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div className="w-0.5 my-1" style={{ height: 16, background: done && !active ? BLUE : '#E8E8E8' }} />
                      )}
                    </div>

                    {/* Label + timestamp */}
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-bold" style={{ color: done ? '#202125' : '#AAAAAA' }}>
                          {step.label}
                        </p>
                        {active && step.status === 'pending' && (
                          <p className="text-[11px]" style={{ color: '#757575' }}>מחפש שליח זמין...</p>
                        )}
                        {active && step.status === 'accepted' && delivery.courierName && (
                          <p className="text-[11px]" style={{ color: '#757575' }}>{delivery.courierName} מגיע לאיסוף</p>
                        )}
                      </div>
                      {done && ts && (
                        <p className="text-[11px] font-bold tabular-nums" style={{ color: BLUE }}>{ts}</p>
                      )}
                      {active && !ts && step.status !== 'pending' && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse"
                          style={{ background: `${BLUE}20`, color: BLUE }}
                        >
                          עכשיו
                        </span>
                      )}
                    </div>
                  </div>
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
          {/* Cancel button for active deliveries */}
          {!isDone && (delivery.status === 'pending' || delivery.status === 'accepted') && (
            <button
              onClick={handleCancelDelivery}
              className="w-full py-3 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: '#FFF0F0', color: '#E23437', border: '1px solid #F5C6C640' }}
            >
              <XMarkIcon className="w-4 h-4" />
              בטל משלוח
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

      {/* Cancel modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 pb-8" style={{ background: '#fff' }} dir="rtl">
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E8E8E8' }} />
            <h3 className="text-[17px] font-black mb-2" style={{ color: '#202125' }}>ביטול משלוח</h3>
            <p className="text-[13px] mb-5" style={{ color: '#757575' }}>מה ברצונך לעשות לאחר הביטול?</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  updateDelivery(deliveryId, { status: 'pending', courierId: undefined, courierName: undefined, acceptedAt: undefined, cancelAction: 'find_new' });
                  setShowCancelModal(false);
                  onClose();
                  toast.success('המשלוח חזר לחיפוש שליח');
                }}
                className="w-full py-3.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2"
                style={{ background: '#EAF7FD', color: BLUE, border: `1.5px solid ${BLUE}30` }}
              >
                🔍 חפש שליח אחר
              </button>
              <button
                onClick={() => {
                  updateDelivery(deliveryId, { status: 'cancelled', cancelledAt: new Date().toISOString(), cancelledBy: 'business', cancelAction: 'delete' });
                  setShowCancelModal(false);
                  onClose();
                  toast('המשלוח בוטל ונמחק', { style: { background: '#202125', color: '#fff', direction: 'rtl' } });
                }}
                className="w-full py-3.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2"
                style={{ background: '#FFF0F0', color: '#E23437', border: '1.5px solid #E2343730' }}
              >
                🗑️ בטל ומחק את המשלוח
              </button>
              <button onClick={() => setShowCancelModal(false)} className="w-full py-3 rounded-2xl text-[13px] font-semibold" style={{ background: '#F4F4F4', color: '#757575' }}>
                חזור
              </button>
            </div>
          </div>
        </div>
      )}
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

  // ── Refresh deliveries list every 5s so tracking panel stays current ────────
  useEffect(() => {
    if (!businessId) return;
    const id = setInterval(async () => {
      await syncDeliveriesDown().catch(() => {});
      setDeliveries(getDeliveriesByBusiness(businessId));
    }, 5000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // ── Realtime: when a courier joins queue for ANY of our pending deliveries,
  //    auto-open the CandidateReviewSheet for that delivery ──────────────────
  useEffect(() => {
    if (!businessId) return;
    const handleNewCandidate = (deliveryId: string) => {
      const allDel = getDeliveries();
      const myDel = allDel.find(d => d.id === deliveryId && d.businessId === businessId);
      if (!myDel || !['pending', 'scheduled'].includes(myDel.status)) return;
      setSearchParams({ tracking: deliveryId });
      setDeliveries(getDeliveriesByBusiness(businessId));
    };

    const channel = supabase
      .channel(`business_candidates_${businessId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_candidates' },
        (payload) => {
          const deliveryId = (payload.new as { delivery_id?: string }).delivery_id;
          if (!deliveryId) return;
          handleNewCandidate(deliveryId);
          toast.success('שליח הצטרף לתור! 🛵');
        }
      )
      .on(
        'postgres_changes',
        // Also catch UPDATE — courier may have already inserted a "viewing" row and then approved
        { event: 'UPDATE', schema: 'public', table: 'delivery_candidates' },
        (payload) => {
          const deliveryId = (payload.new as { delivery_id?: string }).delivery_id;
          const courierStatus = (payload.new as { courier_status?: string }).courier_status;
          if (!deliveryId || courierStatus !== 'approved') return;
          // Only open sheet if not already tracking this delivery
          const currentTracking = new URLSearchParams(window.location.search).get('tracking');
          if (currentTracking === deliveryId) return; // already showing
          handleNewCandidate(deliveryId);
          toast.success('שליח אישר את המשלוח! 🛵');
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId, setSearchParams]);

  // Fix 5 — Scheduled delivery auto-release: every 60s check if any scheduled delivery is due
  useEffect(() => {
    if (!businessId) return;
    const releaseScheduled = () => {
      const all = getDeliveries();
      const nowISO = new Date().toISOString();
      const ready = all.filter(
        d => d.status === 'scheduled' && d.scheduledAt && d.scheduledAt <= nowISO && d.businessId === businessId
      );
      for (const d of ready) {
        updateDelivery(d.id, { status: 'pending' });
        addDeliveryNotification({
          deliveryId: d.id,
          businessId,
          businessName: d.businessName,
          pickupAddress: d.pickupAddress,
          dropAddress: d.dropAddress,
          description: d.description,
          price: d.price,
          requiredVehicle: d.requiredVehicle,
          paymentMethod: d.paymentMethod,
          customerPaid: d.customerPaid,
        });
        toast.success(`📅 משלוח מתוזמן שוחרר — מחפש שליח`, { duration: 5000 });
      }
      if (ready.length > 0) setDeliveries(getDeliveriesByBusiness(businessId));
    };
    releaseScheduled();
    const id = setInterval(releaseScheduled, 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const activeCount = deliveries.filter(d => ['pending','accepted','picked_up'].includes(d.status)).length;
  const doneCount   = deliveries.filter(d => d.status === 'delivered').length;
  const recent      = [...deliveries].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const activeDeliveryBanner = getActiveDeliveryForBusiness(businessId);

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

      {/* ── Active delivery banner ── */}
      {activeDeliveryBanner && (
        <div className="px-4 mt-3">
          <div
            className="rounded-2xl p-3 flex items-center gap-3 cursor-pointer"
            style={{ background: `${BLUE}10`, border: `1.5px solid ${BLUE}30` }}
            onClick={() => {
              if (activeDeliveryBanner.courierId) {
                const conv = getOrCreateConversation(businessId, activeDeliveryBanner.courierId);
                navigate(`/business/chat?convId=${conv.id}&deliveryId=${activeDeliveryBanner.id}`);
              }
            }}
          >
            <div className="w-3 h-3 rounded-full animate-pulse flex-shrink-0" style={{ background: activeDeliveryBanner.status === 'picked_up' ? ORANGE : BLUE }} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black" style={{ color: BLUE }}>
                {activeDeliveryBanner.status === 'accepted' ? '🛵 שליח בדרך לאיסוף' : '📦 החבילה בדרך אליך'}
              </p>
              <p className="text-[11px] truncate" style={{ color: '#757575' }}>{activeDeliveryBanner.courierName} · {activeDeliveryBanner.dropAddress}</p>
            </div>
            <span className="text-[11px] font-bold" style={{ color: BLUE }}>פתח צ׳אט ›</span>
          </div>
        </div>
      )}

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
                        <span className="text-[11px] font-semibold" style={{ color: BLUE }}>עקוב</span>
                      )}
                      <span className="text-[11px]" style={{ color: '#AAAAAA' }}>
                        {formatDate(d.createdAt)} • {formatTime(d.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: address */}
                  <p className="text-[14px] font-semibold" style={{ color: '#202125' }}>
                    {d.dropAddress}
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
