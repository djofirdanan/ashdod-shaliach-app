import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDeliveriesByBusiness,
  getBusiness,
  addDeliveryNotification,
  updateDelivery,
  deleteDelivery,
  type StoredDelivery,
} from '../../../services/storage.service';
import {
  TruckIcon,
  PlusCircleIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  CalendarDaysIcon,
  ClockIcon,
  BoltIcon,
  MapPinIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const BLUE  = '#009DE0';
const GREEN = '#1BA672';
const RED   = '#E23437';

type Tab = 'active' | 'scheduled' | 'completed' | 'archived' | 'all';

const statusLabel: Record<StoredDelivery['status'], string> = {
  scheduled: '📅 מתוזמן',
  pending:   'ממתין לשליח',
  accepted:  'שליח בדרך לאיסוף',
  picked_up: 'בדרך ללקוח',
  delivered: 'נמסר ✓',
  cancelled: 'בוטל',
};

const statusColor: Record<StoredDelivery['status'], string> = {
  scheduled: BLUE,
  pending:   '#757575',
  accepted:  BLUE,
  picked_up: '#F58F1F',
  delivered: GREEN,
  cancelled: RED,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Swipe-to-archive helper ──────────────────────────────────────────────────
const SwipeToArchive: React.FC<{ onArchive: () => void; children: React.ReactNode }> = ({
  onArchive, children,
}) => {
  const startX   = useRef(0);
  const [swipeX, setSwipeX] = useState(0);
  const THRESHOLD = 70;

  const progress = Math.min(swipeX / THRESHOLD, 1);

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onTouchStart={e => { startX.current = e.touches[0].clientX; }}
      onTouchMove={e => {
        const dx = e.touches[0].clientX - startX.current;
        if (dx > 0) setSwipeX(Math.min(dx, THRESHOLD + 30));
      }}
      onTouchEnd={() => {
        if (swipeX >= THRESHOLD) onArchive();
        setSwipeX(0);
      }}
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
      <div style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s ease' : undefined }}>
        {children}
      </div>
    </div>
  );
};

// ─── Edit bottom sheet ────────────────────────────────────────────────────────
interface EditSheetProps {
  delivery: StoredDelivery | null;
  onClose: () => void;
  onSave: (id: string, data: Partial<StoredDelivery>) => void;
}

const EditSheet: React.FC<EditSheetProps> = ({ delivery, onClose, onSave }) => {
  const [dropAddress,    setDropAddress]    = useState('');
  const [price,          setPrice]          = useState('');
  const [description,    setDescription]    = useState('');
  const [paymentMethod,  setPaymentMethod]  = useState<'cash' | 'bit'>('cash');
  const [customerPaid,   setCustomerPaid]   = useState(false);
  const [scheduledAt,    setScheduledAt]    = useState('');
  const [isScheduled,    setIsScheduled]    = useState(false);

  useEffect(() => {
    if (delivery) {
      setDropAddress(delivery.dropAddress ?? '');
      setPrice(String(delivery.price ?? ''));
      setDescription(delivery.description ?? '');
      setPaymentMethod(delivery.paymentMethod ?? 'cash');
      setCustomerPaid(delivery.customerPaid ?? false);
      setIsScheduled(!!delivery.scheduledAt);
      setScheduledAt(delivery.scheduledAt
        ? new Date(delivery.scheduledAt).toISOString().slice(0, 16)
        : '');
    }
  }, [delivery]);

  if (!delivery) return null;

  const handleSave = () => {
    if (!dropAddress.trim()) return toast.error('כתובת מסירה חסרה');
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) return toast.error('מחיר לא תקין');

    const updates: Partial<StoredDelivery> = {
      dropAddress:   dropAddress.trim(),
      price:         numPrice,
      description:   description.trim() || undefined,
      paymentMethod,
      customerPaid,
      scheduledAt:   isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
    };
    onSave(delivery.id, updates);
  };

  const InputLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-[12px] font-bold mb-1" style={{ color: '#757575' }}>{children}</p>
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-5 pt-2 pb-8"
        style={{ background: '#fff', maxHeight: '85vh', overflowY: 'auto' }}
        dir="rtl"
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto my-4" style={{ background: '#E8E8E8' }} />

        {/* Title */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[18px] font-black" style={{ color: '#202125' }}>עריכת משלוח</h2>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5" style={{ color: '#757575' }} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Drop address */}
          <div>
            <InputLabel>כתובת מסירה ללקוח</InputLabel>
            <input
              className="w-full px-4 py-3 rounded-xl text-[14px] outline-none"
              style={{ border: '1.5px solid #E8E8E8', background: '#FAFAFA' }}
              value={dropAddress}
              onChange={e => setDropAddress(e.target.value)}
              placeholder="רחוב, מספר, עיר"
            />
          </div>

          {/* Price */}
          <div>
            <InputLabel>מחיר (₪)</InputLabel>
            <input
              type="number"
              className="w-full px-4 py-3 rounded-xl text-[14px] outline-none"
              style={{ border: '1.5px solid #E8E8E8', background: '#FAFAFA' }}
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              min={0}
            />
          </div>

          {/* Description */}
          <div>
            <InputLabel>הערות למשלוח (אופציונלי)</InputLabel>
            <textarea
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-[14px] outline-none resize-none"
              style={{ border: '1.5px solid #E8E8E8', background: '#FAFAFA' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="הוראות מיוחדות, קוד כניסה..."
            />
          </div>

          {/* Payment method */}
          <div>
            <InputLabel>אמצעי תשלום לשליח</InputLabel>
            <div className="grid grid-cols-2 gap-2">
              {(['cash', 'bit'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className="py-2.5 rounded-xl text-[13px] font-bold transition-all"
                  style={{
                    background: paymentMethod === m ? BLUE : '#F4F4F4',
                    color:      paymentMethod === m ? '#fff' : '#757575',
                  }}
                >
                  {m === 'cash' ? '💵 מזומן' : '📱 ביט'}
                </button>
              ))}
            </div>
          </div>

          {/* Customer paid toggle */}
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-[14px] font-bold" style={{ color: '#202125' }}>הלקוח שילם מראש</p>
              <p className="text-[11px]" style={{ color: '#757575' }}>
                {customerPaid ? 'לא צריך לגבות' : 'השליח יגבה מהלקוח'}
              </p>
            </div>
            <button
              onClick={() => setCustomerPaid(v => !v)}
              className="relative rounded-full transition-all flex-shrink-0"
              style={{ width: 48, height: 26, background: customerPaid ? GREEN : '#CCCCCC' }}
            >
              <span
                className="absolute top-0.5 rounded-full transition-all"
                style={{
                  width: 22, height: 22,
                  background: '#fff',
                  left: customerPaid ? '22px' : '2px',
                }}
              />
            </button>
          </div>

          {/* Schedule toggle */}
          {delivery.status === 'scheduled' || delivery.status === 'pending' ? (
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <div>
                  <p className="text-[14px] font-bold" style={{ color: '#202125' }}>תזמן לשעה מסוימת</p>
                </div>
                <button
                  onClick={() => setIsScheduled(v => !v)}
                  className="relative rounded-full transition-all flex-shrink-0"
                  style={{ width: 48, height: 26, background: isScheduled ? BLUE : '#CCCCCC' }}
                >
                  <span
                    className="absolute top-0.5 rounded-full transition-all"
                    style={{
                      width: 22, height: 22,
                      background: '#fff',
                      left: isScheduled ? '22px' : '2px',
                    }}
                  />
                </button>
              </div>
              {isScheduled && (
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 rounded-xl text-[14px] outline-none"
                  style={{ border: `1.5px solid ${BLUE}`, background: '#EAF7FD' }}
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                />
              )}
            </div>
          ) : null}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full mt-6 py-4 rounded-2xl text-white font-black text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{ background: BLUE, boxShadow: `0 6px 20px ${BLUE}40` }}
        >
          <CheckIcon className="w-5 h-5" />
          שמור שינויים
        </button>
      </div>
    </div>
  );
};

