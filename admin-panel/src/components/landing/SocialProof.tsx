import React from 'react';
import { Quotes } from '@phosphor-icons/react';
import { heroStats, PLACEHOLDER_testimonials } from './content';

const SocialProof: React.FC = () => {
  // Don't render the section if there's no data at all
  if (heroStats.length === 0 && PLACEHOLDER_testimonials.length === 0) return null;

  return (
    <section
      dir="rtl"
      style={{
        background:   'var(--zooz-bg-card)',
        borderBottom: '1px solid var(--zooz-border)',
        padding:      'clamp(48px, 7vw, 96px) 0',
      }}
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">

        {/* Stats strip — only if data */}
        {heroStats.length > 0 && (
          <div
            className="grid gap-4 mb-16 md:mb-20 py-10"
            style={{
              gridTemplateColumns: `repeat(${heroStats.length}, 1fr)`,
              borderTop:    '2px solid var(--zooz-text1)',
              borderBottom: '2px solid var(--zooz-text1)',
            }}
          >
            {heroStats.map((s, i) => (
              <div key={i} className="text-center">
                <div
                  className="font-black"
                  style={{ fontSize: 'clamp(32px, 5vw, 52px)', color: 'var(--zooz-text1)' }}
                >
                  {s.value}
                </div>
                <div
                  className="text-[13px] md:text-[14px] mt-1"
                  style={{ color: 'var(--zooz-text2)' }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Testimonials */}
        {PLACEHOLDER_testimonials.length > 0 && (
          <>
            <h2 className="sr-only">מה אומרים עלינו</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {PLACEHOLDER_testimonials.map((t, i) => (
                <figure
                  key={i}
                  className="flex flex-col"
                  style={{
                    background:   'var(--zooz-bg)',
                    border:       '1px solid var(--zooz-border)',
                    borderRadius: 'var(--zooz-radius-card)',
                    padding:      '24px',
                    boxShadow:    'var(--zooz-shadow)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: 'var(--zooz-yellow)' }}
                  >
                    <Quotes size={18} weight="fill" color="var(--zooz-text1)" />
                  </div>
                  <blockquote
                    className="font-medium text-[16px] leading-relaxed flex-1"
                    style={{ color: 'var(--zooz-text1)' }}
                  >
                    {t.quote}
                  </blockquote>
                  <figcaption className="mt-5 text-[13px]">
                    <div className="font-bold" style={{ color: 'var(--zooz-text1)' }}>
                      {t.name}
                    </div>
                    <div style={{ color: 'var(--zooz-text2)' }}>{t.role}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default SocialProof;
