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
} from '@heroicons/react/24/outline';
import { ScheduledDeliveryPicker } from '../../../components/ui/ScheduledDeliveryPicker';
import { DEFAULT_PRICING_ZONES } from '../../../utils/constants';
import { Truck, Motorcycle, Scooter, Bicycle, Car, MapPin as PhosphorMapPin, Money, DeviceMobile, CheckCircle, CreditCard as PhosphorCreditCard, User as PhosphorUser, Rocket, Calendar, Plus, Minus, Timer } from '@phosphor-icons/react';

// ── Wolt design tokens ──────────────────────────────────────────────────────
const BLUE    = '#009DE0';
const BG      = '#F4F4F4';
const CARD_BG = '#FFFFFF';
const TEXT    = '#202125';
const TEXT2   = '#757575';
const BORDER  = '#E8E8E8';
const SUCCESS = '#1BA672';

// Vehicle type options
const VEHICLE_OPTIONS: { value: string; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: '', label: 'כל כלי רכב', icon: <Truck size={20} />, desc: 'כל שליח יכול לקחת' },
  { value: 'motorcycle', label: 'אופנוע', icon: <Motorcycle size={20} />, desc: 'מהיר, לכל סוגי משלוחים' },
  { value: 'scooter', label: 'קטנוע', icon: <Scooter size={20} />, desc: 'מהיר לטווח קצר-בינוני' },
  { value: 'bicycle', label: 'אופניים', icon: <Bicycle size={20} />, desc: 'אקולוגי, לטווח קצר' },
  { value: 'car', label: 'רכב', icon: <Car size={20} />, desc: 'למשלוחים גדולים/כבדים' },
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
  border: `1px solid ${BORDER}`,
  fontSize: '14px',
  color: TEXT,
  background: BG,
  outline: 'none',
  direction: 'rtl',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: TEXT2,
  marginBottom: '6px',
  display: 'block',
};

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
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
  const [pickupCity, setPickupCity] = useState('');
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

  // Prep time
  const [prepMinutes, setPrepMinutes] = useState<number | undefined>(undefined);
  const [prepCustom, setPrepCustom] = useState('');

  // Scheduled delivery
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  // 'now' = notify couriers immediately (reserve a courier); 'on_time' = notify at scheduled time only
  const [notifyMode, setNotifyMode] = useState<'now' | 'on_time'>('on_time');

  const [isLoading, setIsLoading] = useState(false);
  const zones = loadPricingZones();

  useEffect(() => {
    if (!businessId) return;
    const biz = getBusiness(businessId);
    if (biz) {
      const addr = [biz.address.street, biz.address.city].filter(Boolean).join(', ');
      setPickupAddress(addr);
      if (biz.address.city) setPickupCity(biz.address.city);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropAddress.trim()) { toast.error('נא להזין כתובת מסירה'); return; }
    if (!pickupAddress.trim()) { toast.error('נא להזין כתובת איסוף'); return; }

    let scheduledAtISO: string | undefined;
    if (isScheduled) {
      if (!scheduledAt) { toast.error('נא לבחור תאריך ושעה למשלוח מתוזמן'); return; }
      if (scheduledAt <= new Date()) { toast.error('זמן המשלוח חייב להיות בעתיד'); return; }
      scheduledAtISO = scheduledAt.toISOString();
    }

    setIsLoading(true);
    try {
      const biz = getBusiness(businessId);
      const businessName = biz?.businessName ?? user?.name ?? 'עסק';
      const priceNum = parseFloat(price) || 35;
      const isNow = !isScheduled;

      // For "notify now" mode: mark notificationSent so the scheduler won't double-fire
      const earlyNotify = isScheduled && notifyMode === 'now';

      // Add delivery record
      const newDelivery = addDelivery({
        businessId,
        businessName,
        pickupAddress: pickupAddress.trim(),
        pickupCity: pickupCity || undefined,
        dropAddress: dropAddress.trim(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        description: description.trim() || undefined,
        price: priceNum,
        status: isScheduled ? 'scheduled' : 'pending',
        scheduledAt: scheduledAtISO,
        requiredVehicle: requiredVehicle || undefined,
        paymentMethod,
        customerPaid,
        notificationSent: earlyNotify, // mark sent so scheduler skips it
        prepMinutes: prepMinutes || undefined,
      });

      if (isNow) {
        // Regular delivery — notify couriers immediately
        addDeliveryNotification({
          deliveryId: newDelivery.id,
          businessId,
          businessName,
          pickupAddress: pickupAddress.trim(),
          pickupCity: pickupCity || undefined,
          dropAddress: dropAddress.trim(),
          description: description.trim() || undefined,
          price: priceNum,
          requiredVehicle: requiredVehicle || undefined,
          paymentMethod,
          customerPaid,
        });
      } else if (earlyNotify) {
        // Scheduled but business chose to notify couriers NOW (to reserve a courier)
        const dt = new Date(scheduledAtISO!);
        const formatted = dt.toLocaleString('he-IL', { weekday: 'short', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        addDeliveryNotification({
          deliveryId: newDelivery.id,
          businessId,
          businessName,
          pickupAddress: pickupAddress.trim(),
          pickupCity: pickupCity || undefined,
          dropAddress: dropAddress.trim(),
          description: description.trim() || undefined,
          price: priceNum,
          requiredVehicle: requiredVehicle || undefined,
          paymentMethod,
          customerPaid,
          scheduledAt: scheduledAtISO, // couriers will see the future time
        });
        toast.success(`ההודעה נשלחה לשליחים — משלוח מתוזמן ל-${formatted}`);
      } else {
        // Scheduled + notify at scheduled time only
        const dt = new Date(scheduledAtISO!);
        const formatted = dt.toLocaleString('he-IL', { weekday: 'short', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        toast.success(`המשלוח תוזמן ל-${formatted} — ההודעה תישלח אז`);
      }

      // Navigate to dashboard with tracking param so the live-status sheet opens
      navigate(`/business/dashboard?tracking=${newDelivery.id}`);
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בשליחת הבקשה');
    } finally {
      setIsLoading(false);
    }
  };

  const displayPrice = price ? `₪${price}` : 'בחר אזור לחישוב אוטומטי';

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '0 0 40px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 0' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: BLUE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TruckIcon style={{ width: 22, height: 22, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: TEXT, margin: 0 }}>בקשת משלוח חדשה</h1>
            <p style={{ fontSize: 12, color: TEXT2, margin: 0 }}>מלא את פרטי המשלוח</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Addresses ── */}
          <div style={{ ...cardStyle }}>
            <p style={{ fontSize: 13, fontWeight: 900, color: TEXT, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}><PhosphorMapPin size={14} /> כתובות</p>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>כתובת איסוף *</label>
              <input style={inputStyle} placeholder="רחוב, עיר" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>כתובת מסירה *</label>
              <input style={inputStyle} placeholder="לאן לשלוח?" value={dropAddress} onChange={e => setDropAddress(e.target.value)} required />
            </div>
          </div>

          {/* ── Vehicle type ── */}
          <div style={{ ...cardStyle }}>
            <p style={{ fontSize: 13, fontWeight: 900, color: TEXT, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Truck size={14} /> סוג כלי רכב נדרש</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {VEHICLE_OPTIONS.map(opt => {
                const selected = requiredVehicle === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRequiredVehicle(opt.value)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '12px 8px',
                      borderRadius: 12,
                      border: `1.5px solid ${selected ? BLUE : BORDER}`,
                      background: selected ? '#EAF7FD' : BG,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', color: selected ? BLUE : TEXT2 }}>{opt.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: selected ? BLUE : TEXT }}>{opt.label}</span>
                    <span style={{ fontSize: 10, color: TEXT2 }}>{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Zone + price ── */}
          <div style={{ ...cardStyle }}>
            <p style={{ fontSize: 13, fontWeight: 900, color: TEXT, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Money size={14} /> תמחור</p>
            <div style={{ marginBottom: 12 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* − button */}
                <button
                  type="button"
                  onClick={() => setPrice(p => String(Math.max(0, (parseInt(p) || 0) - 1)))}
                  style={{
                    width: 48, height: 48, borderRadius: 12, border: `1.5px solid ${BORDER}`,
                    background: BG, cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT2,
                  }}
                >
                  <Minus size={18} />
                </button>

                {/* text input — no native spinners */}
                <input
                  style={{ ...inputStyle, textAlign: 'center', fontWeight: 700, fontSize: 18, flex: 1 }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="35"
                  value={price}
                  onChange={e => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                />

                {/* + button */}
                <button
                  type="button"
                  onClick={() => setPrice(p => String((parseInt(p) || 0) + 1))}
                  style={{
                    width: 48, height: 48, borderRadius: 12, border: `1.5px solid ${BORDER}`,
                    background: BG, cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT2,
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* auto-calc badge */}
              {selectedZoneId && (
                <p style={{ margin: '5px 0 0', fontSize: 11, fontWeight: 700, color: BLUE, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={12} weight="fill" /> חישוב אוטומטי — ניתן לשנות ידנית
                </p>
              )}
              {requiredVehicle === 'bicycle' && (
                <p style={{ fontSize: 11, marginTop: 4, color: TEXT2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Bicycle size={11} /> אופניים — הנחה של 20% על המחיר הבסיסי
                </p>
              )}
              {requiredVehicle === 'car' && (
                <p style={{ fontSize: 11, marginTop: 4, color: TEXT2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Car size={11} /> רכב — תוספת 25% על המחיר הבסיסי
                </p>
              )}
            </div>
          </div>

          {/* ── Payment method ── */}
          <div style={{ ...cardStyle }}>
            <p style={{ fontSize: 13, fontWeight: 900, color: TEXT, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CreditCardIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
              אופן תשלום לשליח
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['cash', 'bit'] as const).map(pm => {
                const selected = paymentMethod === pm;
                return (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 13,
                      border: `1.5px solid ${selected ? BLUE : BORDER}`,
                      background: selected ? '#EAF7FD' : BG,
                      color: selected ? BLUE : TEXT2,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      {pm === 'cash' ? <><Money size={14} /><span>מזומן</span></> : <><DeviceMobile size={14} /><span>ביט</span></>}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
                תשלום מהלקוח
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: true, label: 'הלקוח כבר שילם', icon: <CheckCircle size={13} />, desc: 'לא צריך לגבות' },
                  { value: false, label: 'שליח גובה', icon: <PhosphorCreditCard size={13} />, desc: 'גביה בעת המסירה' },
                ].map(opt => {
                  const selected = customerPaid === opt.value;
                  const selectedBg  = opt.value ? '#F0FDF4' : '#FFF7ED';
                  const selectedBdr = opt.value ? '#86EFAC' : '#FED7AA';
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setCustomerPaid(opt.value)}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 12,
                        textAlign: 'right',
                        border: `1.5px solid ${selected ? selectedBdr : BORDER}`,
                        background: selected ? selectedBg : BG,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>{opt.icon} {opt.label}</p>
                      <p style={{ fontSize: 10, color: TEXT2, margin: '2px 0 0' }}>{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Customer info ── */}
          <div style={{ ...cardStyle }}>
            <p style={{ fontSize: 13, fontWeight: 900, color: TEXT, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><PhosphorUser size={14} /> פרטי לקוח (אופציונלי)</p>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>שם הלקוח</label>
              <input style={inputStyle} placeholder="ישראל ישראלי" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>טלפון הלקוח</label>
              <input style={{ ...inputStyle, direction: 'ltr' }} placeholder="050-0000000" type="tel" dir="ltr" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
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

          {/* ── Prep time ── */}
          <div style={{ ...cardStyle }}>
            <p style={{ fontSize: 13, fontWeight: 900, color: TEXT, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Timer size={14} /> זמן הכנת ההזמנה
            </p>
            <p style={{ fontSize: 11, color: TEXT2, margin: '0 0 10px' }}>
              כמה זמן צריך להכין את ההזמנה לפני שהשליח יגיע לאסוף?
            </p>
            {/* Quick chips */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {[5, 10, 20, 25].map(m => {
                const sel = prepMinutes === m && !prepCustom;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setPrepMinutes(m); setPrepCustom(''); }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: `1.5px solid ${sel ? BLUE : BORDER}`,
                      background: sel ? '#EAF7FD' : BG,
                      color: sel ? BLUE : TEXT,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {m} דק׳
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => { setPrepMinutes(undefined); setPrepCustom(''); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: `1.5px solid ${!prepMinutes && !prepCustom ? BLUE : BORDER}`,
                  background: !prepMinutes && !prepCustom ? '#EAF7FD' : BG,
                  color: !prepMinutes && !prepCustom ? BLUE : TEXT2,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                ללא
              </button>
            </div>
            {/* Custom input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1, textAlign: 'center' }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="מספר דקות ידני..."
                value={prepCustom}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9]/g, '');
                  setPrepCustom(v);
                  if (v) setPrepMinutes(parseInt(v));
                  else setPrepMinutes(undefined);
                }}
              />
              <span style={{ fontSize: 12, color: TEXT2, flexShrink: 0 }}>דקות</span>
            </div>
            {prepMinutes && (
              <p style={{ margin: '8px 0 0', fontSize: 11, fontWeight: 700, color: BLUE, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={12} weight="fill" /> השליח יראה טיימר: {prepMinutes} דקות להכנה
              </p>
            )}
          </div>

          {/* ── Scheduled delivery ── */}
          <div style={{ ...cardStyle }}>
            {/* Header row with toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isScheduled ? 16 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarDaysIcon style={{ width: 16, height: 16, color: BLUE }} />
                <p style={{ fontSize: 13, fontWeight: 900, color: TEXT, margin: 0 }}>תזמון משלוח עתידי</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !isScheduled;
                  setIsScheduled(next);
                  // When enabling, default to now+1h
                  if (next && !scheduledAt) {
                    const d = new Date(Date.now() + 3_600_000);
                    d.setSeconds(0); d.setMilliseconds(0);
                    const m = Math.ceil(d.getMinutes() / 5) * 5;
                    if (m >= 60) { d.setMinutes(0); d.setHours(d.getHours() + 1); } else d.setMinutes(m);
                    setScheduledAt(d);
                  }
                }}
                style={{
                  position: 'relative',
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  border: 'none',
                  background: isScheduled ? BLUE : BORDER,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: isScheduled ? 25 : 3,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>

            {isScheduled ? (
              <>
                <ScheduledDeliveryPicker
                  value={scheduledAt}
                  onChange={setScheduledAt}
                />

                {/* ── Notify mode selector ── */}
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
                    מתי לשלוח הודעה לשליחים?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Option A — notify at scheduled time */}
                    <button
                      type="button"
                      onClick={() => setNotifyMode('on_time')}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '12px 14px', borderRadius: 12, textAlign: 'right',
                        border: `1.5px solid ${notifyMode === 'on_time' ? BLUE : BORDER}`,
                        background: notifyMode === 'on_time' ? '#EAF7FD' : BG,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {/* Radio dot */}
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                        border: `2px solid ${notifyMode === 'on_time' ? BLUE : BORDER}`,
                        background: notifyMode === 'on_time' ? BLUE : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {notifyMode === 'on_time' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                      </span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: notifyMode === 'on_time' ? BLUE : TEXT, margin: 0 }}>
                          שלח בדיוק בזמן התזמון
                        </p>
                        <p style={{ fontSize: 11, color: TEXT2, margin: '2px 0 0' }}>
                          ההודעה תישלח לשליחים רק כשיגיע הזמן שנקבע
                        </p>
                      </div>
                    </button>

                    {/* Option B — notify now to reserve */}
                    <button
                      type="button"
                      onClick={() => setNotifyMode('now')}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '12px 14px', borderRadius: 12, textAlign: 'right',
                        border: `1.5px solid ${notifyMode === 'now' ? '#F97316' : BORDER}`,
                        background: notifyMode === 'now' ? '#FFF7ED' : BG,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                        border: `2px solid ${notifyMode === 'now' ? '#F97316' : BORDER}`,
                        background: notifyMode === 'now' ? '#F97316' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {notifyMode === 'now' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                      </span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: notifyMode === 'now' ? '#F97316' : TEXT, margin: 0 }}>
                          שלח הודעה עכשיו לשריין שליח
                        </p>
                        <p style={{ fontSize: 11, color: TEXT2, margin: '2px 0 0' }}>
                          השליחים יראו את המשלוח עכשיו עם הזמן המתוזמן — יכולים להתחייב מראש
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 12, color: TEXT2, margin: 0 }}>
                כבוי — המשלוח יישלח עכשיו מיד
              </p>
            )}
          </div>

          {/* ── Price summary bar ── */}
          {price && (
            <div
              style={{
                borderRadius: 16,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#EAF7FD',
                border: `1px solid ${BLUE}22`,
              }}
            >
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: BLUE, margin: 0, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>{VEHICLE_OPTIONS.find(v => v.value === requiredVehicle)?.icon}</span>
                  {VEHICLE_OPTIONS.find(v => v.value === requiredVehicle)?.label || 'כל כלי רכב'}
                  {' · '}
                  {paymentMethod === 'cash' ? <><Money size={11} /> מזומן</> : <><DeviceMobile size={11} /> ביט</>}
                  {' · '}
                  {customerPaid ? 'שולם ע"י הלקוח' : 'גביה ע"י שליח'}
                </p>
              </div>
              <p style={{ fontSize: 22, fontWeight: 900, color: BLUE, margin: 0 }}>₪{price}</p>
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '16px 0',
              borderRadius: 16,
              border: 'none',
              background: BLUE,
              color: '#fff',
              fontWeight: 900,
              fontSize: 15,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'opacity 0.15s',
              boxShadow: `0 6px 20px ${BLUE}44`,
            }}
          >
            {isLoading ? 'שולח...' : isScheduled
              ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Calendar size={16} /> תזמן משלוח</span>
              : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Rocket size={16} /> שלח בקשת משלוח</span>
            }
          </button>

          {/* ── Cancel ── */}
          <button
            type="button"
            onClick={() => navigate('/business/deliveries')}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 16,
              border: 'none',
              background: BG,
              color: TEXT2,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ביטול
          </button>

        </form>
      </div>
    </div>
  );
};

export default NewDelivery;
