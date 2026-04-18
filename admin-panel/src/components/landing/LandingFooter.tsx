import React from 'react';
import { Link } from 'react-router-dom';
import { footerContent } from './content';

const LandingFooter: React.FC = () => {
  return (
    <footer
      dir="rtl"
      style={{
        background: 'var(--zooz-text1)',
        color:      '#FFFFFF',
      }}
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-14">
        <div className="grid md:grid-cols-[1.2fr_1fr_1fr_1fr] gap-10 md:gap-8">
          {/* Brand */}
          <div>
            <div
              className="font-black text-2xl mb-2"
              style={{ color: 'var(--zooz-yellow)' }}
            >
              {footerContent.brand}
            </div>
            <p
              className="text-[13px] leading-relaxed max-w-xs"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {footerContent.tagline}
            </p>
          </div>

          {/* Link columns */}
          {footerContent.columns.map((col) => (
            <div key={col.heading}>
              <h4
                className="text-[11px] uppercase tracking-[0.2em] font-bold mb-4"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                {col.heading}
              </h4>
              <ul className="space-y-2">
                {col.links.map((l) => {
                  const isInternal = l.href.startsWith('/');
                  return (
                    <li key={l.label}>
                      {isInternal ? (
                        <Link
                          to={l.href}
                          className="text-[14px] transition-colors"
                          style={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                          {l.label}
                        </Link>
                      ) : (
                        <a
                          href={l.href}
                          className="text-[14px] transition-colors"
                          style={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                          {l.label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-12 pt-6 text-[12px] text-center"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            color:     'rgba(255,255,255,0.35)',
          }}
        >
          {footerContent.copyright}
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
