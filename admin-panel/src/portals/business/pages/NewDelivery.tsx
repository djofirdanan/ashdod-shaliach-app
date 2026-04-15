import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import type { RootState } from '../../../store';
import {
  getBusiness,
  addDelivery,
  addDeliveryNotification,
} from '../../../services/storage.service';
import {
  TruckIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { DEFAULT_PRICING_ZONES } from '../../../utils/constants';

// Vehicle type options
const VEHICLE_OPTIONS = [
  { value: '', label: 'כל כלי רכב', icon: '🚗🛵🚲', desc: 'כל שליח יכול לקחת' },
  { value: 'motorcycle', label: 'אופנוע', icon: '🏍️', desc: 'מהיר, לכל סוגי משלוחים' },
  { value: 'scooter', label: 'קטנוע', icon: '🛵', desc: 'מהיר לטווח קצר-בינוני' },
  { value: 'bicycle', label: 'אופניים', icon: '🚲', desc: 'אקולוגי, לטווח קצר' },
  { value: 'car', label: 'רכב', icon: '🚗', desc: 'למשלוחים גדולים/כבדים' },
];

// Price multiplier per vehicle type (relative to motorcycle=1.0)
const VEHICLE_MULTIPLIER: Record<string, number> = {
  '': 1.0,
  motorcycle: 1.0,
  scooter: 0.95,
  bicycle: 0.80,
  car: 1.25,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid #e8ecf0',
  fontSize: '14px',
  color: '#061b31',
  background: '#f6f9fc',
  outline: 'none',
  direction: 'rtl',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#8898aa',
  marginBottom: '6px',
  display: 'block',
};

// Load pricing zones
function loadPricingZones() {
  try {
    const raw = localStorage.getItem('app_pricing_zones');
    if (raw) return JSON.parse(raw) as Array<{ id: string; name: string; basePrice: number }>;
  } catch { /* ignore */ }
  return DEFAULT_PRICING_ZONES as Array<{ id: string; name: string; basePrice: number }>;
}

const NewDelivery: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);

  const token = localStorage.getItem('admin_token') ?? '';
  const businessId = token.startsWith('business-') ? token.replace('business-', '') : '';

  // Delivery fields
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  // New fields
  const [requiredVehicle, setRequiredVehicle] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bit'>('cash');
  const [customerPaid, setCustomerPaid] = useState(false);

  // Scheduled delivery
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const zones = loadPricingZones();

  useEffect(() => {
    if (!businessId) return;
    const biz = getBusiness(businessId);
    if (biz) {
      const addr = [biz.address.street, biz.address.city].filter(Boolean).join(', ');
      setPickupAddress(addr);
    }
  }, [businessId]);

  // Auto-calculate price when zone or vehicle changes
  useEffect(() => {
    if (!selectedZoneId) {
      setPrice('');
      return;
    }
    const zone = zones.find(z => z.id === selectedZoneId);
    if (!zone) return;
    const multiplier = VEHICLE_MULTIPLIER[requiredVehicle] ?? 1.0;
    setPrice(String(Math.round(zone.basePrice * multiplier)));
  }, [selectedZoneId, requiredVehicle]);

  // Min datetime for schedule (now + 5min)
  const minDateTime = () => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropAddress.trim()) { toast.error('נא להזין כתובת מסירה'); return; }
    if (!pickupAddress.trim()) { toast.error('נא להזין כתובת איסוף'); return; }

    let scheduledAt: string | undefined;
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) { toast.error('נא לבחור תאריך ושעה למשלוח מתוזמן'); return; }
      scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      if (new Date(scheduledAt) <= new Date()) { toast.error('זמן המשלוח חייב להיות בעתיד'); return; }
    }

    setIsLoading(true);
    try {
      const biz = getBusiness(businessId);
      const businessName = biz?.businessName ?? user?.name ?? 'עסק';
      const priceNum = parseFloat(price) || 35;
      const isNow = !isScheduled;

      // Add delivery record
      addDelivery({
        businessId,
        businessName,
        pickupAddress: pickupAddress.trim(),
        dropAddress: dropAddress.trim(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        description: description.trim() || undefined,
        price: priceNum,
        status: isScheduled ? 'scheduled' : 'pending',
        scheduledAt,
        requiredVehicle: requiredVehicle || undefined,
        paymentMethod,
        customerPaid,
      });

      // Send notification immediately only for non-scheduled deliveries
      if (isNow) {
        addDeliveryNotification({
          businessId,
          businessName,
          pickupAddress: pickupAddress.trim(),
          dropAddress: dropAddress.trim(),
          description: description.trim() || undefined,
          price: priceNum,
          requiredVehicle: requiredVehicle || undefined,
          paymentMethod,
          customerPaid,
        });
        toast.success('המשלוח נשלח! שליח יאסוף בקרוב 🚀');
      } else {
        const dt = new Date(scheduledAt!);
        const formatted = dt.toLocaleString('he-IL', { weekday: 'short', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        toast.success(`המשלוח תוזמן ל-${formatted} ✅`);
      }

      navigate('/business/deliveries');
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בשליחת הבקשה');
    } finally {
      setIsLoading(false);
    }
  };

  const displayPrice = price ? `₪${price}` : 'בחר אזור לחישוב אוטומטי';

  return (
    <div className="max-w-lg mx-auto px-4 py-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
        >
          <TruckIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-black" style={{ color: '#061b31' }}>בקשת משלוח חדשה</h1>
          <p className="text-[12px]" style={{ color: '#8898aa' }}>מלא את פרטי המשלוח</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Addresses ── */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <p className="text-[13px] font-black" style={{ color: '#061b31' }}>📍 כתובות</p>
          <div>
            <label style={labelStyle}>כתובת איסוף *</label>
            <input style={inputStyle} placeholder="רחוב, עיר" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>כתובת מסירה *</label>
            <input style={inputStyle} placeholder="לאן לשלוח?" value={dropAddress} onChange={e => setDropAddress(e.target.value)} required />
          </div>
        </div>

        {/* ── Vehicle type ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <p className="text-[13px] font-black mb-3" style={{ color: '#061b31' }}>🛵 סוג כלי רכב נדרש</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VEHICLE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRequiredVehicle(opt.value)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-all active:scale-95"
                style={{
                  background: requiredVehicle === opt.value ? '#eef2ff' : '#f6f9fc',
                  border: `1.5px solid ${requiredVehicle === opt.value ? '#533afd' : '#e8ecf0'}`,
                }}
              >
                <span className="text-[20px]">{opt.icon}</span>
                <span className="text-[12px] font-bold" style={{ color: requiredVehicle === opt.value ? '#533afd' : '#061b31' }}>{opt.label}</span>
                <span className="text-[10px]" style={{ color: '#8898aa' }}>{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Zone + price ── */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <p className="text-[13px] font-black" style={{ color: '#061b31' }}>💰 תמחור</p>
          <div>
            <label style={labelStyle}>בחר אזור משלוח</label>
            <select
              style={{ ...inputStyle }}
              value={selectedZoneId}
              onChange={e => setSelectedZoneId(e.target.value)}
            >
              <option value="">— בחר אזור —</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name} — ₪{z.basePrice}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>תשלום לשליח (₪) — ניתן לעריכה ידנית</label>
            <div className="relative">
              <input
                style={{ ...inputStyle, direction: 'ltr', paddingRight: 36 }}
                type="number"
                min="0"
                step="1"
                placeholder="35"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
              {selectedZoneId && (
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold"
                  style={{ color: '#533afd' }}
                >
                  חישוב אוטומטי
                </span>
              )}
            </div>
            {requiredVehicle === 'bicycle' && (
              <p className="text-[11px] mt-1" style={{ color: '#8898aa' }}>
                🚲 אופניים — הנחה של 20% על המחיר הבסיסי
              </p>
            )}
            {requiredVehicle === 'car' && (
              <p className="text-[11px] mt-1" style={{ color: '#8898aa' }}>
                🚗 רכב — תוספת 25% על המחיר הבסיסי
              </p>
            )}
          </div>
        </div>

        {/* ── Payment method ── */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <p className="text-[13px] font-black" style={{ color: '#061b31' }}>
            <CreditCardIcon className="w-4 h-4 inline ml-1" />
            אופן תשלום לשליח
          </p>
          <div className="flex gap-2">
            {(['cash', 'bit'] as const).map(pm => (
              <button
                key={pm}
                type="button"
                onClick={() => setPaymentMethod(pm)}
                className="flex-1 py-3 rounded-xl font-bold text-[13px] transition-all active:scale-95"
                style={{
                  background: paymentMethod === pm ? '#eef2ff' : '#f6f9fc',
                  border: `1.5px solid ${paymentMethod === pm ? '#533afd' : '#e8ecf0'}`,
                  color: paymentMethod === pm ? '#533afd' : '#8898aa',
                }}
              >
                {pm === 'cash' ? '💵 מזומן' : '📱 ביט'}
              </button>
            ))}
          </div>

          <div className="pt-1">
            <p className="text-[12px] font-bold mb-2" style={{ color: '#061b31' }}>
              תשלום מהלקוח
            </p>
            <div className="flex gap-2">
              {[
                { value: true, label: '✅ הלקוח כבר שילם', desc: 'לא צריך לגבות' },
                { value: false, label: '💳 שליח גובה', desc: 'גביה בעת המסירה' },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setCustomerPaid(opt.value)}
                  className="flex-1 p-3 rounded-xl text-right transition-all active:scale-95"
                  style={{
                    background: customerPaid === opt.value ? (opt.value ? '#f0fdf4' : '#fff7ed') : '#f6f9fc',
                    border: `1.5px solid ${customerPaid === opt.value ? (opt.value ? '#86efac' : '#fed7aa') : '#e8ecf0'}`,
                  }}
                >
                  <p className="text-[12px] font-bold" style={{ color: '#061b31' }}>{opt.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#8898aa' }}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Customer info ── */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <p className="text-[13px] font-black" style={{ color: '#061b31' }}>👤 פרטי לקוח (אופציונלי)</p>
          <div>
            <label style={labelStyle}>שם הלקוח</label>
            <input style={inputStyle} placeholder="ישראל ישראלי" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>טלפון הלקוח</label>
            <input style={inputStyle} placeholder="050-0000000" type="tel" dir="ltr" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>הערות</label>
            <textarea
              style={{ ...inputStyle, minHeight: 64, resize: 'none' }}
              placeholder="פרטים נוספים..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* ── Scheduled delivery ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="w-4 h-4" style={{ color: '#533afd' }} />
              <p className="text-[13px] font-black" style={{ color: '#061b31' }}>תזמון משלוח עתידי</p>
            </div>
            <button
              type="button"
              onClick={() => setIsScheduled(!isScheduled)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: isScheduled ? '#533afd' : '#e8ecf0' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: isScheduled ? 'translateX(1.25rem)' : 'translateX(0.125rem)' }}
              />
            </button>
          </div>

          {isScheduled ? (
            <div className="space-y-3">
              <div
                className="flex items-start gap-2 p-3 rounded-xl text-[12px]"
                style={{ background: '#eef2ff', color: '#533afd' }}
              >
                <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>המשלוח יתוזמן ושליחים יקבלו התראה בזמן שנקבע</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>תאריך</label>
                  <input
                    type="date"
                    style={{ ...inputStyle, direction: 'ltr' }}
                    min={new Date().toISOString().split('T')[0]}
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    required={isScheduled}
                  />
                </div>
                <div>
                  <label style={labelStyle}>שעה</label>
                  <input
                    type="time"
                    style={{ ...inputStyle, direction: 'ltr' }}
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    required={isScheduled}
                  />
                </div>
              </div>
              {scheduledDate && scheduledTime && (
                <p className="text-[12px] font-bold text-center" style={{ color: '#10b981' }}>
                  ✅ תוזמן ל: {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: '#8898aa' }}>
              כבוי — המשלוח יישלח עכשיו מיד
            </p>
          )}
        </div>

        {/* ── Summary + submit ── */}
        {price && (
          <div
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}
          >
            <div>
              <p className="text-[12px] font-semibold" style={{ color: '#6366f1' }}>
                {VEHICLE_OPTIONS.find(v => v.value === requiredVehicle)?.icon} {VEHICLE_OPTIONS.find(v => v.value === requiredVehicle)?.label || 'כל כלי רכב'}
                {' · '}
                {paymentMethod === 'cash' ? '💵 מזומן' : '📱 ביט'}
                {' · '}
                {customerPaid ? 'שולם ע"י הלקוח' : 'גביה ע"י שליח'}
              </p>
            </div>
            <p className="text-[22px] font-black" style={{ color: '#533afd' }}>₪{price}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 rounded-2xl text-white font-black text-[15px] transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)', boxShadow: '0 6px 20px rgba(83,58,253,0.30)' }}
        >
          {isLoading ? 'שולח...' : isScheduled ? '📅 תזמן משלוח' : '🚀 שלח בקשת משלוח'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/business/deliveries')}
          className="w-full py-3 rounded-2xl font-bold text-[14px] transition-all"
          style={{ background: '#f6f9fc', color: '#8898aa' }}
        >
          ביטול
        </button>
      </form>
    </div>
  );
};

export default NewDelivery;
