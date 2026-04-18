import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { List, X, CaretDown } from '@phosphor-icons/react';
import { anchors } from './content';

const navLinks = [
  { label: 'איך זה עובד', href: `#${anchors.howItWorks}` },
  { label: 'לעסקים',      href: `#${anchors.forBusinesses}` },
  { label: 'לשליחים',     href: `#${anchors.forCouriers}` },
];

const LandingNav: React.FC = () => {
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [joinOpen,    setJoinOpen]    = useState(false);
  const [loginOpen,   setLoginOpen]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = () => { setJoinOpen(false); setLoginOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-white/90 dark:bg-[#0A0A0F]/90 backdrop-blur border-b border-[#EFEFEF] dark:border-white/8'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-8 h-16" dir="rtl">

        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 select-none">
          <img
            src="/images/zooz-logo.png"
            alt="ZOOZ"
            className="h-8 w-auto object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
          />
          <span className="font-bold text-xl tracking-tight" style={{ color: 'var(--zooz-text1)' }}>ZOOZ</span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-7 text-[14px]" style={{ color: 'var(--zooz-text2)' }}>
          {navLinks.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="hover:opacity-80 transition-opacity">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2" onClick={stopProp}>

          {/* כניסה dropdown */}
          <div className="relative">
            <button
              onClick={() => { setLoginOpen(v => !v); setJoinOpen(false); }}
              className="flex items-center gap-1 text-[14px] font-medium px-3 py-2 rounded-lg transition-colors"
              style={{ color: 'var(--zooz-text1)' }}
            >
              כניסה <CaretDown size={14} weight="bold" className={`transition-transform ${loginOpen ? 'rotate-180' : ''}`} />
            </button>
            {loginOpen && (
              <div
                className="absolute top-full mt-1 left-0 w-44 rounded-xl shadow-lg overflow-hidden z-50"
                dir="rtl"
                style={{
                  background: 'var(--zooz-bg)',
                  border: '1px solid var(--zooz-border)',
                }}
              >
                <Link
                  to="/login?role=business"
                  className="flex items-center gap-2 px-4 py-3 text-[14px] transition-colors"
                  style={{ color: 'var(--zooz-text1)' }}
                  onClick={() => setLoginOpen(false)}
                >
                  🏪 כניסה לעסק
                </Link>
                <Link
                  to="/login?role=courier"
                  className="flex items-center gap-2 px-4 py-3 text-[14px] transition-colors"
                  style={{ color: 'var(--zooz-text1)', borderTop: '1px solid var(--zooz-border)' }}
                  onClick={() => setLoginOpen(false)}
                >
                  🛵 כניסה כשליח
                </Link>
              </div>
            )}
          </div>

          {/* הצטרפות dropdown */}
          <div className="relative">
            <button
              onClick={() => { setJoinOpen(v => !v); setLoginOpen(false); }}
              className="flex items-center gap-1 text-[14px] font-bold px-4 py-2 rounded-xl transition-all"
              style={{ background: 'var(--zooz-yellow)', color: 'var(--zooz-text1)' }}
            >
              הצטרפות <CaretDown size={14} weight="bold" className={`transition-transform ${joinOpen ? 'rotate-180' : ''}`} />
            </button>
            {joinOpen && (
              <div
                className="absolute top-full mt-1 left-0 w-48 rounded-xl shadow-lg overflow-hidden z-50"
                dir="rtl"
                style={{
                  background: 'var(--zooz-bg)',
                  border: '1px solid var(--zooz-border)',
                }}
              >
                <Link
                  to="/register?type=business"
                  className="flex items-center gap-2 px-4 py-3 text-[14px] font-medium transition-colors"
                  style={{ color: 'var(--zooz-text1)' }}
                  onClick={() => setJoinOpen(false)}
                >
                  🏪 הצטרף כעסק
                </Link>
                <Link
                  to="/register?type=courier"
                  className="flex items-center gap-2 px-4 py-3 text-[14px] font-medium transition-colors"
                  style={{ color: 'var(--zooz-text1)', borderTop: '1px solid var(--zooz-border)' }}
                  onClick={() => setJoinOpen(false)}
                >
                  🛵 הצטרף כשליח
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2"
          style={{ color: 'var(--zooz-text1)' }}
          onClick={() => setMobileOpen(v => !v)}
          aria-label="תפריט"
        >
          {mobileOpen ? <X size={22} /> : <List size={22} />}
        </button>
      </nav>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div
          className="md:hidden"
          dir="rtl"
          style={{
            background: 'var(--zooz-bg)',
            borderTop: '1px solid var(--zooz-border)',
          }}
        >
          <div className="px-5 py-4 space-y-1 text-[15px]">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="block py-2"
                style={{ color: 'var(--zooz-text1)' }}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <div className="pt-3 mt-3 space-y-2" style={{ borderTop: '1px solid var(--zooz-border)' }}>
              <Link
                to="/login?role=business"
                className="block py-2"
                style={{ color: 'var(--zooz-text1)' }}
                onClick={() => setMobileOpen(false)}
              >
                כניסה לעסק
              </Link>
              <Link
                to="/login?role=courier"
                className="block py-2"
                style={{ color: 'var(--zooz-text1)' }}
                onClick={() => setMobileOpen(false)}
              >
                כניסה כשליח
              </Link>
              <Link
                to="/register?type=business"
                className="block text-center font-bold py-2.5 rounded-xl mt-2"
                style={{ background: 'var(--zooz-yellow)', color: 'var(--zooz-text1)' }}
                onClick={() => setMobileOpen(false)}
              >
                הצטרפות
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hidden admin access — bottom-left corner, invisible dot */}
      <Link
        to="/djf-2691"
        className="fixed bottom-3 left-3 z-50 w-2 h-2 rounded-full"
        style={{ background: 'transparent' }}
        aria-hidden="true"
        title="admin"
      />
    </header>
  );
};

export default LandingNav;
