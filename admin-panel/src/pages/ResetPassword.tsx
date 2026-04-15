import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  TruckIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { verifyResetToken, applyResetToken } from '../services/storage.service';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [tokenValid, setTokenValid] = useState<boolean | null>(null); // null = loading
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    const record = verifyResetToken(token);
    setTokenValid(!!record);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('הסיסמאות אינן תואמות');
      return;
    }

    setIsLoading(true);
    try {
      const ok = applyResetToken(token, password);
      if (!ok) {
        toast.error('הקישור פג תוקף. בקש קישור חדש.');
        setTokenValid(false);
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch {
      toast.error('שגיאה. נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#f6f9fc' }}
    >
      <div
        className="w-full max-w-[420px] bg-white rounded-2xl p-8"
        style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.09)', border: '1px solid #e8ecf0' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
          >
            <TruckIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-[15px] leading-tight" style={{ color: '#061b31' }}>אשדוד-שליח</p>
            <p className="text-[11px]" style={{ color: '#8898aa' }}>פלטפורמת המשלוחים</p>
          </div>
        </div>

        {/* Loading */}
        {tokenValid === null && (
          <div className="text-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-purple-200 border-t-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-[14px]" style={{ color: '#8898aa' }}>בודק קישור...</p>
          </div>
        )}

        {/* Invalid token */}
        {tokenValid === false && (
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(234,34,97,0.08)' }}
            >
              <ExclamationTriangleIcon className="w-8 h-8" style={{ color: '#ea2261' }} />
            </div>
            <h2 className="text-[1.3rem] font-black mb-2" style={{ color: '#061b31' }}>
              קישור לא תקף
            </h2>
            <p className="text-[14px] mb-6 leading-relaxed" style={{ color: '#6b7c93' }}>
              הקישור פג תוקף או כבר נוצל. ניתן לבקש קישור חדש.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
            >
              בקש קישור חדש →
            </Link>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(29,185,84,0.10)' }}
            >
              <CheckCircleIcon className="w-9 h-9" style={{ color: '#1db954' }} />
            </div>
            <h2 className="text-[1.4rem] font-black mb-2" style={{ color: '#061b31' }}>
              סיסמה עודכנה! ✅
            </h2>
            <p className="text-[14px] mb-4" style={{ color: '#6b7c93' }}>
              עוברים לדף הכניסה...
            </p>
            <Link to="/login" className="text-[13px] font-semibold" style={{ color: '#533afd' }}>
              לחץ כאן אם לא עברת אוטומטית
            </Link>
          </div>
        )}

        {/* Form */}
        {tokenValid === true && !success && (
          <>
            <h2 className="text-[1.5rem] font-black mb-1" style={{ color: '#061b31' }}>
              סיסמה חדשה
            </h2>
            <p className="text-[14px] mb-7" style={{ color: '#8898aa' }}>
              בחר סיסמה חזקה (לפחות 6 תווים)
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password field with show/hide toggle */}
              <div className="relative">
                <Input
                  label="סיסמה חדשה"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  leftIcon={<LockClosedIcon className="w-4 h-4" />}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute left-3 bottom-[11px] p-0.5"
                  style={{ color: '#8898aa' }}
                  tabIndex={-1}
                >
                  {showPw
                    ? <EyeSlashIcon className="w-4 h-4" />
                    : <EyeIcon className="w-4 h-4" />
                  }
                </button>
              </div>

              <Input
                label="אישור סיסמה"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                dir="ltr"
                leftIcon={<LockClosedIcon className="w-4 h-4" />}
              />

              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => {
                      const strength = Math.min(Math.floor(password.length / 3), 4);
                      const colors = ['#ea2261', '#f59e0b', '#f59e0b', '#1db954'];
                      return (
                        <div
                          key={i}
                          className="flex-1 h-1 rounded-full transition-all"
                          style={{
                            background: i < strength ? colors[strength - 1] : '#e8ecf0',
                          }}
                        />
                      );
                    })}
                  </div>
                  <p className="text-[11px]" style={{ color: '#8898aa' }}>
                    {password.length < 6 ? 'קצרה מדי' : password.length < 9 ? 'סיסמה סבירה' : 'סיסמה חזקה ✓'}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full"
              >
                {!isLoading && 'עדכן סיסמה ←'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
