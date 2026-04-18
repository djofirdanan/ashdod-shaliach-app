import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lightning } from '@phosphor-icons/react';
import { heroContent, heroStats, anchors, type Audience } from './content';

const Hero: React.FC = () => {
  const [tab, setTab] = useState<Audience>('business');
  const c = heroContent[tab];

  return (
    <section
      dir="rtl"
      style={{
        background: 'var(--zooz-bg)',
        borderBottom: '1px solid var(--zooz-border)',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-28 w-full text-center">

        {/* Toggle tabs */}
        <div
          dir="rtl"
          className="inline-flex mb-10 p-1 rounded-xl"
          role="tablist"
          style={{
            background: 'var(--zooz-bg-input)',
            gap: 4,
          }}
        >
          {(['business', 'courier'] as Audience[]).map((t) => {
            const label = t === 'business' ? '🏪 לעסקים' : '🛵 לשליחים';
            const active = tab === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t)}
                className="px-5 py-2 rounded-lg text-[14px] font-bold transition-all"
                style={{
                  background:   active ? 'var(--zooz-yellow)' : 'transparent',
                  color:        active ? 'var(--zooz-text1)'   : 'var(--zooz-text2)',
                  boxShadow:    active ? 'var(--zooz-shadow)'   : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Headline */}
        <h1
          className="font-black leading-[1.1] tracking-tight mb-6"
          style={{
            fontSize: 'clamp(36px, 6vw, 68px)',
            color: 'var(--zooz-text1)',
          }}
        >
          {c.headlineLead}
          <span
            className="inline-block mx-2 px-3 py-0 rounded-lg"
            style={{ background: 'var(--zooz-yellow)', color: 'var(--zooz-text1)' }}
          >
            {c.headlineAccent}
          </span>
          {c.headlineTail}
        </h1>

        {/* Sub */}
        <p
          className="mx-auto mb-10 max-w-xl"
          style={{
            fontSize: 'clamp(15px, 1.6vw, 18px)',
            color: 'var(--zooz-text2)',
            lineHeight: 1.7,
          }}
        >
          {c.sub}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center mb-16">
          <Link
            to={c.registerHref}
            className="inline-flex items-center justify-center gap-2 font-bold text-[16px] transition-all active:scale-95"
            style={{
              background:   'var(--zooz-text1)',
              color:        '#FFFFFF',
              padding:      '14px 32px',
              borderRadius: 'var(--zooz-radius-btn)',
            }}
          >
            <Lightning size={18} weight="fill" />
            {c.primaryCta}
          </Link>
          <a
            href={`#${anchors.howItWorks}`}
            className="inline-flex items-center justify-center gap-2 font-semibold text-[15px] transition-all"
            style={{
              border:       '2px solid var(--zooz-border-strong)',
              color:        'var(--zooz-text1)',
              padding:      '12px 28px',
              borderRadius: 'var(--zooz-radius-btn)',
            }}
          >
            {c.secondaryCta}
            <ArrowLeft size={16} />
          </a>
        </div>

        {/* Proof strip — only shown when there's data */}
        {heroStats.length > 0 && (
          <ul
            className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[13px]"
            style={{ color: 'var(--zooz-text2)' }}
          >
            {heroStats.map((s, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span
                  className="font-black text-[20px]"
                  style={{ color: 'var(--zooz-text1)' }}
                >
                  {s.value}
                </span>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default Hero;
