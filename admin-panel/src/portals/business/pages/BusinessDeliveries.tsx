import React, { useEffect, useState, useRef } from 'react';
import { Calendar, Truck, CheckCircle, Package, MapPin as PhosphorMapPin, User as PhosphorUser, Megaphone, Timer } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import DeliveryMap from '../../../components/DeliveryMap';
import {
  getDeliveriesByBusiness,
  getBusiness,
  addDeliveryNotification,
  updateDelivery,
  deleteDelivery,
  republishDelivery,
  formatOrderNumber,
  type StoredDelivery,
} from '../../../services/storage.service';
import { syncDeliveriesDown } from '../../../services/sync.service';
import { supabase } from '../../../lib/supabase';
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
  UserIcon,
  CreditCardIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const BLUE  = '#009DE0';
const GREEN = '#1BA672';
const RED   = '#E23437';

type Tab = 'pending_approval' | 'active' | 'scheduled' | 'completed' | 'archived' | 'all';

const statusLabel: Record<StoredDelivery['status'], React.ReactNode> = {
  scheduled: <span className="flex items-center gap-1"><Calendar size={10} /> מתוזמן</span>,
  pending:   'ממתין לשליח',
  accepted:  <span className="flex items-center gap-1"><Truck size={10} /> שליח בדרך לאיסוף</span>,
  picked_up: 'בדרך ללקוח',
  delivered: <span className="flex items-center gap-1"><CheckCircle size={10} /> נמסר</span>,
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
                  {m === 'cash' ? 'מזומן' : 'ביט'}
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

// ─── Prep countdown hook ─────────────────────────────────────────────────────
function usePrepCountdown(prepReadyAt: string | undefined): { label: string; isPast: boolean; urgency: 'ok' | 'soon' | 'ready' } {
  const [state, setState] = React.useState({ label: '', isPast: false, urgency: 'ok' as 'ok' | 'soon' | 'ready' });
  React.useEffect(() => {
    if (!prepReadyAt) { setState({ label: '', isPast: false, urgency: 'ok' }); return; }
    const calc = () => {
      const diff = new Date(prepReadyAt).getTime() - Date.now();
      if (diff <= 0) {
        setState({ label: 'מוכן לאיסוף!', isPast: true, urgency: 'ready' });
        return;
      }
      const totalSec = Math.ceil(diff / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      const label = m > 0
        ? `${m}:${String(s).padStart(2, '0')} דק׳`
        : `0:${String(s).padStart(2, '0')} דק׳`;
      const urgency: 'ok' | 'soon' | 'ready' = m < 2 ? 'soon' : 'ok';
      setState({ label, isPast: false, urgency });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [prepReadyAt]);
  return state;
}

// ─── Prep time edit sheet ─────────────────────────────────────────────────────
const PREP_CHIPS = [5, 10, 15, 20, 25, 30];

const PrepTimeSheet: React.FC<{
  delivery: StoredDelivery;
  onClose: () => void;
  onSave: (deliveryId: string, prepMinutes: number) => void;
}> = ({ delivery, onClose, onSave }) => {
  const currentMins = delivery.prepMinutes ?? 15;
  const [selected, setSelected] = React.useState<number>(currentMins);
  const [custom, setCustom] = React.useState('');

  const activeMins = custom ? parseInt(custom) || selected : selected;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-5 pt-2 pb-8"
        style={{ background: '#fff', maxHeight: '80vh', overflowY: 'auto' }}
        dir="rtl"
      >
        <div className="w-10 h-1 rounded-full mx-auto my-4" style={{ background: '#E8E8E8' }} />

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFF8E6' }}>
            <Timer size={22} style={{ color: '#F58F1F' }} />
          </div>
          <div>
            <h2 className="text-[17px] font-black" style={{ color: '#202125' }}>עדכון זמן הכנה</h2>
            <p className="text-[11px] mt-0.5" style={{ color: '#757575' }}>השליח יקבל עדכון מיידי</p>
          </div>
          <button onClick={onClose} className="mr-auto p-2 rounded-xl" style={{ background: '#F4F4F4' }}>
            <XMarkIcon className="w-5 h-5" style={{ color: '#757575' }} />
          </button>
        </div>

        {/* Current prep time info */}
        {delivery.prepReadyAt && new Date(delivery.prepReadyAt) > new Date() && (
          <div className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3" style={{ background: '#EAF7FD', border: '1px solid #009DE020' }}>
            <ClockIcon className="w-5 h-5 flex-shrink-0" style={{ color: BLUE }} />
            <div>
              <p className="text-[12px] font-bold" style={{ color: BLUE }}>זמן הכנה נוכחי</p>
              <p className="text-[11px]" style={{ color: '#757575' }}>
                מוכן בשעה {new Date(delivery.prepReadyAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        )}

        {/* Chips */}
        <p className="text-[12px] font-bold mb-3" style={{ color: '#757575' }}>בחר זמן הכנה חדש</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PREP_CHIPS.map(m => {
            const sel = selected === m && !custom;
            return (
              <button
                key={m}
                onClick={() => { setSelected(m); setCustom(''); }}
                className="py-3 rounded-2xl font-black text-[14px] transition-all active:scale-95"
                style={{
                  border: `2px solid ${sel ? '#F58F1F' : '#E8E8E8'}`,
                  background: sel ? '#FFF8E6' : '#FAFAFA',
                  color: sel ? '#F58F1F' : '#202125',
                }}
              >
                {m} דק׳
              </button>
            );
          })}
        </div>

        {/* Custom input */}
        <div className="mb-5">
          <p className="text-[12px] font-bold mb-2" style={{ color: '#757575' }}>או הכנס ידנית</p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="מספר דקות..."
              value={custom}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                setCustom(v);
              }}
              className="flex-1 px-4 py-3 rounded-xl text-[14px] outline-none text-center font-bold"
              style={{ border: `1.5px solid ${custom ? '#F58F1F' : '#E8E8E8'}`, background: '#FAFAFA' }}
            />
            <span className="text-[13px] font-bold flex-shrink-0" style={{ color: '#757575' }}>דקות</span>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl px-4 py-3 mb-5 flex items-center justify-between" style={{ background: '#FFF8E6', border: '1px solid #F58F1F20' }}>
          <p className="text-[13px] font-bold" style={{ color: '#F58F1F' }}>ההזמנה תהיה מוכנה בעוד</p>
          <p className="text-[22px] font-black" style={{ color: '#F58F1F' }}>{activeMins} דק׳</p>
        </div>

        <button
          onClick={() => {
            if (!activeMins || activeMins < 1) return;
            onSave(delivery.id, activeMins);
          }}
          className="w-full py-4 rounded-2xl text-white font-black text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{ background: '#F58F1F', boxShadow: '0 6px 20px #F58F1F40' }}
        >
          <Timer size={18} />
          עדכן זמן הכנה
        </button>
      </div>
    </div>
  );
};

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

// ─── Business Delivery Tracking Sheet ────────────────────────────────────────
const BIZ_STEPS = [
  { key: 'accepted',  label: 'שליח קיבל הזמנה', Icon: TruckIcon,      color: '#009DE0' },
  { key: 'picked_up', label: 'חבילה נאספה',       Icon: ArchiveBoxIcon, color: '#F58F1F' },
  { key: 'delivered', label: 'נמסר ללקוח',         Icon: CheckIcon,      color: '#1BA672' },
] as const;

const BIZ_STATUS_ORDER = ['accepted', 'picked_up', 'delivered'] as const;

const BusinessDeliveryTrackingSheet: React.FC<{
  delivery: StoredDelivery;
  onClose: () => void;
  onUpdatePrepTime: (deliveryId: string, prepMinutes: number) => void;
}> = ({ delivery, onClose, onUpdatePrepTime }) => {
  const d = delivery;
  const isActive = d.status === 'accepted' || d.status === 'picked_up';
  const isDone = d.status === 'delivered' || d.status === 'cancelled';
  const [showPrepSheet, setShowPrepSheet] = React.useState(false);
  const prep = usePrepCountdown(d.prepReadyAt);

  function fmtTime(iso?: string) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }
  function bizStepDone(delStatus: StoredDelivery['status'], stepKey: string) {
    const di = BIZ_STATUS_ORDER.indexOf(delStatus as typeof BIZ_STATUS_ORDER[number]);
    const si = BIZ_STATUS_ORDER.indexOf(stepKey as typeof BIZ_STATUS_ORDER[number]);
    return si !== -1 && di >= si;
  }

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div dir="rtl" className="fixed bottom-0 right-0 left-0 z-50 rounded-t-3xl overflow-y-auto" style={{ background: '#fff', boxShadow: '0 -4px 30px rgba(0,0,0,0.18)', animation: 'slideUp 0.28s ease', maxHeight: '92vh' }}>
        {/* Handle + close */}
        <div className="sticky top-0 bg-white pt-4 px-5 pb-2 z-10">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full" style={{ background: '#E8E8E8' }} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[16px] font-black" style={{ color: '#202125' }}>מעקב משלוח</p>
              {d.courierName && (
                <p className="text-[12px] mt-0.5" style={{ color: '#757575' }}>
                  שליח: <span className="font-bold" style={{ color: '#202125' }}>{d.courierName}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: isDone ? '#1BA67218' : '#009DE018', color: isDone ? '#1BA672' : '#009DE0' }}>
                {d.status === 'accepted' ? 'בדרך לאיסוף' : d.status === 'picked_up' ? 'בדרך ללקוח' : d.status === 'delivered' ? 'נמסר ✓' : 'בוטל'}
              </span>
              <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F4F4F4' }}>
                <XMarkIcon className="w-5 h-5" style={{ color: '#757575' }} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 space-y-3">

          {/* ── Prep Time Banner (active deliveries only) ── */}
          {isActive && d.prepReadyAt && (
            <div
              className="rounded-2xl px-4 py-3 flex items-center justify-between"
              style={{
                background: prep.urgency === 'ready' ? '#ECFDF5' : prep.urgency === 'soon' ? '#FFF8E6' : '#EAF7FD',
                border: `1.5px solid ${prep.urgency === 'ready' ? '#1BA67230' : prep.urgency === 'soon' ? '#F58F1F30' : '#009DE025'}`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: prep.urgency === 'ready' ? '#1BA672' : prep.urgency === 'soon' ? '#F58F1F' : BLUE }}
                >
                  <Timer size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold" style={{ color: '#757575' }}>
                    {prep.urgency === 'ready' ? 'ההזמנה מוכנה!' : 'הכנת ההזמנה'}
                  </p>
                  <p
                    className="text-[20px] font-black tabular-nums leading-tight"
                    style={{ color: prep.urgency === 'ready' ? '#1BA672' : prep.urgency === 'soon' ? '#F58F1F' : BLUE }}
                  >
                    {prep.label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrepSheet(true)}
                className="px-3 py-2 rounded-xl font-bold text-[12px] transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.8)', color: '#F58F1F', border: '1px solid #F58F1F30' }}
              >
                שנה זמן
              </button>
            </div>
          )}
          {isActive && !d.prepReadyAt && d.status === 'accepted' && (
            <button
              onClick={() => setShowPrepSheet(true)}
              className="w-full rounded-2xl px-4 py-3 flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: '#FFF8E6', border: '1.5px dashed #F58F1F50', color: '#F58F1F' }}
            >
              <Timer size={16} />
              <span className="text-[13px] font-bold">הגדר זמן הכנה לשליח</span>
            </button>
          )}

          {/* Timeline */}
          <div className="rounded-2xl p-3" style={{ background: '#F8F8F8', border: '1px solid #E8E8E8' }}>
            {/* Created */}
            <div className="flex items-center gap-2.5 mb-0.5">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E8F8F0' }}>
                  <BellIcon className="w-4 h-4" style={{ color: '#1BA672' }} />
                </div>
                <div className="w-0.5 my-1" style={{ height: 16, background: '#1BA672' }} />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <p className="text-[12px] font-semibold" style={{ color: '#202125' }}>הזמנה נוצרה</p>
                <p className="text-[11px] font-bold" style={{ color: '#1BA672' }}>
                  {new Date(d.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            {BIZ_STEPS.map((step, idx) => {
              const done = bizStepDone(d.status, step.key);
              const current = d.status === step.key;
              const { Icon, color, label } = step;
              const ts = step.key === 'accepted' ? fmtTime(d.acceptedAt) : step.key === 'picked_up' ? fmtTime(d.pickedUpAt) : fmtTime(d.deliveredAt);
              return (
                <div key={step.key} className="flex items-center gap-2.5">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: done ? color : '#E8E8E8', boxShadow: current ? `0 0 0 4px ${color}30` : undefined }}>
                      <Icon className="w-4 h-4" style={{ color: done ? '#fff' : '#AAAAAA' }} />
                    </div>
                    {idx < BIZ_STEPS.length - 1 && (
                      <div className="w-0.5 my-1" style={{ height: 16, background: done && !current ? color : '#E8E8E8' }} />
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <p className="text-[12px] font-semibold" style={{ color: done ? '#202125' : '#757575' }}>{label}</p>
                    {done && ts && <p className="text-[11px] font-bold" style={{ color }}>{ts}</p>}
                    {current && !ts && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse" style={{ background: `${color}20`, color }}> עכשיו</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info card */}
          <div className="rounded-2xl p-3 space-y-2.5" style={{ background: '#F8F8F8', border: '1px solid #E8E8E8' }}>
            <div className="flex items-start gap-2.5">
              <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#1BA672' }} />
              <div>
                <p className="text-[10px] font-semibold" style={{ color: '#757575' }}>איסוף</p>
                <p className="text-[12px] font-medium" style={{ color: '#202125' }}>{d.pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#E23437' }} />
              <div>
                <p className="text-[10px] font-semibold" style={{ color: '#757575' }}>מסירה</p>
                <p className="text-[12px] font-medium" style={{ color: '#202125' }}>{d.dropAddress}</p>
              </div>
            </div>
            {d.customerName && (
              <div className="flex items-center gap-2.5">
                <UserIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#757575' }} />
                <p className="text-[12px]" style={{ color: '#202125' }}>{d.customerName}</p>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <CreditCardIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#757575' }} />
              <p className="text-[12px] font-medium" style={{ color: '#202125' }}>
                ₪{d.price} · {d.paymentMethod === 'bit' ? 'ביט' : 'מזומן'}
                {' · '}
                <span style={{ color: d.customerPaid ? '#1BA672' : '#E23437' }}>
                  {d.customerPaid ? 'שולם' : 'לא שולם'}
                </span>
              </p>
            </div>
          </div>

          {/* Map */}
          {isActive && (
            <DeliveryMap pickupAddress={d.pickupAddress} dropAddress={d.dropAddress} height={200} />
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

      {/* Prep time edit sheet */}
      {showPrepSheet && (
        <PrepTimeSheet
          delivery={d}
          onClose={() => setShowPrepSheet(false)}
          onSave={(deliveryId, mins) => {
            onUpdatePrepTime(deliveryId, mins);
            setShowPrepSheet(false);
          }}
        />
      )}
    </>
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
  const [trackingSheet, setTrackingSheet] = useState<StoredDelivery | null>(null);

  const load = async () => {
    if (!businessId) return;
    // Always await so state is updated AFTER Supabase sync (fixes race condition
    // where background sync completed after setDeliveries was called with stale data)
    await syncDeliveriesDown().catch(() => {});
    const freshDeliveries = getDeliveriesByBusiness(businessId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setDeliveries(freshDeliveries);
    setTrackingSheet(prev => {
      if (!prev) return null;
      const fresh = freshDeliveries.find(x => x.id === prev.id);
      return fresh ?? prev;
    });
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // Realtime updates — fire immediately on any delivery change for this business
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`business_deliveries_${businessId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deliveries' },
        (payload) => {
          // Filter in JS (avoid RLS/filter issues with Supabase realtime)
          const row = payload.new as Record<string, unknown>;
          if (row.business_id === businessId) load();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  interface PendingApprovalDelivery extends StoredDelivery { candidateCount: number; }
  const [pendingApproval, setPendingApproval] = useState<PendingApprovalDelivery[]>([]);

  useEffect(() => {
    if (!businessId) return;
    const check = async () => {
      const pending = getDeliveriesByBusiness(businessId).filter(d => d.status === 'pending' && !d.archived);
      const results: PendingApprovalDelivery[] = [];
      for (const d of pending) {
        const { data } = await supabase
          .from('delivery_candidates')
          .select('id')
          .eq('delivery_id', d.id)
          .eq('status', 'waiting');
        if (data && data.length > 0) results.push({ ...d, candidateCount: data.length });
      }
      setPendingApproval(results);
    };
    check();
    const id = setInterval(check, 5_000);
    return () => clearInterval(id);
  }, [businessId]);

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

  const handleUpdatePrepTime = (deliveryId: string, prepMinutes: number) => {
    const prepReadyAt = new Date(Date.now() + prepMinutes * 60 * 1000).toISOString();
    updateDelivery(deliveryId, { prepMinutes, prepReadyAt });
    toast.success(`זמן הכנה עודכן: ${prepMinutes} דקות`, {
      style: { background: '#F58F1F', color: '#fff', fontWeight: 700, borderRadius: 14, direction: 'rtl' },
    });
    load();
  };

  const filtered = deliveries.filter(d => {
    if (tab === 'pending_approval') return false; // handled separately
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
    { id: 'pending_approval', label: 'לאישורי'   },
    { id: 'scheduled', label: 'מתוזמנים' },
    { id: 'active',    label: 'פעילים'   },
    { id: 'completed', label: 'הושלמו'   },
    { id: 'archived',  label: 'ארכיון'   },
    { id: 'all',       label: 'הכל'      },
  ];

  const handleRepublish = (d: StoredDelivery) => {
    republishDelivery(d.id);
    toast.success('המשלוח פורסם מחדש לכל השליחים הרלוונטיים!');
    load();
  };

  const canEdit      = (d: StoredDelivery) => ['pending', 'scheduled'].includes(d.status) && !d.archived;
  const canDelete    = (d: StoredDelivery) => ['pending', 'scheduled', 'cancelled'].includes(d.status);
  const canResend    = (d: StoredDelivery) => ['pending', 'scheduled'].includes(d.status);
  // Republish: delivery was previously taken by a courier but is now cancelled/reset
  const canRepublish = (d: StoredDelivery) =>
    (['accepted', 'cancelled'].includes(d.status) || (d.status === 'pending' && !!d.cancelledBy)) &&
    !d.archived;

  return (
    <div className="max-w-lg mx-auto px-4 py-5" style={{ background: '#F4F4F4', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[20px] font-black" style={{ color: '#202125' }}>המשלוחים שלי</h1>
          {filtered.length > 0 && (
            <span
              className="text-[11px] font-black px-2 py-0.5 rounded-full"
              style={{ background: BLUE + '18', color: BLUE }}
            >
              {tab === 'pending_approval' ? pendingApproval.length : filtered.length}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/business/new-delivery')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-white text-[13px] font-black transition-all duration-200 active:scale-95"
          style={{ background: `linear-gradient(135deg, ${BLUE}, #2563EB)`, boxShadow: `0 4px 14px ${BLUE}40` }}
        >
          <PlusCircleIcon className="w-4 h-4" />
          משלוח חדש
        </button>
      </div>
      {/* Divider below header */}
      <div className="mb-4 mt-3" style={{ height: 1, background: 'linear-gradient(90deg, #E8E8E8, transparent)' }} />

      {/* Tabs — pill-based scrollable bar */}
      <div
        className="flex mb-4 overflow-x-auto gap-1.5 pb-0.5"
        style={{
          background: '#F0F0F0',
          borderRadius: 14,
          padding: '4px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style>{`.tab-scroll::-webkit-scrollbar { display: none; }`}</style>
        {tabs.map((t) => {
          const isActive = tab === t.id;
          const badge =
            t.id === 'pending_approval' && pendingApproval.length > 0 ? pendingApproval.length :
            t.id === 'scheduled' && scheduledCount > 0 ? scheduledCount :
            t.id === 'archived'  && archivedCount  > 0 ? archivedCount  : null;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-shrink-0 flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-bold transition-all duration-200 rounded-[10px]"
              style={{
                background: isActive ? '#FFFFFF' : 'transparent',
                color:      isActive ? '#202125' : '#757575',
                boxShadow: isActive ? '0 1px 6px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.06)' : 'none',
                fontWeight: isActive ? 800 : 600,
              }}
            >
              {t.label}
              {badge !== null && (
                <span
                  className="text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none"
                  style={{
                    background: isActive
                      ? (t.id === 'pending_approval' ? '#E23437' : BLUE)
                      : (t.id === 'scheduled' ? BLUE + '22' : t.id === 'pending_approval' ? '#E2343722' : '#75757522'),
                    color: isActive
                      ? '#FFFFFF'
                      : (t.id === 'scheduled' ? BLUE : t.id === 'pending_approval' ? '#E23437' : '#757575'),
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
      {tab === 'pending_approval' ? (
        pendingApproval.length === 0 ? (
          <div className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center" style={{ background: '#FFFFFF', border: '1px solid #E8E8E8' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#E6F6FC' }}>
              <TruckIcon className="w-7 h-7" style={{ color: BLUE }} />
            </div>
            <p className="text-[14px] font-bold" style={{ color: '#202125' }}>אין שליחים שממתינים לאישורך</p>
            <p className="text-[12px]" style={{ color: '#757575' }}>כששליח יצטרף לתור משלוח שלך, הוא יופיע כאן</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingApproval.map(d => (
              <div key={d.id} className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: `2px solid ${BLUE}25`, boxShadow: `0 4px 16px ${BLUE}10` }}>
                {/* Blue header strip */}
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#EAF7FD', borderBottom: `1px solid ${BLUE}20` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BLUE }}>
                    <TruckIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-black" style={{ color: '#202125' }}>
                      {d.candidateCount === 1 ? 'שליח אחד ממתין לאישורך' : `${d.candidateCount} שליחים ממתינים לאישורך`}
                    </p>
                    <p className="text-[11px] font-semibold animate-pulse" style={{ color: BLUE }}>לחץ לצפייה ובחירה</p>
                  </div>
                  {/* candidate count badge */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-[16px] text-white" style={{ background: RED }}>
                    {d.candidateCount}
                  </div>
                </div>

                {/* Body */}
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
                    <p className="text-[13px] font-semibold truncate" style={{ color: '#202125' }}>{d.pickupAddress}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: RED }} />
                    <p className="text-[13px] font-semibold truncate" style={{ color: '#202125' }}>{d.dropAddress}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 pb-4">
                  <div className="flex items-center gap-1.5">
                    <BanknotesIcon className="w-4 h-4" style={{ color: BLUE }} />
                    <span className="text-[15px] font-black" style={{ color: BLUE }}>₪{d.price}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/business/dashboard?tracking=${d.id}`)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[13px] text-white transition-all active:scale-95"
                    style={{ background: BLUE, boxShadow: `0 4px 14px ${BLUE}40` }}
                  >
                    <CheckIcon className="w-4 h-4" />
                    אשר שליח עכשיו
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl p-10 flex flex-col items-center gap-4 text-center"
          style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: tab === 'archived' ? '#F4F4F4' : '#E6F6FC', boxShadow: `0 4px 16px ${tab === 'archived' ? '#75757520' : BLUE + '20'}` }}
          >
            {tab === 'archived'
              ? <ArchiveBoxIcon className="w-8 h-8" style={{ color: '#9CA3AF' }} />
              : tab === 'completed'
              ? <CheckCircle size={32} style={{ color: GREEN }} />
              : <TruckIcon className="w-8 h-8" style={{ color: BLUE }} />
            }
          </div>
          <div>
            <p className="text-[15px] font-black mb-1" style={{ color: '#202125' }}>
              {tab === 'scheduled' ? 'אין משלוחים מתוזמנים'
               : tab === 'active'    ? 'אין משלוחים פעילים כרגע'
               : tab === 'completed' ? 'אין משלוחים שהושלמו'
               : tab === 'archived'  ? 'הארכיון ריק'
               : 'אין משלוחים עדיין'}
            </p>
            <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
              {tab === 'active'    ? 'משלוחים שנמצאים בדרך יופיעו כאן'
               : tab === 'completed' ? 'משלוחים שנמסרו בהצלחה יופיעו כאן'
               : tab === 'archived'  ? 'משלוחים שהועברו לארכיון יופיעו כאן'
               : tab === 'scheduled' ? 'צור משלוח מתוזמן לשעה עתידית'
               : 'צור את המשלוח הראשון שלך'}
            </p>
          </div>
          {(tab === 'active' || tab === 'all' || tab === 'scheduled') && (
            <button
              onClick={() => navigate('/business/new-delivery')}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white font-bold text-[13px] transition-all duration-200 active:scale-95 mt-1"
              style={{ background: `linear-gradient(135deg, ${BLUE}, #2563EB)`, boxShadow: `0 4px 14px ${BLUE}35` }}
            >
              <PlusCircleIcon className="w-4 h-4" />
              {tab === 'scheduled' ? 'תזמן משלוח חדש' : 'צור משלוח חדש'}
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

            const isActiveDelivery = ['accepted', 'picked_up'].includes(d.status);
            const card = (
              <div
                className="rounded-2xl p-4 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E8E8E8',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                  borderRight: `4px solid ${color}`,
                }}
                onClick={() => isActiveDelivery && setTrackingSheet(d)}
              >
                {/* Header: order number (right) + date (left) */}
                <div className="flex items-center justify-between mb-2">
                  {d.orderNumber ? (
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#061b31', letterSpacing: '-0.5px' }}>
                      {formatOrderNumber(d.orderNumber)}
                    </span>
                  ) : <div />}
                  <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{formatDate(d.createdAt)}</span>
                </div>
                {/* Status badge */}
                <div className="mb-3">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: color + '18', color }}
                  >
                    {statusLabel[d.status]}
                  </span>
                </div>

                {/* Addresses */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex gap-2 items-start">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                      style={{ background: GREEN }}
                    >א</div>
                    <p className="text-[13px] font-medium leading-snug" style={{ color: '#202125' }}>{d.pickupAddress}</p>
                  </div>
                  <div className="w-px h-3 mr-2.5" style={{ background: '#E8E8E8' }} />
                  <div className="flex gap-2 items-start">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                      style={{ background: RED }}
                    >ב</div>
                    <p className="text-[13px] font-medium leading-snug" style={{ color: '#202125' }}>{d.dropAddress}</p>
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {d.paymentMethod && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#F4F4F4', color: '#757575' }}>
                      {d.paymentMethod === 'cash' ? 'מזומן' : 'ביט'}
                    </span>
                  )}
                  {d.requiredVehicle && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#E6F6FC', color: BLUE }}>
                      <Truck size={9} /> {d.requiredVehicle === 'motorcycle' ? 'אופנוע' : d.requiredVehicle === 'bicycle' ? 'אופניים' : d.requiredVehicle === 'scooter' ? 'קטנוע' : 'רכב'}
                    </span>
                  )}
                  {d.courierName && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#F4F4F4', color: '#757575' }}>
                      <PhosphorUser size={9} weight="fill" />{d.courierName}
                    </span>
                  )}
                </div>

                {d.scheduledAt && d.status === 'scheduled' && (
                  <p className="text-[11px] font-bold mb-3" style={{ color: BLUE }}>
                    <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(d.scheduledAt).toLocaleString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                )}

                {/* Footer: price + action buttons */}
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #E8E8E8' }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[16px] font-black" style={{ color: BLUE }}>₪{d.price}</span>
                    {d.customerPaid !== undefined && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: d.customerPaid ? GREEN + '18' : '#F58F1F18',
                          color:      d.customerPaid ? GREEN : '#F58F1F',
                        }}
                      >
                        {d.customerPaid ? 'שולם' : 'לגבות'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Republish — resets delivery and broadcasts to all couriers */}
                    {canRepublish(d) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRepublish(d); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all duration-200 active:scale-95"
                        style={{ background: '#FFF4E5', color: '#F58F1F', border: '1px solid #F58F1F30' }}
                        title="פרסם שוב לכל השליחים"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        פרסם מחדש
                      </button>
                    )}
                    {/* Resend */}
                    {canResend(d) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResend(d); }}
                        disabled={resending === d.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-95 disabled:opacity-60"
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
                        onClick={(e) => { e.stopPropagation(); setEditTarget(d); }}
                        className="p-2 rounded-xl transition-all duration-200 active:scale-95"
                        style={{ background: '#FFF8E6', color: '#F58F1F' }}
                        title="ערוך משלוח"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    )}

                    {/* Unarchive */}
                    {tab === 'archived' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUnarchive(d.id); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-95"
                        style={{ background: '#E6F6FC', color: BLUE }}
                      >
                        <ArchiveBoxIcon className="w-3.5 h-3.5" />
                        שחזר
                      </button>
                    )}

                    {/* Delete */}
                    {canDelete(d) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDelTarget(d); }}
                        className="p-2 rounded-xl transition-all duration-200 active:scale-95"
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

      {/* Tracking sheet */}
      {trackingSheet && (
        <BusinessDeliveryTrackingSheet
          delivery={trackingSheet}
          onClose={() => setTrackingSheet(null)}
          onUpdatePrepTime={handleUpdatePrepTime}
        />
      )}
    </div>
  );
};

export default BusinessDeliveries;
