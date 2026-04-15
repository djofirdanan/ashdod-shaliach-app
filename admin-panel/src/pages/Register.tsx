import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  TruckIcon,
  BuildingStorefrontIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  LockClosedIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import * as storageService from '../services/storage.service';
import { DEFAULT_PRICING_ZONES } from '../utils/constants';
import { sendWelcomeBusiness, sendWelcomeCourier } from '../services/email.service';

type TabType = 'business' | 'courier';

const CATEGORIES = ['מסעדה', 'בית קפה', 'מכולת', 'פרמצ׳יה', 'אחר'];
const VEHICLE_OPTIONS = [
  { value: 'motorcycle', label: 'אופנוע' },
  { value: 'bicycle', label: 'אופניים' },
  { value: 'car', label: 'רכב' },
  { value: 'scooter', label: 'קטנוע' },
];

// ─── Success Screen ───────────────────────────────────────────
const SuccessScreen: React.FC<{ type: TabType; name: string }> = ({ type, name }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
      style={{ background: 'linear-gradient(135deg, #533afd22, #ea226122)' }}
    >
      <span className="text-4xl">✓</span>
    </div>
    <h2 className="text-2xl font-black mb-3" style={{ color: '#061b31' }}>
      ההרשמה הושלמה!
    </h2>
    <p className="text-base mb-2" style={{ color: '#3c4257' }}>
      {type === 'business' ? 'עסק' : 'שליח'} <strong>{name}</strong> נרשם בהצלחה.
    </p>
    <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: '#8898aa' }}>
      המנהל יאשר את החשבון שלך בקרוב. תקבל הודעה בהמשך.
    </p>
    <div
      className="rounded-xl p-4 mb-6 max-w-xs text-sm"
      style={{
        background: 'rgba(83,58,253,0.06)',
        border: '1px solid rgba(83,58,253,0.15)',
        color: '#533afd',
      }}
    >
      ממתין לאישור מנהל המערכת
    </div>
    <Link to="/login">
      <Button variant="primary" size="lg">
        חזרה לכניסה ←
      </Button>
    </Link>
  </div>
);