// ─── Delete confirmation sheet ────────────────────────────────────────────────
const DeleteConfirmSheet: React.FC<{
  delivery: StoredDelivery | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}> = ({ delivery, onClose, onConfirm }) => {
  if (!delivery) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-5 pt-2 pb-8"
        style={{ background: '#fff' }}
        dir="rtl"
      >
        <div className="w-10 h-1 rounded-full mx-auto my-4" style={{ background: '#E8E8E8' }} />

        <div className="flex items-start gap-4 mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#FFF0F0' }}
          >
            <TrashIcon className="w-6 h-6" style={{ color: RED }} />
          </div>
          <div>
            <h3 className="text-[17px] font-black" style={{ color: '#202125' }}>מחיקת משלוח</h3>
            <p className="text-[13px] mt-0.5" style={{ color: '#757575' }}>
              האם למחוק את המשלוח ל-{delivery.dropAddress}? לא ניתן לשחזר.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl font-bold text-[14px]"
            style={{ background: '#F4F4F4', color: '#757575' }}
          >
            ביטול
          </button>
          <button
            onClick={() => onConfirm(delivery.id)}
            className="flex-1 py-3.5 rounded-2xl font-bold text-[14px] text-white"
            style={{ background: RED }}
          >
            מחק משלוח
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Countdown helper ────────────────────────────────────────────────────────
function useCountdown(targetIso: string | undefined): string {
  const [label, setLabel] = React.useState('');
  React.useEffect(() => {
    if (!targetIso) { setLabel(''); return; }
    const calc = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) { setLabel('עכשיו'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      if (h >= 24) {
        const d = Math.floor(h / 24);
        setLabel(`בעוד ${d} ${d === 1 ? 'יום' : 'ימים'}`);
      } else if (h > 0) {
        setLabel(`בעוד ${h} שע׳ ${m} דק׳`);
      } else {
        setLabel(`בעוד ${m} דק׳`);
      }
    };
    calc();
    const id = setInterval(calc, 30_000);
    return () => clearInterval(id);
  }, [targetIso]);
  return label;
}

// ─── Scheduled delivery card ─────────────────────────────────────────────────
const ScheduledCard: React.FC<{
  delivery: StoredDelivery;
  onEdit:    (d: StoredDelivery) => void;
  onDelete:  (d: StoredDelivery) => void;
  onSendNow: (d: StoredDelivery) => void;
}> = ({ delivery: d, onEdit, onDelete, onSendNow }) => {
  const countdown = useCountdown(d.scheduledAt);
  const isPast    = d.scheduledAt ? new Date(d.scheduledAt) < new Date() : false;

  const schedDate = d.scheduledAt
    ? new Date(d.scheduledAt).toLocaleString('he-IL', {
        weekday: 'long', day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#FFFFFF', border: `1.5px solid ${isPast ? '#E23437' : BLUE}20`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* Colored top strip */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: isPast ? '#FFF0F0' : '#EAF7FD', borderBottom: `1px solid ${isPast ? '#E23437' : BLUE}20` }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isPast ? '#E23437' : BLUE }}
        >
          <CalendarDaysIcon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-black leading-tight" style={{ color: '#202125' }}>
            {schedDate}
          </p>
          <p
            className="text-[11px] font-bold mt-0.5"
            style={{ color: isPast ? '#E23437' : BLUE }}
          >
            {isPast ? 'פג תוקף — שלח עכשיו' : countdown}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {/* Route */}
        <div className="flex items-start gap-2">
          <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
          <div className="min-w-0">
            <p className="text-[10px]" style={{ color: '#AAAAAA' }}>איסוף</p>
            <p className="text-[13px] font-semibold truncate" style={{ color: '#202125' }}>{d.pickupAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: RED }} />
          <div className="min-w-0">
            <p className="text-[10px]" style={{ color: '#AAAAAA' }}>מסירה</p>
            <p className="text-[13px] font-semibold truncate" style={{ color: '#202125' }}>{d.dropAddress}</p>
          </div>
        </div>
        {d.description && (
          <p className="text-[11px] pr-6" style={{ color: '#757575' }}>{d.description}</p>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderTop: '1px solid #F4F4F4' }}
      >
        <div className="flex items-center gap-1.5">
          <BanknotesIcon className="w-4 h-4" style={{ color: BLUE }} />
          <span className="text-[15px] font-black" style={{ color: BLUE }}>₪{d.price}</span>
          {d.paymentMethod && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold mr-1" style={{ background: '#F4F4F4', color: '#757575' }}>
              {d.paymentMethod === 'cash' ? 'מזומן' : 'ביט'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Edit */}
          <button
            onClick={() => onEdit(d)}
            className="p-2 rounded-xl transition-all active:scale-95"
            style={{ background: '#FFF8E6', color: '#F58F1F' }}
            title="ערוך"
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(d)}
            className="p-2 rounded-xl transition-all active:scale-95"
            style={{ background: '#FFF0F0', color: RED }}
            title="מחק"
          >
            <TrashIcon className="w-4 h-4" />
          </button>

          {/* Send now */}
          <button
            onClick={() => onSendNow(d)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-black text-white transition-all active:scale-95"
            style={{ background: isPast ? RED : GREEN, boxShadow: `0 3px 10px ${isPast ? RED : GREEN}40` }}
          >
            <BoltIcon className="w-3.5 h-3.5" />
            שלח עכשיו
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const BusinessDeliveries: React.FC = () => {
  const navigate  = useNavigate();
  const token     = localStorage.getItem('admin_token') ?? '';
  const businessId = token.startsWith('business-') ? token.replace('business-', '') : '';

  const [deliveries, setDeliveries] = useState<StoredDelivery[]>([]);
  const [tab,        setTab]        = useState<Tab>('active');
  const [resending,  setResending]  = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<StoredDelivery | null>(null);
  const [delTarget,  setDelTarget]  = useState<StoredDelivery | null>(null);

  const load = () => {
    if (!businessId) return;
    setDeliveries(
      getDeliveriesByBusiness(businessId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
  };

  useEffect(load, [businessId]);

  const handleResend = (d: StoredDelivery) => {
    setResending(d.id);
    const biz = getBusiness(businessId);
    addDeliveryNotification({
      businessId,
      businessName: biz?.businessName ?? 'עסק',
      pickupAddress: d.pickupAddress,
      dropAddress: d.dropAddress,
      description: d.description,
      price: d.price,
      requiredVehicle: d.requiredVehicle,
      paymentMethod: d.paymentMethod,
      customerPaid: d.customerPaid,
    });
    toast.success('קריאה חדשה נשלחה לשליחים!');
    setResending(null);
  };

  const handleArchive   = (id: string) => { updateDelivery(id, { archived: true });  toast.success('הועבר לארכיון');     load(); };
  const handleUnarchive = (id: string) => { updateDelivery(id, { archived: false }); toast.success('הוחזר מהארכיון');   load(); };

  const handleSendNow = (d: StoredDelivery) => {
    const biz = getBusiness(businessId);
    updateDelivery(d.id, { status: 'pending', scheduledAt: undefined });
    addDeliveryNotification({
      deliveryId:    d.id,
      businessId,
      businessName:  biz?.businessName ?? 'עסק',
      pickupAddress: d.pickupAddress,
      dropAddress:   d.dropAddress,
      description:   d.description,
      price:         d.price,
      requiredVehicle: d.requiredVehicle,
      paymentMethod: d.paymentMethod,
      customerPaid:  d.customerPaid,
    });
    toast.success('המשלוח נשלח לשליחים עכשיו!');
    load();
  };

  const handleSaveEdit = (id: string, data: Partial<StoredDelivery>) => {
    try {
      // Update scheduledAt → change status accordingly
      const updates: Partial<StoredDelivery> = { ...data };
      if (data.scheduledAt) {
        updates.status = 'scheduled';
      } else if (deliveries.find(d => d.id === id)?.status === 'scheduled') {
        updates.status = 'pending';
      }
      updateDelivery(id, updates);
      toast.success('המשלוח עודכן');
      setEditTarget(null);
      load();
    } catch {
      toast.error('שגיאה בשמירה');
    }
  };

  const handleDelete = (id: string) => {
    deleteDelivery(id);
    toast.success('המשלוח נמחק');
    setDelTarget(null);
    load();
  };

  const filtered = deliveries.filter(d => {
    if (tab === 'scheduled') return d.status === 'scheduled' && !d.archived;
    if (tab === 'active')    return ['pending', 'accepted', 'picked_up'].includes(d.status) && !d.archived;
    if (tab === 'completed') return ['delivered', 'cancelled'].includes(d.status) && !d.archived;
    if (tab === 'archived')  return d.archived === true;
    if (tab === 'all')       return !d.archived;
    return false;
  });

  const scheduledCount = deliveries.filter(d => d.status === 'scheduled' && !d.archived).length;
  const archivedCount  = deliveries.filter(d => d.archived).length;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'scheduled', label: 'מתוזמנים' },
    { id: 'active',    label: 'פעילים'   },
    { id: 'completed', label: 'הושלמו'   },
    { id: 'archived',  label: 'ארכיון'   },
    { id: 'all',       label: 'הכל'      },
  ];

  const canEdit   = (d: StoredDelivery) => ['pending', 'scheduled'].includes(d.status) && !d.archived;
  const canDelete = (d: StoredDelivery) => ['pending', 'scheduled', 'cancelled'].includes(d.status);
  const canResend = (d: StoredDelivery) => ['pending', 'scheduled'].includes(d.status);

  return (
    <div className="max-w-lg mx-auto px-4 py-5" style={{ background: '#F4F4F4', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-black" style={{ color: '#202125' }}>המשלוחים שלי</h1>
        <button
          onClick={() => navigate('/business/new-delivery')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[12px] font-bold transition-all active:scale-95"
          style={{ background: BLUE, boxShadow: `0 3px 10px ${BLUE}30` }}
        >
          <PlusCircleIcon className="w-4 h-4" />
          חדש
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex mb-4"
        style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E8E8E8', overflow: 'hidden' }}
      >
        {tabs.map((t, i) => {
          const badge =
            t.id === 'scheduled' && scheduledCount > 0 ? scheduledCount :
            t.id === 'archived'  && archivedCount  > 0 ? archivedCount  : null;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
              style={{
                background:  tab === t.id ? BLUE : '#FFFFFF',
                color:       tab === t.id ? '#FFFFFF' : '#757575',
                borderRight: i < tabs.length - 1 ? '1px solid #E8E8E8' : 'none',
              }}
            >
              {t.label}
              {badge !== null && (
                <span
                  className="text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center"
                  style={{
                    background: tab === t.id ? 'rgba(255,255,255,0.3)' : (t.id === 'scheduled' ? BLUE : RED),
                    color: '#FFFFFF',
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'scheduled' && scheduledCount > 0 && (
        <p className="text-[11px] mb-3 text-center" style={{ color: '#757575' }}>
          לחץ "שלח עכשיו" כדי לשגר משלוח מיידית לכל השליחים
        </p>
      )}
      {tab === 'completed' && (
        <p className="text-[11px] mb-3 text-center" style={{ color: '#757575' }}>
          החלק ימינה כדי להעביר לארכיון
        </p>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
          style={{ background: '#FFFFFF', border: '1px solid #E8E8E8' }}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#E6F6FC' }}>
            {tab === 'archived'
              ? <ArchiveBoxIcon className="w-7 h-7" style={{ color: BLUE }} />
              : <TruckIcon      className="w-7 h-7" style={{ color: BLUE }} />
            }
          </div>
          <p className="text-[14px] font-bold" style={{ color: '#202125' }}>
            {tab === 'scheduled' ? 'אין משלוחים מתוזמנים'
             : tab === 'active'    ? 'אין משלוחים פעילים'
             : tab === 'completed' ? 'אין משלוחים שהושלמו'
             : tab === 'archived'  ? 'הארכיון ריק'
             : 'אין משלוחים עדיין'}
          </p>
          {tab === 'scheduled' && (
            <button
              onClick={() => navigate('/business/new-delivery')}
              className="px-5 py-2.5 rounded-xl text-white font-bold text-[13px] transition-all active:scale-95 mt-1"
              style={{ background: BLUE }}
            >
              תזמן משלוח חדש
            </button>
          )}
        </div>
      ) : tab === 'scheduled' ? (
        /* ── Scheduled deliveries — special card layout ── */
        <div className="space-y-4">
          {filtered.map(d => (
            <ScheduledCard
              key={d.id}
              delivery={d}
              onEdit={setEditTarget}
              onDelete={setDelTarget}
              onSendNow={handleSendNow}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const color = statusColor[d.status];

            const card = (
              <div
                className="rounded-2xl p-4"
                style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
              >
                {/* Status + time */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: color + '18', color }}
                  >
                    {statusLabel[d.status]}
                  </span>
                  <span className="text-[11px]" style={{ color: '#757575' }}>{formatDate(d.createdAt)}</span>
                </div>

                {/* Addresses */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex gap-2 items-start">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                      style={{ background: GREEN }}
                    >א</div>
                    <p className="text-[13px]" style={{ color: '#202125' }}>{d.pickupAddress}</p>
                  </div>
                  <div className="w-px h-3 mr-2.5" style={{ background: '#E8E8E8' }} />
                  <div className="flex gap-2 items-start">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                      style={{ background: RED }}
                    >ב</div>
                    <p className="text-[13px]" style={{ color: '#202125' }}>{d.dropAddress}</p>
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {d.paymentMethod && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#F4F4F4', color: '#757575' }}>
                      {d.paymentMethod === 'cash' ? '💵 מזומן' : '📱 ביט'}
                    </span>
                  )}
                  {d.customerPaid !== undefined && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: d.customerPaid ? GREEN + '18' : '#F58F1F18',
                        color:      d.customerPaid ? GREEN : '#F58F1F',
                      }}
                    >
                      {d.customerPaid ? 'שולם' : 'לגבות'}
                    </span>
                  )}
                  {d.requiredVehicle && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#E6F6FC', color: BLUE }}>
                      {d.requiredVehicle === 'motorcycle' ? '🏍️' : d.requiredVehicle === 'bicycle' ? '🚲' : d.requiredVehicle === 'scooter' ? '🛵' : '🚗'}
                    </span>
                  )}
                  {d.courierName && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#F4F4F4', color: '#757575' }}>
                      🧑‍✈️ {d.courierName}
                    </span>
                  )}
                </div>

                {d.scheduledAt && d.status === 'scheduled' && (
                  <p className="text-[11px] font-bold mb-3" style={{ color: BLUE }}>
                    📅 {new Date(d.scheduledAt).toLocaleString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}

                {/* Footer: price + action buttons */}
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #E8E8E8' }}>
                  <span className="text-[15px] font-black" style={{ color: BLUE }}>₪{d.price}</span>

                  <div className="flex items-center gap-2">
                    {/* Resend */}
                    {canResend(d) && (
                      <button
                        onClick={() => handleResend(d)}
                        disabled={resending === d.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 disabled:opacity-60"
                        style={{ background: '#E6F6FC', color: BLUE }}
                        title="שלח שוב לשליחים"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        שלח שוב
                      </button>
                    )}

                    {/* Edit */}
                    {canEdit(d) && (
                      <button
                        onClick={() => setEditTarget(d)}
                        className="p-2 rounded-xl transition-all active:scale-95"
                        style={{ background: '#FFF8E6', color: '#F58F1F' }}
                        title="ערוך משלוח"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    )}

                    {/* Unarchive */}
                    {tab === 'archived' && (
                      <button
                        onClick={() => handleUnarchive(d.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95"
                        style={{ background: '#E6F6FC', color: BLUE }}
                      >
                        <ArchiveBoxIcon className="w-3.5 h-3.5" />
                        שחזר
                      </button>
                    )}

                    {/* Delete */}
                    {canDelete(d) && (
                      <button
                        onClick={() => setDelTarget(d)}
                        className="p-2 rounded-xl transition-all active:scale-95"
                        style={{ background: '#FFF0F0', color: RED }}
                        title="מחק משלוח"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );

            return tab === 'completed' ? (
              <SwipeToArchive key={d.id} onArchive={() => handleArchive(d.id)}>
                {card}
              </SwipeToArchive>
            ) : (
              <div key={d.id}>{card}</div>
            );
          })}
        </div>
      )}

      {/* Edit bottom sheet */}
      <EditSheet
        delivery={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
      />

      {/* Delete confirm sheet */}
      <DeleteConfirmSheet
        delivery={delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default BusinessDeliveries;
