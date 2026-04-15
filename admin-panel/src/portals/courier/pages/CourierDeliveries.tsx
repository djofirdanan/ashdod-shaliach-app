import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getDeliveriesByCourier,
  getDeliveries,
  updateDelivery,
  getOrCreateConversation,
  type StoredDelivery,
} from '../../../services/storage.service';
import { withdrawFromQueue } from '../../../services/sync.service';
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
const GREEN  = '#1BA672';
const ORANGE = '#F58F1F';
const RED    = '#E23437';
const TEXT   = '#202125';
const TEXT2  = '#757575';

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

// ─── DeliveryActionSheet ─────────────────────────────────────────
interface ActionSheetProps {
  delivery: StoredDelivery | null;
  updating: string | null;
  onClose: () => void;
  onStatusUpdate: (d: StoredDelivery, s: 'picked_up' | 'delivered') => void;
  onOpenChat: (d: StoredDelivery) => void;
}

const STEPS = [
  { key: 'accepted',  label: 'קיבלת את המשלוח', Icon: TruckIcon,      color: BLUE   },
  { key: 'picked_up', label: 'אספת את החבילה',  Icon: ArchiveBoxIcon, color: ORANGE },
  { key: 'delivered', label: 'נמסר ללקוח',       Icon: CheckIcon,      color: GREEN  },
] as const;

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
  updating,
  onClose,
  onStatusUpdate,
  onOpenChat,
}) => {
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

        <div className="px-5 pb-8 space-y-4">
          {/* ── Timeline ── */}
          <div
            className="rounded-2xl p-4"
            style={{ background: '#F8F8F8', border: '1px solid #E8E8E8' }}
          >
            {STEPS.map((step, idx) => {
              const done    = stepDone(d.status, step.key);
              const current = isCurrent(d.status, step.key);
              const { Icon, color, label } = step;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  {/* Circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: done ? color : '#E8E8E8',
                        boxShadow: current ? `0 0 0 4px ${color}30` : undefined,
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: done ? '#FFFFFF' : '#AAAAAA' }}
                      />
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className="w-0.5 my-1"
                        style={{
                          height: 20,
                          background: done && !current ? color : '#E8E8E8',
                        }}
                      />
                    )}
                  </div>
                  {/* Label */}
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: done ? TEXT : TEXT2 }}
                  >
                    {label}
                  </p>
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

  const load = () => {
    if (!courierId) return;
    const d = getDeliveriesByCourier(courierId);
    setDeliveries(d.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  };

  useEffect(() => { load(); }, [courierId]);

  interface CandidacyInfo {
    deliveryId: string;
    notifId: string;
    joinedAt: string;
    delivery: StoredDelivery | null;
  }
  const [candidacyInfo, setCandidacyInfo] = useState<CandidacyInfo | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    const check = () => {
      const raw = localStorage.getItem('pending_candidacy');
      if (!raw) { setCandidacyInfo(null); return; }
      try {
        const p: { deliveryId: string; notifId: string; joinedAt?: string } = JSON.parse(raw);
        const allDel = getDeliveries();
        const delivery = allDel.find(d => d.id === p.deliveryId) ?? null;
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
  }, []);

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
        className="flex mb-4"
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
            className="flex-1 py-2.5 text-[13px] font-bold transition-all flex items-center justify-center gap-1.5"
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
                {/* Status + price */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: statusColor[d.status] + '18', color: statusColor[d.status] }}
                  >
                    {statusLabel[d.status]}
                  </span>
                  <span className="text-[14px] font-black" style={{ color: BLUE }}>₪{d.price}</span>
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
        updating={updating}
        onClose={() => setActiveSheet(null)}
        onStatusUpdate={handleStatusUpdate}
        onOpenChat={handleOpenChat}
      />
    </div>
  );
};

export default CourierDeliveries;
