import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import toast from 'react-hot-toast';
import {
  TruckIcon,
  ShieldCheckIcon,
  BoltIcon,
  MapPinIcon,
  LockClosedIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { auth } from '../firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';

// ─── Feature bullets ────────────────────────────────────────────────────────
const features = [
  {
    icon: <BoltIcon className="w-5 h-5" />,
    title: 'ניהול בזמן אמת',
    desc: 'עקוב אחר כל משלוח ושליח בזמן אמת',
    color: '#533afd',
  },
  {
    icon: <MapPinIcon className="w-5 h-5" />,
    title: 'מפה חיה',
    desc: 'צפה במיקום השליחים על מפה אינטראקטיבית',
    color: '#ea2261',
  },
  {
    icon: <ShieldCheckIcon className="w-5 h-5" />,
    title: 'אבטחה מתקדמת',
    desc: 'הרשאות ואימות מאובטח לכל פעולה',
    color: '#00b090',
  },
];

// ─── Stat pill ────────────────────────────────────────────────────────────────
const StatPill: React.FC<{
  label: string;
  value: string;
  trend: string;
  accentColor: string;
  className?: string;
}> = ({ label, value, trend, accentColor, className = '' }) => (
  <div
    className={`absolute rounded-[12px] px-4 py-3 ${className}`}
    style={{
      background: 'rgba(255,255,255,0.12)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.20)',
      minWidth: 140,
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    }}
  >
    <p className="text-white/60 text-[11px] font-medium mb-0.5">{label}</p>
    <p className="text-white text-[22px] font-black leading-none">{value}</p>
    <div className="flex items-center gap-1.5 mt-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: accentColor }}
      />
      <span className="text-[11px] text-white/55">{trend}</span>
    </div>
  </div>
);

// ─── Login page ──────────────────────────────────────────────────────────────

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('נא למלא את כל השדות');
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('ברוך הבא!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (
        firebaseError.code === 'auth/user-not-found' ||
        firebaseError.code === 'auth/wrong-password' ||
        firebaseError.code === 'auth/invalid-credential'
      ) {
        toast.error('אימייל או סיסמה שגויים');
      } else if (firebaseError.code === 'auth/too-many-requests') {
        toast.error('יותר מדי ניסיונות. נסה שוב מאוחר יותר');
      } else {
        toast.error('שגיאה בכניסה למערכת');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    localStorage.setItem('admin_token', 'demo_token_12345');
    loginDemo();
    toast.success('כניסת דמו — ברוך הבא!');
    navigate('/dashboard');
  };

  return (
    <div dir="rtl" className="min-h-screen flex" style={{ background: '#f6f9fc' }}>

      {/* ── LEFT — Deep navy brand panel ─────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #061b31 0%, #1c1e54 60%, #533afd 100%)' }}
      >
        {/* Decorative circles */}
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            top: '-80px', left: '-80px',
            width: '320px', height: '320px',
            background: 'rgba(83,58,253,0.15)',
          }}
        />
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            bottom: '-60px', right: '-60px',
            width: '240px', height: '240px',
            background: 'rgba(234,34,97,0.10)',
          }}
        />
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            top: '45%', left: '55%',
            width: '160px', height: '160px',
            background: 'rgba(83,58,253,0.08)',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div
            className="w-11 h-11 rounded-[10px] flex items-center justify-center shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #533afd, #ea2261)',
              boxShadow: '0 8px 20px rgba(83,58,253,0.35)',
            }}
          >
            <TruckIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-lg leading-tight tracking-tight">אשדוד-שליח</p>
            <p className="text-white/45 text-[12px]">פלטפורמת המשלוחים החכמה</p>
          </div>
        </div>

        {/* Hero text + floating cards */}
        <div className="relative flex-1 flex flex-col justify-center py-10 z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 self-start"
            style={{
              background: 'rgba(83,58,253,0.20)',
              border: '1px solid rgba(83,58,253,0.35)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#533afd]" />
            <span className="text-[12px] font-semibold text-white/70">פעיל 24/7</span>
          </div>

          <h1
            className="text-white text-[2.5rem] font-black leading-[1.15] mb-4 tracking-tight"
          >
            המשלוח החכם
            <br />
            <span className="text-gradient-hero">של אשדוד</span>
          </h1>
          <p className="text-white/55 text-[15px] mb-10 max-w-[280px] leading-relaxed">
            מערכת ניהול משלוחים חכמה עם AI, מפה חיה, וניהול שליחים בזמן אמת.
          </p>

          {/* Floating stat pills */}
          <div className="relative h-48">
            <StatPill
              label="משלוחים היום"
              value="73"
              trend="↑ 12% לעומת אתמול"
              accentColor="#533afd"
              className="top-0 right-0"
            />
            <StatPill
              label="שליחים פעילים"
              value="18"
              trend="מתוך 34 רשומים"
              accentColor="#ea2261"
              className="top-10 right-40"
            />
            <StatPill
              label="הכנסות היום"
              value="₪3,640"
              trend="↑ 8% לעומת אתמול"
              accentColor="#00b090"
              className="top-28 right-4"
            />
          </div>
        </div>

        {/* Feature bullets */}
        <div className="relative z-10 space-y-4">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-[7px] flex items-center justify-center flex-shrink-0 text-white"
                style={{ background: f.color + '25', border: `1px solid ${f.color}40` }}
              >
                <span style={{ color: f.color }}>{f.icon}</span>
              </div>
              <div>
                <p className="text-white text-[13px] font-semibold">{f.title}</p>
                <p className="text-white/45 text-[12px] mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT — Login form ──────────────────────────────────────────────── */}
      <div
        className="w-full lg:w-[55%] flex items-center justify-center p-6"
        style={{ background: '#ffffff' }}
      >
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="w-9 h-9 rounded-[8px] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
            >
              <TruckIcon className="w-5 h-5 text-white" />
            </div>
            <p className="font-black text-lg" style={{ color: '#061b31' }}>אשדוד-שליח</p>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2
              className="text-[1.75rem] font-black mb-2 leading-tight tracking-tight"
              style={{ color: '#061b31' }}
            >
              כניסה לפאנל הניהול
            </h2>
            <p className="text-[14px]" style={{ color: '#8898aa' }}>
              הזן את פרטי הכניסה שלך כדי להיכנס למערכת
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="כתובת אימייל"
              type="email"
              placeholder="admin@ashdod-shaliach.co.il"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              dir="ltr"
              leftIcon={<EnvelopeIcon className="w-4 h-4" />}
            />
            <Input
              label="סיסמה"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              dir="ltr"
              leftIcon={<LockClosedIcon className="w-4 h-4" />}
            />

            <div className="flex justify-start pt-1">
              <button
                type="button"
                className="text-[12px] font-medium transition-colors"
                style={{ color: '#533afd' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#3d22e0'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#533afd'; }}
              >
                שכחת סיסמה?
              </button>
            </div>

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
              {!isLoading && 'כניסה למערכת ←'}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: '#e8ecf0' }} />
            <span className="text-[12px] font-medium" style={{ color: '#8898aa' }}>או</span>
            <div className="flex-1 h-px" style={{ background: '#e8ecf0' }} />
          </div>

          {/* Demo login */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleDemoLogin}
          >
            כניסת דמו — ללא סיסמה
          </Button>

          {/* Info note */}
          <div
            className="mt-4 rounded-[8px] p-3.5 flex items-start gap-2.5"
            style={{
              background: 'rgba(83,58,253,0.05)',
              border: '1px solid rgba(83,58,253,0.12)',
            }}
          >
            <span className="text-[13px] flex-shrink-0 mt-0.5" style={{ color: '#533afd' }}>ℹ</span>
            <p className="text-[12px] leading-relaxed" style={{ color: '#6b7c93' }}>
              כניסת הדמו מאפשרת גישה מלאה לממשק ללא חיבור לשרת — מתאים לבדיקות ולפיתוח.
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-[12px] mt-8" style={{ color: '#c1cdd8' }}>
            © {new Date().getFullYear()} אשדוד-שליח. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