// ─── Register Page ────────────────────────────────────────────
const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<TabType>(() => {
    const type = searchParams.get('type');
    return type === 'courier' ? 'courier' : 'business';
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync tab when URL query changes
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'courier') setTab('courier');
    else if (type === 'business') setTab('business');
  }, [searchParams]);
  const [success, setSuccess] = useState<{ type: TabType; name: string } | null>(null);

  // Business form
  const [biz, setBiz] = useState({
    businessName: '',
    contactPerson: '',
    email: '',
    phone: '',
    street: '',
    city: 'אשדוד',
    zone: '',
    category: 'מסעדה',
    password: '',
    confirmPassword: '',
  });

  // Courier form
  const [cour, setCour] = useState({
    name: '',
    email: '',
    phone: '',
    vehicle: 'motorcycle' as 'motorcycle' | 'bicycle' | 'car' | 'scooter',
    vehiclePlate: '',
    navPreference: 'waze' as 'waze' | 'google' | 'apple',
    password: '',
    confirmPassword: '',
  });

  const zones = DEFAULT_PRICING_ZONES.map((z) => z.name);

  const handleBizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biz.businessName || !biz.contactPerson || !biz.email || !biz.phone || !biz.street || !biz.password) {
      toast.error('נא למלא את כל השדות החובה');
      return;
    }
    if (biz.password.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    if (biz.password !== biz.confirmPassword) {
      toast.error('הסיסמאות אינן תואמות');
      return;
    }
    if (storageService.getBusinessByEmail(biz.email)) {
      toast.error('כתובת האימייל כבר רשומה במערכת');
      return;
    }

    setIsLoading(true);
    try {
      storageService.addBusiness({
        email: biz.email,
        password: storageService.hashPassword(biz.password),
        businessName: biz.businessName,
        contactPerson: biz.contactPerson,
        phone: biz.phone,
        address: { street: biz.street, city: biz.city, zone: biz.zone || undefined },
        category: biz.category,
        isActive: false, // needs admin approval
        isBlocked: false,
        balance: 0,
        totalDeliveries: 0,
        rating: 5,
      });
      // Send welcome email (fire and forget)
      sendWelcomeBusiness(biz.email, biz.businessName).catch(() => {});
      setSuccess({ type: 'business', name: biz.businessName });
    } catch {
      toast.error('שגיאה בהרשמה. נסה שוב');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cour.name || !cour.email || !cour.phone || !cour.password) {
      toast.error('נא למלא את כל השדות החובה');
      return;
    }
    if (cour.password.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    if (cour.password !== cour.confirmPassword) {
      toast.error('הסיסמאות אינן תואמות');
      return;
    }
    if (storageService.getCourierByEmail(cour.email)) {
      toast.error('כתובת האימייל כבר רשומה במערכת');
      return;
    }

    setIsLoading(true);
    try {
      storageService.addCourier({
        email: cour.email,
        password: storageService.hashPassword(cour.password),
        name: cour.name,
        phone: cour.phone,
        vehicle: cour.vehicle,
        vehiclePlate: cour.vehicle !== 'bicycle' ? cour.vehiclePlate || undefined : undefined,
        navPreference: cour.navPreference,
        isActive: false,
        isBlocked: false,
        rating: 5,
        totalDeliveries: 0,
        activeDeliveries: 0,
        earnings: { today: 0, thisWeek: 0, thisMonth: 0, total: 0 },
      });
      // Send welcome email (fire and forget)
      sendWelcomeCourier(cour.email, cour.name).catch(() => {});
      setSuccess({ type: 'courier', name: cour.name });
    } catch {
      toast.error('שגיאה בהרשמה. נסה שוב');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full";

  return (
    <div dir="rtl" className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#f6f9fc' }}>

      {/* ── LEFT PANEL ──────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #061b31 0%, #1c1e54 60%, #533afd 100%)' }}
      >
        <div className="absolute pointer-events-none rounded-full" style={{ top: '-80px', left: '-80px', width: '320px', height: '320px', background: 'rgba(83,58,253,0.15)' }} />
        <div className="absolute pointer-events-none rounded-full" style={{ bottom: '-60px', right: '-60px', width: '240px', height: '240px', background: 'rgba(234,34,97,0.10)' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-11 h-11 rounded-[10px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}>
            <TruckIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-lg leading-tight">אשדוד-שליח</p>
            <p className="text-white/45 text-[12px]">פלטפורמת המשלוחים החכמה</p>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <h1 className="text-white text-[2.2rem] font-black leading-[1.2] mb-4">
            הצטרף
            <br />
            <span style={{ background: 'linear-gradient(90deg, #a89bff, #f96bee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              לאשדוד-שליח
            </span>
          </h1>
          <p className="text-white/55 text-[15px] mb-8 leading-relaxed max-w-[280px]">
            הרשמה מהירה לעסקים ושליחים — תתחיל לעבוד תוך דקות.
          </p>

          <div className="space-y-4">
            {[
              { icon: <BuildingStorefrontIcon className="w-5 h-5" />, title: 'עסקים', desc: 'נהל הזמנות ומשלוחים בקלות', color: '#533afd' },
              { icon: <UserCircleIcon className="w-5 h-5" />, title: 'שליחים', desc: 'קבל הזמנות ונהל את הרווחים שלך', color: '#ea2261' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: item.color + '22', border: `1px solid ${item.color}40` }}>
                  <span style={{ color: item.color }}>{item.icon}</span>
                </div>
                <div>
                  <p className="text-white text-[13px] font-semibold">{item.title}</p>
                  <p className="text-white/45 text-[12px] mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/25 text-[12px] relative z-10">
          © {new Date().getFullYear()} אשדוד-שליח
        </p>
      </div>

      {/* ── RIGHT FORM ──────────────────────────────────────────── */}
      <div className="w-full lg:w-[58%] overflow-y-auto flex-1" style={{ background: '#fff' }}>
        <div className="w-full max-w-[480px] mx-auto px-5 py-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-9 h-9 rounded-[8px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}>
              <TruckIcon className="w-5 h-5 text-white" />
            </div>
            <p className="font-black text-lg" style={{ color: '#061b31' }}>אשדוד-שליח</p>
          </div>

          {success ? (
            <SuccessScreen type={success.type} name={success.name} />
          ) : (
            <>
              {/* Heading */}
              <div className="mb-6">
                <h2 className="text-[1.6rem] font-black mb-1" style={{ color: '#061b31' }}>הרשמה לפלטפורמה</h2>
                <p className="text-[13px]" style={{ color: '#8898aa' }}>בחר את סוג החשבון שלך</p>
              </div>

              {/* Tab toggle */}
              <div className="flex mb-6 rounded-xl overflow-hidden border" style={{ borderColor: '#e0e6ed' }}>
                <button
                  type="button"
                  onClick={() => setTab('business')}
                  className="flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={tab === 'business'
                    ? { background: 'linear-gradient(135deg, #533afd, #3d22e0)', color: 'white' }
                    : { background: 'white', color: '#6b7c93' }
                  }
                >
                  <BuildingStorefrontIcon className="w-4 h-4" />
                  אני עסק
                </button>
                <button
                  type="button"
                  onClick={() => setTab('courier')}
                  className="flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={tab === 'courier'
                    ? { background: 'linear-gradient(135deg, #ea2261, #c01053)', color: 'white' }
                    : { background: 'white', color: '#6b7c93' }
                  }
                >
                  <TruckIcon className="w-4 h-4" />
                  אני שליח
                </button>
              </div>

              {/* ── BUSINESS FORM ── */}
              {tab === 'business' && (
                <form onSubmit={handleBizSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      className={inputClass}
                      label="שם העסק *"
                      placeholder="פיצה טעמי"
                      value={biz.businessName}
                      onChange={(e) => setBiz({ ...biz, businessName: e.target.value })}
                    />
                    <Input
                      className={inputClass}
                      label="שם איש קשר *"
                      placeholder="ישראל ישראלי"
                      value={biz.contactPerson}
                      onChange={(e) => setBiz({ ...biz, contactPerson: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      className={inputClass}
                      label="אימייל *"
                      type="email"
                      dir="ltr"
                      placeholder="business@email.com"
                      leftIcon={<EnvelopeIcon className="w-4 h-4" />}
                      value={biz.email}
                      onChange={(e) => setBiz({ ...biz, email: e.target.value })}
                    />
                    <Input
                      className={inputClass}
                      label="טלפון *"
                      type="tel"
                      dir="ltr"
                      placeholder="050-0000000"
                      leftIcon={<PhoneIcon className="w-4 h-4" />}
                      value={biz.phone}
                      onChange={(e) => setBiz({ ...biz, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      className={inputClass}
                      label="כתובת *"
                      placeholder="רחוב הרצל 22"
                      leftIcon={<MapPinIcon className="w-4 h-4" />}
                      value={biz.street}
                      onChange={(e) => setBiz({ ...biz, street: e.target.value })}
                    />
                    <Input
                      className={inputClass}
                      label="עיר"
                      placeholder="אשדוד"
                      value={biz.city}
                      onChange={(e) => setBiz({ ...biz, city: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="w-full">
                      <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-[0.05em]" style={{ color: '#3c4257' }}>אזור משלוח</label>
                      <select
                        value={biz.zone}
                        onChange={(e) => setBiz({ ...biz, zone: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-[6px] text-sm border outline-none transition-all"
                        style={{ borderColor: '#e0e6ed', background: '#f8fafc', color: '#061b31', fontFamily: 'inherit' }}
                      >
                        <option value="">-- בחר אזור --</option>
                        {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                      </select>
                    </div>
                    <div className="w-full">
                      <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-[0.05em]" style={{ color: '#3c4257' }}>קטגוריה</label>
                      <select
                        value={biz.category}
                        onChange={(e) => setBiz({ ...biz, category: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-[6px] text-sm border outline-none"
                        style={{ borderColor: '#e0e6ed', background: '#f8fafc', color: '#061b31', fontFamily: 'inherit' }}
                      >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      className={inputClass}
                      label="סיסמה * (מינ' 6 תווים)"
                      type="password"
                      dir="ltr"
                      placeholder="••••••••"
                      leftIcon={<LockClosedIcon className="w-4 h-4" />}
                      value={biz.password}
                      onChange={(e) => setBiz({ ...biz, password: e.target.value })}
                    />
                    <Input
                      className={inputClass}
                      label="אישור סיסמה *"
                      type="password"
                      dir="ltr"
                      placeholder="••••••••"
                      leftIcon={<LockClosedIcon className="w-4 h-4" />}
                      value={biz.confirmPassword}
                      onChange={(e) => setBiz({ ...biz, confirmPassword: e.target.value })}
                    />
                  </div>
                  <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full mt-2">
                    {!isLoading && 'הרשמה כעסק ←'}
                  </Button>
                </form>
              )}

              {/* ── COURIER FORM ── */}
              {tab === 'courier' && (
                <form onSubmit={handleCourSubmit} className="space-y-4">
                  <Input
                    className={inputClass}
                    label="שם מלא *"
                    placeholder="ישראל ישראלי"
                    value={cour.name}
                    onChange={(e) => setCour({ ...cour, name: e.target.value })}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      className={inputClass}
                      label="אימייל *"
                      type="email"
                      dir="ltr"
                      placeholder="courier@email.com"
                      leftIcon={<EnvelopeIcon className="w-4 h-4" />}
                      value={cour.email}
                      onChange={(e) => setCour({ ...cour, email: e.target.value })}
                    />
                    <Input
                      className={inputClass}
                      label="טלפון *"
                      type="tel"
                      dir="ltr"
                      placeholder="050-0000000"
                      leftIcon={<PhoneIcon className="w-4 h-4" />}
                      value={cour.phone}
                      onChange={(e) => setCour({ ...cour, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="w-full">
                      <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-[0.05em]" style={{ color: '#3c4257' }}>סוג רכב</label>
                      <select
                        value={cour.vehicle}
                        onChange={(e) => setCour({ ...cour, vehicle: e.target.value as typeof cour.vehicle })}
                        className="w-full px-3 py-2.5 rounded-[6px] text-sm border outline-none"
                        style={{ borderColor: '#e0e6ed', background: '#f8fafc', color: '#061b31', fontFamily: 'inherit' }}
                      >
                        {VEHICLE_OPTIONS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                      </select>
                    </div>
                    {cour.vehicle !== 'bicycle' && (
                      <Input
                        className={inputClass}
                        label="לוחית רישוי"
                        dir="ltr"
                        placeholder="12-345-67"
                        value={cour.vehiclePlate}
                        onChange={(e) => setCour({ ...cour, vehiclePlate: e.target.value })}
                      />
                    )}
                  </div>
                  {/* Navigation preference */}
                  <div className="w-full">
                    <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-[0.05em]" style={{ color: '#3c4257' }}>
                      אפליקציית ניווט מועדפת
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'waze', label: '🗺️ Waze' },
                        { value: 'google', label: '📍 גוגל מפות' },
                        { value: 'apple', label: '🍎 Apple Maps' },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCour({ ...cour, navPreference: opt.value })}
                          className="py-2.5 rounded-[6px] text-[11px] font-bold transition-all"
                          style={{
                            background: cour.navPreference === opt.value ? '#533afd' : '#f8fafc',
                            color: cour.navPreference === opt.value ? 'white' : '#6b7c93',
                            border: `1px solid ${cour.navPreference === opt.value ? '#533afd' : '#e0e6ed'}`,
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      className={inputClass}
                      label="סיסמה * (מינ' 6 תווים)"
                      type="password"
                      dir="ltr"
                      placeholder="••••••••"
                      leftIcon={<LockClosedIcon className="w-4 h-4" />}
                      value={cour.password}
                      onChange={(e) => setCour({ ...cour, password: e.target.value })}
                    />
                    <Input
                      className={inputClass}
                      label="אישור סיסמה *"
                      type="password"
                      dir="ltr"
                      placeholder="••••••••"
                      leftIcon={<LockClosedIcon className="w-4 h-4" />}
                      value={cour.confirmPassword}
                      onChange={(e) => setCour({ ...cour, confirmPassword: e.target.value })}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    isLoading={isLoading}
                    className="w-full mt-2"
                    style={{ background: 'linear-gradient(135deg, #ea2261, #c01053)', color: 'white', border: 'none' }}
                  >
                    {!isLoading && 'הרשמה כשליח ←'}
                  </Button>
                </form>
              )}

              {/* Back to login */}
              <p className="text-center text-[13px] mt-6" style={{ color: '#8898aa' }}>
                כבר רשום?{' '}
                <Link to="/login" className="font-semibold" style={{ color: '#533afd' }}>
                  כניסה למערכת
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
