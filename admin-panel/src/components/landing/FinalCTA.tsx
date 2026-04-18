import React from 'react';
import { Link } from 'react-router-dom';
import { Storefront, Motorcycle } from '@phosphor-icons/react';
import { finalCta } from './content';

const FinalCTA: React.FC = () => {
  return (
    <section
      dir="rtl"
      style={{
        background: 'var(--zooz-text1)',
        padding:    'clamp(64px, 10vw, 112px) 0',
      }}
    >
      <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
        <h2
          className="font-black mb-5"
          style={{
            fontSize: 'clamp(32px, 6vw, 56px)',
            color:    '#FFFFFF',
          }}
        >
          {finalCta.headline}
        </h2>
        <p
          className="text-[16px] md:text-[18px] mb-12"
          style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}
        >
          {finalCta.sub}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register?type=business"
            className="inline-flex items-center justify-center gap-2 font-bold text-[16px] px-8 py-4 transition-all active:scale-95"
            style={{
              background:   'var(--zooz-yellow)',
              color:        'var(--zooz-text1)',
              borderRadius: 'var(--zooz-radius-btn)',
            }}
          >
            <Storefront size={20} weight="bold" />
            {finalCta.businessLabel}
          </Link>
          <Link
            to="/register?type=courier"
            className="inline-flex items-center justify-center gap-2 font-bold text-[16px] px-8 py-4 transition-all"
            style={{
              border:       '2px solid rgba(255,255,255,0.25)',
              color:        '#FFFFFF',
              borderRadius: 'var(--zooz-radius-btn)',
            }}
          >
            <Motorcycle size={20} weight="bold" />
            {finalCta.courierLabel}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
