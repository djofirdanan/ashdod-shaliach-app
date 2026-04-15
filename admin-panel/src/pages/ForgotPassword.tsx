import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TruckIcon, EnvelopeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { createResetToken } from '../services/storage.service';
import { sendPasswordReset } from '../services/email.service';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('נא להזין כתובת אימייל');
      return;
    }

    setIsLoading(true);
    try {
      const result = createResetToken(email.trim());

      if (!result) {
        // Don't reveal whether email exists — just show success
        setSent(true);
        return;
      }

      // Build reset link
      const origin = window.location.origin;
      const resetLink = `${origin}/reset-password?token=${result.token}`;

      // Fire email (don't wait — show success immediately to avoid timing attacks)
      sendPasswordReset(email.trim(), resetLink).catch(() => {});
      setSent(true);
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
      {/* Card */}
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

        {sent ? (
          // ── Success state ──────────────────────────────────────
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'linear-gradient(135deg, #533afd18, #ea226118)' }}
            >
              <EnvelopeIcon className="w-8 h-8" style={{ color: '#533afd' }} />
            </div>
            <h2 className="text-[1.4rem] font-black mb-2" style={{ color: '#061b31' }}>
              בדוק את המייל שלך!
            </h2>
            <p className="text-[14px] leading-relaxed mb-6" style={{ color: '#6b7c93' }}>
              אם הכתובת <strong dir="ltr">{email}</strong> קיימת במערכת, שלחנו לך קישור לאיפוס סיסמה.
            </p>
            <div
              className="rounded-xl p-4 mb-6 text-right text-[13px]"
              style={{ background: '#fff8e1', border: '1px solid #f59e0b30', color: '#92400e' }}
            >
              ⏰ הקישור תקף לשעה אחת. בדוק גם בתיקיית הספאם.
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-[13px] font-semibold"
              style={{ color: '#533afd' }}
            >
              <ArrowRightIcon className="w-4 h-4" />
              חזרה לכניסה
            </Link>
          </div>
        ) : (
          // ── Form state ─────────────────────────────────────────
          <>
            <h2 className="text-[1.5rem] font-black mb-1" style={{ color: '#061b31' }}>
              שכחת סיסמה?
            </h2>
            <p className="text-[14px] mb-7" style={{ color: '#8898aa' }}>
              הזן את המייל שלך ונשלח קישור לאיפוס
            </p>

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

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full"
              >
                {!isLoading && 'שלח קישור לאיפוס →'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium"
                style={{ color: '#8898aa' }}
              >
                <ArrowRightIcon className="w-3.5 h-3.5" />
                חזרה לכניסה
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
