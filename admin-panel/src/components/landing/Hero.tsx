import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { heroContent, heroStats, anchors, type Audience } from './content';

const Hero: React.FC = () => {
  const [tab, setTab] = useState<Audience>('business');
  const c = heroContent[tab];

  return (
    <section
      dir="rtl"
      className="relative border-b border-ink"
      style={{ minHeight: '78vh' }}
    >
      <div className="max-w-4xl mx-auto px-5 md:px-8 pt-14 md:pt-24 pb-16 md:pb-20 text-center">
        {/* Toggle */}
        <div className="inline-flex mb-10 text-[14px] font-medium" role="tablist">
          {(['business', 'courier'] as Audience[]).map((t) => {
            const label = t === 'business' ? 'לעסקים' : 'לשליחים';
            const active = tab === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t)}
                className={`px-4 pb-1 border-b-2 transition-colors ${
                  active ? 'border-ink text-ink' : 'border-transparent text-inkMuted hover:text-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Headline */}
        <h1 className="font-serif text-ink leading-[1.1] tracking-tight mb-6"
            style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 400 }}>
          {c.headlineLead}
          <em className="not-italic font-serif italic" style={{ color: '#ea2261' }}>
            {c.headlineAccent}
          </em>
          {c.headlineTail}
        </h1>

        {/* Sub */}
        <p className="text-inkMuted mx-auto mb-10 max-w-xl"
           style={{ fontSize: 'clamp(15px, 1.6vw, 17px)' }}>
          {c.sub}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center mb-14">
          <Link
            to={c.registerHref}
            className="inline-flex items-center justify-center px-6 py-3 rounded font-semibold text-white text-[15px]"
            style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
          >
            {c.primaryCta}
          </Link>
          <a
            href={`#${anchors.howItWorks}`}
            className="inline-flex items-center justify-center px-6 py-3 rounded font-semibold text-ink text-[15px] border border-ink"
          >
            {c.secondaryCta}
          </a>
        </div>

        {/* Proof strip */}
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] text-inkMuted">
          {heroStats.map((s, i) => (
            <li key={i} className="flex items-baseline gap-2">
              <span className="font-serif text-ink text-[18px]">{s.value}</span>
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Hero;
