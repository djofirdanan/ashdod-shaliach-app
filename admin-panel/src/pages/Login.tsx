import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginUser } from '../store/authSlice';
import {
  TruckIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';

// ─── Device detection ────────────────────────────────────────────────────────
function detectDevice(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

// ─── App Download Banner ─────────────────────────────────────────────────────
const AppDownloadBanner: React.FC = () => {
  const device = detectDevice();

  return (
    <div
      className="w-full rounded-[14px] px-5 py-4 flex items-center gap-4 mb-6"
      style={{
        background: 'linear-gradient(135deg, #061b31 0%, #1c1e54 100%)',
        boxShadow: '0 4px 20px rgba(6,27,49,0.20)',
      }}
    >
      <div
        className="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
      >
        <DevicePhoneMobileIcon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-[13px] font-bold leading-tight">
          📱 הורד את אפליקציית אשדוד-שליח
        </p>
        <p className="text-white/55 text-[11px] mt-0.5">
          גש לכל הפיצ׳רים ישירות מהנייד שלך
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {(device === 'ios' || device === 'desktop') && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            onClick={() => toast('בקרוב ב-App Store! 🍎')}
          >
            🍎 <span className="hidden sm:inline">App Store</span>
          </button>
        )}
        {(device === 'android' || device === 'desktop') && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            onClick={() => toast('בקרוב ב-Google Play! 🤖')}
          >
            🤖 <span className="hidden sm:inline">Google Play</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Role card ────────────────────────────────────────────────────────────────
type Role = 'business' | 'courier' | 'admin';

interface RoleCardProps {
  role: Role;
  selected: boolean;
  onSelect: () => void;
}

const roleConfig: Record<Role, { icon: React.ReactNode; label: string; sub: string; color: string; grad: string }> = {
  business: {
    icon: <BuildingStorefrontIcon className="w-6 h-6" />,
    label: 'עסק',
    sub: 'מסעדה, מכולת, בית מרקחת ועוד',
    color: '#ea2261',
    grad: 'linear-gradient(135deg, #ea2261, #c01053)',
  },
  courier: {
    icon: <TruckIcon className="w-6 h-6" />,
    label: 'שליח',
    sub: 'שלח ואסוף משלוחים',
    color: '#00b090',
    grad: 'linear-gradient(135deg, #00b090, #007acc)',
  },
  admin: {
    icon: <ShieldCheckIcon className="w-6 h-6" />,
    label: 'מנהל',
    sub: 'ניהול מערכת מלא',
    color: '#533afd',
    grad: 'linear-gradient(135deg, #533afd, #3d22e0)',
  },
};

const RoleCard: React.FC<RoleCardProps> = ({ role, selected, onSelect }) => {
  const cfg = roleConfig[role];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex-1 flex flex-col items-center gap-2 py-4 px-2 rounded-[12px] border-2 transition-all duration-200"
      style={{
        borderColor: selected ? cfg.color : '#e8ecf0',
        background: selected ? cfg.color + '0d' : '#fff',
        boxShadow: selected ? `0 0 0 3px ${cfg.color}22` : 'none',
      }}
    >
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white"
        style={{ background: selected ? cfg.grad : '#f0f3f6' }}
      >
        <span style={{ color: selected ? '#fff' : cfg.color }}>{cfg.icon}</span>
      </div>
      <div className="text-center">
        <p
          className="text-[14px] font-bold"
          style={{ color: selected ? cfg.color : '#061b31' }}
        >
          {cfg.label}
        </p>
        <p className="text-[10px] mt-0.5 leading-tight" style={{ color: '#8898aa' }}>
          {cfg.sub}
        </p>
      </div>
    </button>
  );
};

// ─── Feature bullets (left panel) ────────────────────────────────────────────
const features = [
  { icon: '⚡', title: 'ניהול בזמן אמת', desc: 'עקוב אחר כל משלוח בזמן אמת' },
  { icon: '🗺️', title: 'מפה חיה', desc: 'מיקום השליחים על מפה אינטראקטיבית' },
  { icon: '💬', title: 'צ׳אט מובנה', desc: 'תקשורת ישירה בין עסקים לשליחים' },
  { icon: '📊', title: 'דוחות ובונוסים', desc: 'נתוני ביצועים וחוקי תגמול גמישים' },
];

// ─── Login page ──────────────────────────────────────────────────────────────
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState<Role>('business');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Show banner only in browser (not in native app shell)
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone) setShowBanner(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('נא למלא את כל השדות');
      return;
    }
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (loginUser.fulfilled.match(result)) {
        toast.success('ברוך הבא!');
        navigate('/dashboard');
      } else {
        toast.error((result.payload as string) || 'פרטי כניסה שגויים');
      }
    } catch {
      toast.error('שגיאה בכניסה למערכת');
    } finally {
      setIsLoading(false);
    }
  };

  const cfg = roleConfig[selectedRole];

  return (
    <div dir="rtl" className="min-h-screen flex" style={{ background: '#f6f9fc' }}>

      {/* ── LEFT — Brand panel ─────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #061b31 0%, #1c1e54 60%, #533afd 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute pointer-events-none rounded-full" style={{ top: '-80px', left: '-80px', width: '320px', height: '320px', background: 'rgba(83,58,253,0.15)' }} />
        <div className="absolute pointer-events-none rounded-full" style={{ bottom: '-60px', right: '-60px', width: '240px', height: '240px', background: 'rgba(234,34,97,0.10)' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div
            className="w-11 h-11 rounded-[10px] flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)', boxShadow: '0 8px 20px rgba(83,58,253,0.35)' }}
          >
            <TruckIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-lg leading-tight tracking-tight">אשדוד-שליח</p>
            <p className="text-white/45 text-[12px]">פלטפורמת המשלוחים החכמה</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative flex-1 flex flex-col justify-center py-10 z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 self-start"
            style={{ background: 'rgba(83,58,253,0.20)', border: '1px solid rgba(83,58,253,0.35)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#533afd] animate-pulse" />
            <span className="text-[12px] font-semibold text-white/70">פעיל 24/7 באשדוד</span>
          </div>
          <h1 className="text-white text-[2.4rem] font-black leading-[1.15] mb-4 tracking-tight">
            המשלוח החכם<br />
            <span style={{ background: 'linear-gradient(90deg, #533afd, #ea2261)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              של אשדוד
            </span>
          </h1>
          <p className="text-white/55 text-[15px] mb-10 max-w-[280px] leading-relaxed">
            מערכת ניהול משלוחים חכמה עם מפה חיה, צ׳אט מובנה, וניהול שליחים בזמן אמת.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-white text-[13px] font-semibold">{f.title}</p>
                  <p className="text-white/45 text-[12px] mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* App download – desktop left panel */}
        <div
          className="relative z-10 rounded-[12px] p-4 flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <DevicePhoneMobileIcon className="w-8 h-8 text-white/70 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-white text-[12px] font-bold">📱 האפליקציה בקרוב!</p>
            <p className="text-white/45 text-[11px]">App Store ו-Google Play</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toast('בקרוב ב-App Store! 🍎')} className="px-3 py-1.5 rounded-[7px] text-[11px] font-bold text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>🍎</button>
            <button onClick={() => toast('בקרוב ב-Google Play! 🤖')} className="px-3 py-1.5 rounded-[7px] text-[11px] font-bold text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>🤖</button>
          </div>
        </div>
      </div>

      {/* ── RIGHT — Login form ──────────────────────────────────────────────── */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 overflow-y-auto" style={{ background: '#ffffff' }}>
        <div className="w-full max-w-[420px] py-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-9 h-9 rounded-[8px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}>
              <TruckIcon className="w-5 h-5 text-white" />
            </div>
            <p className="font-black text-lg" style={{ color: '#061b31' }}>אשדוד-שליח</p>
          </div>

          {/* App download banner — mobile/tablet only */}
          {showBanner && (
            <div className="lg:hidden">
              <AppDownloadBanner />
            </div>
          )}

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-[1.75rem] font-black mb-1 leading-tight tracking-tight" style={{ color: '#061b31' }}>
              כניסה למערכת
            </h2>
            <p className="text-[14px]" style={{ color: '#8898aa' }}>
              בחר את סוג החשבון שלך
            </p>
          </div>

          {/* ── Role selector ── */}
          <div className="flex gap-3 mb-6">
            {(['business', 'courier', 'admin'] as Role[]).map((r) => (
              <RoleCard key={r} role={r} selected={selectedRole === r} onSelect={() => setSelectedRole(r)} />
            ))}
          </div>

          {/* Role context label */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] mb-6"
            style={{ background: cfg.color + '0d', border: `1px solid ${cfg.color}25` }}
          >
            <span style={{ color: cfg.color }}>{roleConfig[selectedRole].icon}</span>
            <p className="text-[13px] font-semibold" style={{ color: cfg.color }}>
              {selectedRole === 'business' && 'כניסה לפורטל עסקים'}
              {selectedRole === 'courier' && 'כניסה לפורטל שליחים'}
              {selectedRole === 'admin' && 'כניסה לפאנל ניהול'}
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="כתובת אימייל"
              type="email"
              placeholder="your@email.com"
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
                style={{ color: cfg.color }}
                onClick={() => toast('שחזור סיסמה — בקרוב!')}
              >
                שכחת סיסמה?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
              style={{
                background: isLoading ? undefined : cfg.grad,
              }}
            >
              {!isLoading && `כניסה כ${selectedRole === 'business' ? 'עסק' : selectedRole === 'courier' ? 'שליח' : 'מנהל'} ←`}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: '#e8ecf0' }} />
            <span className="text-[12px]" style={{ color: '#c1cdd8' }}>או</span>
            <div className="flex-1 h-px" style={{ background: '#e8ecf0' }} />
          </div>

          {/* Register cards */}
          {selectedRole !== 'admin' && (
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/register?type=business"
                className="flex flex-col items-center gap-2 py-4 rounded-[12px] border-2 transition-all hover:shadow-md"
                style={{ borderColor: '#ea226120', background: '#ea22610a' }}
              >
                <BuildingStorefrontIcon className="w-6 h-6" style={{ color: '#ea2261' }} />
                <div className="text-center">
                  <p className="text-[13px] font-bold" style={{ color: '#ea2261' }}>הרשמה כעסק</p>
                  <p className="text-[10px]" style={{ color: '#8898aa' }}>מסעדה, מכולת ועוד</p>
                </div>
              </Link>
              <Link
                to="/register?type=courier"
                className="flex flex-col items-center gap-2 py-4 rounded-[12px] border-2 transition-all hover:shadow-md"
                style={{ borderColor: '#00b09020', background: '#00b0900a' }}
              >
                <UserGroupIcon className="w-6 h-6" style={{ color: '#00b090' }} />
                <div className="text-center">
                  <p className="text-[13px] font-bold" style={{ color: '#00b090' }}>הרשמה כשליח</p>
                  <p className="text-[10px]" style={{ color: '#8898aa' }}>הצטרף לצוות השליחים</p>
                </div>
              </Link>
            </div>
          )}

          {/* App download — desktop (below form) */}
          {showBanner && (
            <div className="hidden lg:block mt-6">
              <AppDownloadBanner />
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-[11px] mt-6" style={{ color: '#c1cdd8' }}>
            © {new Date().getFullYear()} אשדוד-שליח · כל הזכויות שמורות
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
