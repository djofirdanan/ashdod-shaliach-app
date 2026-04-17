import React, { useEffect, useState, useRef } from 'react';
import { Calendar, CheckCircle, XCircle, Truck, Package, MagnifyingGlass, Trash, MapPin as PhosphorMapPin, Money } from '@phosphor-icons/react';
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
  addMessage,
  getReviewsByTarget,
  getCouriers,
  type StoredDelivery,
} from '../../../services/storage.service';
import { syncDeliveriesDown, getCandidates, rejectCandidate, acceptCandidate, getCandidateStats, type DeliveryCandidate } from '../../../services/sync.service';
import { getActiveDeliveryForBusiness } from '../../../services/storage.service';
import { supabase } from '../../../lib/supabase';
import {
  TruckIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon,
  ChatBubbleLeftRightIcon, MagnifyingGlassIcon,
  CheckIcon, MapPinIcon, BanknotesIcon, ClockIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const BLUE   = '#009DE0';
const GREEN  = '#1BA672';
const ORANGE = '#F58F1F';

const STATUS_LABEL: Record<StoredDelivery['status'], React.ReactNode> = {
  scheduled: <span className="flex items-center gap-1"><Calendar size={10} /> מתוזמן</span>,
  pending:   'ממתין לשליח',
  accepted:  <span className="flex items-center gap-1"><Truck size={10} /> שליח בדרך לאיסוף</span>,
  picked_up: 'בדרך ללקוח',
  delivered: <span className="flex items-center gap-1"><CheckCircle size={10} /> נמסר</span>,
  cancelled: <span className="flex items-center gap-1"><XCircle size={10} /> בוטל</span>,
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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  return 'ערב טוב';
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

  const [selectedIndex, setSelectedIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  // Keep selectedIndex in bounds when candidates list changes
  const safeIndex = candidates.length > 0 ? Math.min(selectedIndex, candidates.length - 1) : 0;
  const selected = candidates[safeIndex] ?? null;

  const goNext = () => setSelectedIndex(i => Math.min(candidates.length - 1, i + 1));
  const goPrev = () => setSelectedIndex(i => Math.max(0, i - 1));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) < 40) return;
    // In RTL: swiping left (negative delta) means going to next candidate
    if (delta < 0) goNext(); else goPrev();
  };

  const handleAccept = async () => {
    if (!selected) return;
    setLoading(true);

    // 1. Mark candidate as accepted in Supabase (also rejects all others)
    await acceptCandidate(deliveryId, selected.courierId);

    // 2. Update the delivery with the chosen courier — writes to localStorage AND Supabase
    //    If the business set a prep time on the delivery, start the countdown now.
    const acceptedAt = new Date().toISOString();
    const deliveryForPrep = getDeliveries().find(d => d.id === deliveryId);
    const prepReadyAt = deliveryForPrep?.prepMinutes
      ? new Date(Date.now() + deliveryForPrep.prepMinutes * 60 * 1000).toISOString()
      : undefined;

    updateDelivery(deliveryId, {
      status: 'accepted',
      courierId: selected.courierId,
      courierName: selected.courierName,
      acceptedAt,
      ...(prepReadyAt ? { prepReadyAt } : {}),
    });

    // 3. Send a system message in the shared conversation so the courier gets
    //    an in-app notification and the chat shows the approval event.
    const conv = getOrCreateConversation(businessId, selected.courierId);
    const biz  = getBusiness(businessId);
    addMessage(conv.id, {
      senderId:    'system',
      senderName:  'מערכת',
      senderType:  'business',
      content:     `✅ ${biz?.businessName ?? 'העסק'} אישר אותך למשלוח! פרטים בכרטיסיית "פעילים".`,
      messageType: 'system',
      deliveryId,
    });

    setLoading(false);
    onAccepted();
    navigate(`/business/chat?convId=${conv.id}&deliveryId=${deliveryId}`);
    onClose();
  };

  const handleReject = async () => {
    if (!selected) return;
    await rejectCandidate(deliveryId, selected.courierId);
    setSelectedIndex(0);
    await refresh();
    toast.success('השליח נדחה');
  };

  const waitSec = selected ? Math.round((Date.now() - new Date(selected.joinedAt).getTime()) / 1000) : 0;
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
        ) : selected ? (
          <>
            {/* ── Carousel ──────────────────────────────────────────────────── */}
            <div className="relative mb-3">
              {/* Right arrow (RTL: previous candidate) */}
              {candidates.length > 1 && (
                <button
                  onClick={goPrev}
                  disabled={safeIndex === 0}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-25"
                  style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', marginRight: -12 }}
                >
                  <ChevronRightIcon className="w-4 h-4" style={{ color: '#202125' }} />
                </button>
              )}

              {/* Left arrow (RTL: next candidate) */}
              {candidates.length > 1 && (
                <button
                  onClick={goNext}
                  disabled={safeIndex === candidates.length - 1}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-25"
                  style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', marginLeft: -12 }}
                >
                  <ChevronLeftIcon className="w-4 h-4" style={{ color: '#202125' }} />
                </button>
              )}

              {/* Courier card — swipeable */}
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="rounded-2xl p-4"
                style={{
                  background: '#F4F4F4',
                  border: `2px solid ${BLUE}20`,
                  userSelect: 'none',
                  transition: 'opacity 0.15s',
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-[22px] font-black flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${BLUE}, #0077a8)` }}
                  >
                    {selected.courierName.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[17px]" style={{ color: '#202125' }}>{selected.courierName}</p>

                    {/* Star rating */}
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[1,2,3,4,5].map(i => (
                        <span key={i} style={{ color: i <= Math.round(selected.courierRating) ? '#F58F1F' : '#E8E8E8', fontSize: 13 }}>★</span>
                      ))}
                      <span className="text-[11px] mr-1 font-semibold" style={{ color: '#757575' }}>{selected.courierRating.toFixed(1)}</span>
                    </div>

                    {/* Vehicle + wait time */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: '#E8E8E8' }}>
                        <TruckIcon className="w-3 h-3" style={{ color: '#757575' }} />
                        <span className="text-[11px] font-semibold" style={{ color: '#757575' }}>
                          {VEHICLE_LABEL[selected.courierVehicle] ?? selected.courierVehicle}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: '#E8E8E8' }}>
                        <ClockIcon className="w-3 h-3" style={{ color: '#757575' }} />
                        <span className="text-[11px] font-semibold" style={{ color: '#757575' }}>ממתין {waitLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Candidate index badge (when multiple) */}
                  {candidates.length > 1 && (
                    <div
                      className="flex flex-col items-center justify-center rounded-xl px-2 py-1 flex-shrink-0"
                      style={{ background: '#E8E8E8', minWidth: 36 }}
                    >
                      <span className="text-[13px] font-black leading-none" style={{ color: '#757575' }}>{safeIndex + 1}</span>
                      <span className="text-[9px] font-semibold" style={{ color: '#AAAAAA' }}>מתוך {candidates.length}</span>
                    </div>
                  )}
                </div>

                {/* ETA banner — full width inside the card */}
                {selected.etaMinutes != null && (
                  <div
                    className="mt-3 rounded-xl px-3 py-2.5 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #009DE0, #2563EB)',
                      boxShadow: '0 4px 14px rgba(0,157,224,0.35)',
                    }}
                  >
                    <ClockIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.8)' }} />
                    <span className="text-white text-[14px] font-semibold text-center leading-tight">
                      השליח יכול להגיע לאסוף עוד{' '}
                      <span className="font-black text-[18px]">{selected.etaMinutes}</span>
                      {' '}דקות
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Carousel dots */}
            {candidates.length > 1 && (
              <div className="flex gap-1.5 mb-4 justify-center">
                {candidates.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className="h-2 rounded-full transition-all"
                    style={{ background: i === safeIndex ? BLUE : '#E8E8E8', width: i === safeIndex ? 24 : 8 }}
                  />
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 py-3.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#FFF0F0', color: '#E23437' }}
              >
                <XMarkIcon className="w-4 h-4" />
                דחה שליח
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
  accepted:  'שליח קיבל את ההזמנה — בדרך לאיסוף',
  picked_up: 'החבילה נאספה — השליח בדרך אליך!',
  delivered: 'המשלוח נמסר בהצלחה!',
  cancelled: 'המשלוח בוטל',
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
                <MagnifyingGlass size={15} /> חפש שליח אחר
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
                <Trash size={15} /> בטל ומחק את המשלוח
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
  const [availableCourierCount, setAvailableCourierCount] = useState(0);
  const [reviews,    setReviews]    = useState<{rating:number}[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [yearCount,  setYearCount]  = useState(0);
  const [dismissedFromDash, setDismissedFromDash] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!businessId) return;
    const load = async () => {
      await syncDeliveriesDown().catch(() => {});
      const d   = getDeliveriesByBusiness(businessId);
      const biz = getBusiness(businessId);
      setDeliveries(d);
      setBalance(biz?.balance ?? 0);
      if (biz?.businessName) setBizName(biz.businessName);
      // Delivery counts by period
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const yearStart  = new Date(now.getFullYear(), 0, 1).toISOString();
      setTodayCount(d.filter(x => x.status === 'delivered' && (x.deliveredAt ?? x.createdAt) >= todayStart).length);
      setMonthCount(d.filter(x => x.status === 'delivered' && (x.deliveredAt ?? x.createdAt) >= monthStart).length);
      setYearCount(d.filter(x => x.status === 'delivered' && (x.deliveredAt ?? x.createdAt) >= yearStart).length);
      // Reviews
      setReviews(getReviewsByTarget(businessId).map(r => ({ rating: r.rating })));
      // Available couriers
      setAvailableCourierCount(getCouriers().filter(c => c.isActive && !c.isBlocked && c.isAvailable !== false).length);

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

  // ── Refresh available couriers count every 8s ──────────────────────────────
  useEffect(() => {
    const count = () => {
      setAvailableCourierCount(getCouriers().filter(c => c.isActive && !c.isBlocked && c.isAvailable !== false).length);
    };
    const id = setInterval(count, 8_000);
    return () => clearInterval(id);
  }, []);

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
          toast.success('שליח הצטרף לתור!');
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
          toast.success('שליח אישר את המשלוח!');
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
        toast.success(`משלוח מתוזמן שוחרר — מחפש שליח`, { duration: 5000 });
      }
      if (ready.length > 0) setDeliveries(getDeliveriesByBusiness(businessId));
    };
    releaseScheduled();
    const id = setInterval(releaseScheduled, 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const activeDeliveryBanner = getActiveDeliveryForBusiness(businessId);
  const displayName = bizName || user?.name || 'עסק';
  const greeting = getGreeting();
  const pendingCount = deliveries.filter(d => d.status === 'pending').length;
  const scheduledCount = deliveries.filter(d => d.status === 'scheduled').length;
  const activeCount = deliveries.filter(d => ['pending','accepted','picked_up'].includes(d.status)).length;
  const doneCount = deliveries.filter(d => d.status === 'delivered').length;
  const todayDeliveries = deliveries
    .filter(d => {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      return new Date(d.createdAt) >= todayStart;
    })
    .sort((a,b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="w-full max-w-lg mx-auto" dir="rtl">

      {/* ── Compact Hero ── */}
      <div
        className="px-5 pt-5 pb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 55%, #009DE0 100%)' }}
      >
        <div className="absolute -left-6 -top-6 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* Greeting row */}
        <div className="relative z-10 mb-3">
          <p className="text-white/70 text-[12px] font-medium">{greeting},</p>
          <h1 className="text-white text-[20px] font-black leading-tight">{displayName}</h1>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-3 relative z-10">
          <span className="text-white/75 text-[11px]">היום <strong className="text-white">{todayCount}</strong></span>
          <span className="text-white/30">·</span>
          <span className="text-white/75 text-[11px]">חודש <strong className="text-white">{monthCount}</strong></span>
          <span className="text-white/30">·</span>
          <span className="text-white/75 text-[11px]">שנה <strong className="text-white">{yearCount}</strong></span>
        </div>

        {/* Quick status chips row */}
        <div className="flex gap-2 mb-3 relative z-10">
          {[
            { label: 'פעילים',  count: activeCount,    color: '#F97316', bg: 'rgba(249,115,22,0.2)',   path: '/business/deliveries?filter=active' },
            { label: 'המתנה',   count: pendingCount,   color: '#009DE0', bg: 'rgba(0,157,224,0.2)',    path: '/business/deliveries?filter=pending' },
            { label: 'מתוזמן',  count: scheduledCount, color: '#A78BFA', bg: 'rgba(167,139,250,0.2)', path: '/business/deliveries?filter=scheduled' },
          ].map(chip => (
            <button
              key={chip.label}
              onClick={() => navigate(chip.path)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
              style={{ background: chip.bg, border: `1px solid ${chip.color}40`, color: '#fff' }}
            >
              <span className="font-black text-[13px]">{chip.count}</span>
              {chip.label}
            </button>
          ))}
        </div>

        {/* New delivery CTA */}
        <button
          onClick={() => navigate('/business/new-delivery')}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all active:scale-[0.98] relative z-10"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.28)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', boxShadow: '0 4px 10px rgba(249,115,22,0.4)' }}
          >
            <PlusIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-white font-black text-[15px] leading-tight">הקמת משלוח חדש</p>
            <p className="text-white/65 text-[11px]">
              {availableCourierCount > 0
                ? `${availableCourierCount} שליחים זמינים באיזורך`
                : 'שליח יאסוף תוך דקות'}
            </p>
          </div>
          <ChevronLeftIcon className="w-4 h-4 text-white/60 flex-shrink-0" />
        </button>

        {/* Support chat */}
        <button
          onClick={() => navigate('/business/chat?support=1')}
          className="mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold relative z-10 transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
        >
          <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
          צ׳אט תמיכה
        </button>
      </div>

      <div className="px-4 space-y-3 py-4">

        {/* ── Stats row (compact) ── */}
        <div
          className="grid grid-cols-3 gap-2 rounded-2xl p-3"
          style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
        >
          {[
            { label: 'סה"כ',   value: deliveries.length, color: '#1E40AF', bg: '#EFF6FF', path: '/business/deliveries' },
            { label: 'פעילים', value: activeCount,        color: '#F97316', bg: '#FFF7ED', path: '/business/deliveries?filter=active' },
            { label: 'הושלמו', value: doneCount,          color: '#059669', bg: '#ECFDF5', path: '/business/deliveries?filter=delivered' },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => navigate(s.path)}
              className="text-center rounded-xl py-2.5 transition-all active:scale-95"
              style={{ background: s.bg }}
            >
              <p className="text-[20px] font-black leading-tight" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: s.color + 'BB' }}>{s.label}</p>
            </button>
          ))}
        </div>

        {/* ── Active delivery banner ── */}
        {activeDeliveryBanner && (
          <div
            className="rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border: '1.5px solid rgba(37,99,235,0.18)' }}
            onClick={() => {
              if (activeDeliveryBanner.courierId) {
                const conv = getOrCreateConversation(businessId, activeDeliveryBanner.courierId);
                navigate(`/business/chat?convId=${conv.id}&deliveryId=${activeDeliveryBanner.id}`);
              }
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0" style={{ background: activeDeliveryBanner.status === 'picked_up' ? '#F97316' : '#2563EB' }} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black" style={{ color: '#1E40AF' }}>
                {activeDeliveryBanner.status === 'accepted' ? 'שליח בדרך לאיסוף' : 'החבילה בדרך'}
              </p>
              <p className="text-[11px] truncate" style={{ color: '#6B7280' }}>{activeDeliveryBanner.courierName} · {activeDeliveryBanner.dropAddress}</p>
            </div>
            <span className="text-[11px] font-bold flex-shrink-0" style={{ color: '#2563EB' }}>פתח צ׳אט ›</span>
          </div>
        )}

        {/* ── Today's deliveries ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[15px] font-black" style={{ color: '#202125' }}>משלוחים היום</h2>
            {deliveries.length > 0 && (
              <button onClick={() => navigate('/business/deliveries')} className="text-[12px] font-bold" style={{ color: '#2563EB' }}>הכל ›</button>
            )}
          </div>

          {todayDeliveries.filter(d => !dismissedFromDash.has(d.id)).length === 0 ? (
            <div
              className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
              style={{ background: '#FFFFFF', border: '1px solid #E8E8E8' }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                <TruckIcon className="w-6 h-6" style={{ color: '#2563EB' }} />
              </div>
              <p className="font-bold text-[14px]" style={{ color: '#202125' }}>אין משלוחים עדיין</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayDeliveries
                .filter(d => !dismissedFromDash.has(d.id))
                .map(d => {
                  const sc = STATUS_COLOR[d.status];
                  const isTrackable = ['pending','accepted','picked_up'].includes(d.status);
                  return (
                    <div
                      key={d.id}
                      className="rounded-2xl p-3 transition-all"
                      style={{ background: '#FFFFFF', border: `1.5px solid ${isTrackable ? '#2563EB20' : '#E8E8E8'}` }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>
                          {STATUS_LABEL[d.status]}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black" style={{ color: '#F97316' }}>₪{d.price}</span>
                          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                            {new Date(d.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => setDismissedFromDash(prev => new Set([...prev, d.id]))}
                            className="p-1 rounded-lg transition-all active:scale-95"
                            style={{ color: '#9CA3AF' }}
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[12px] font-semibold truncate" style={{ color: '#202125' }}>{d.dropAddress}</p>
                      {d.courierName && (
                        <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>שליח: {d.courierName}</p>
                      )}
                      {isTrackable && (
                        <button
                          onClick={() => setSearchParams({ tracking: d.id })}
                          className="mt-2 w-full py-1.5 rounded-xl text-[12px] font-bold transition-all active:scale-95"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          עקוב ›
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

      </div>

      {/* ── Live tracking / candidate review sheet ── */}
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
