import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { List, X } from '@phosphor-icons/react';
import { anchors } from './content';

const navLinks: { label: string; href: string }[] = [
  { label: 'איך זה עובד', href: `#${anchors.howItWorks}` },
  { label: 'לעסקים', href: `#${anchors.forBusinesses}` },
  { label: 'לשליחים', href: `#${anchors.forCouriers}` },
  { label: 'שאלות נפוצות', href: `#${anchors.faq}` },
];

const LandingNav: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-200 ${
        scrolled ? 'bg-canvas/90 backdrop-blur border-b border-borderEditorial' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-8 h-16" dir="rtl">
        {/* Brand */}
        <Link to="/" className="font-serif text-xl font-semibold text-ink tracking-tight">
          ZOOZ
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8 text-[14px] text-ink">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="hover:text-primary transition-colors">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-[14px] text-ink hover:text-primary transition-colors">
            כניסה
          </Link>
          <Link
            to="/register?type=business"
            className="text-[14px] font-semibold text-white px-4 py-2 rounded"
            style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
          >
            הצטרפות
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-ink"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="תפריט"
        >
          {mobileOpen ? <X size={22} /> : <List size={22} />}
        </button>
      </nav>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div className="md:hidden bg-canvas border-t border-borderEditorial" dir="rtl">
          <ul className="px-5 py-4 space-y-3 text-[15px] text-ink">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="block py-1" onClick={() => setMobileOpen(false)}>
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link to="/login" className="block py-1" onClick={() => setMobileOpen(false)}>
                כניסה
              </Link>
            </li>
            <li>
              <Link
                to="/register?type=business"
                className="block text-center font-semibold text-white py-2 rounded mt-2"
                style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
                onClick={() => setMobileOpen(false)}
              >
                הצטרפות
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default LandingNav;
