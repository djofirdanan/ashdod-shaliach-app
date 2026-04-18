import React from 'react';
import { Quotes } from '@phosphor-icons/react';
import { heroStats, PLACEHOLDER_testimonials } from './content';

const SocialProof: React.FC = () => {
  return (
    <section dir="rtl" className="bg-canvas py-20 md:py-28 border-b border-borderEditorial">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-16 md:mb-20 border-y border-ink py-10">
          {heroStats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="font-serif text-ink" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400 }}>
                {s.value}
              </div>
              <div className="text-inkMuted text-[13px] md:text-[14px] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <h2 className="sr-only">מה אומרים עלינו</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PLACEHOLDER_testimonials.map((t, i) => (
            <figure
              key={i}
              className="border border-borderEditorial bg-white rounded-lg p-6 shadow-editorial-card flex flex-col"
            >
              <Quotes size={22} weight="fill" className="text-[color:#ea2261] mb-4" />
              <blockquote className="font-serif text-ink text-[17px] leading-relaxed flex-1" style={{ fontWeight: 400 }}>
                {t.quote}
              </blockquote>
              <figcaption className="mt-5 text-[13px]">
                <div className="text-ink font-semibold">{t.name}</div>
                <div className="text-inkMuted">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
