import React from 'react';
import { Link } from 'react-router-dom';
import { footerContent } from './content';

const LandingFooter: React.FC = () => {
  return (
    <footer dir="rtl" className="bg-ink text-canvas">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-14">
        <div className="grid md:grid-cols-[1.2fr_1fr_1fr_1fr] gap-10 md:gap-8">
          {/* Brand */}
          <div>
            <div className="font-serif text-2xl mb-2" style={{ fontWeight: 400 }}>{footerContent.brand}</div>
            <p className="text-canvas/70 text-[13px] leading-relaxed max-w-xs">
              {footerContent.tagline}
            </p>
          </div>

          {/* Link columns */}
          {footerContent.columns.map((col) => (
            <div key={col.heading}>
              <h4 className="text-[13px] uppercase tracking-[0.18em] text-canvas/60 mb-4">
                {col.heading}
              </h4>
              <ul className="space-y-2">
                {col.links.map((l) => {
                  const isAnchor = l.href.startsWith('#');
                  const isInternal = l.href.startsWith('/');
                  return (
                    <li key={l.label}>
                      {isInternal ? (
                        <Link to={l.href} className="text-canvas/85 hover:text-canvas text-[14px] transition-colors">
                          {l.label}
                        </Link>
                      ) : (
                        <a
                          href={l.href}
                          className="text-canvas/85 hover:text-canvas text-[14px] transition-colors"
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

        <div className="mt-12 pt-6 border-t border-canvas/15 text-canvas/60 text-[12px] text-center">
          {footerContent.copyright}
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
