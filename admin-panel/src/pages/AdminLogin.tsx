import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginUser } from '../store/authSlice';
import { LockClosedIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (loginUser.fulfilled.match(result)) {
        navigate('/dashboard');
      } else {
        toast.error('פרטים שגויים');
      }
    } catch {
      toast.error('שגיאה');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#060e1a' }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[340px] rounded-2xl p-8 flex flex-col gap-5"
        style={{
          background: '#0d1b2e',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        dir="rtl"
      >
        {/* Logo mark */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
          >
            <LockClosedIcon className="w-6 h-6 text-white" />
          </div>
          <p className="text-white/30 text-xs tracking-widest uppercase">Secure Access</p>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
            אימייל
          </label>
          <div className="relative">
            <EnvelopeIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              dir="ltr"
              placeholder="your@email.com"
              className="w-full pr-9 pl-3 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(83,58,253,0.55)'; }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'; }}
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
            סיסמה
          </label>
          <div className="relative">
            <LockClosedIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              dir="ltr"
              placeholder="••••••••"
              className="w-full pr-9 pl-3 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(83,58,253,0.55)'; }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'; }}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed mt-1"
          style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
        >
          {isLoading ? '...' : 'כניסה'}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;
