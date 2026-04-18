import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CurrencyCircleDollar, NavigationArrow, Headset, Users } from '@phosphor-icons/react';
import { courierValueProps, anchors } from './content';

const propIcons = [
  <CurrencyCircleDollar size={22} weight="bold" />,
  <NavigationArrow size={22} weight="bold" />,
  <Headset size={22} weight="bold" />,
  <Users size={22} weight="bold" />,
];

const CourierSection: React.FC = () => {
  return (
    <section
      id={anchors.forCouriers}
      dir="rtl"
      style={{
        background:   'var(--zooz-bg-card)',
        borderBottom: '1px solid var(--zooz-border)',
        padding:      'clamp(48px, 7vw, 96px) 0',
      }}
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        {/* Label */}
        <p
          className="text-[11px] uppercase tracking-[0.2em] font-bold mb-3"
          style={{ color: 'var(--zooz-text3)' }}
        >
          לשליחים · for couriers
        </p>

        {/* Heading */}
        <h2
          className="font-black mb-4"
          style={{ fontSize: 'clamp(26px, 4vw, 42px)', color: 'var(--zooz-text1)' }}
        >
          עבודה{' '}
          <span
            className="px-2 rounded-lg"
            style={{ background: 'var(--zooz-yellow)', color: 'var(--zooz-text1)' }}
          >
            שמכבדת
          </span>
          {' '}את הזמן שלך.
        </h2>
        <p
          className="text-[16px] max-w-2xl mb-14"
          style={{ color: 'var(--zooz-text2)', lineHeight: 1.7 }}
        >
          בחר משלוחים לפי המרחק, הרכב, והשעות שלך. בלי לחץ, בלי מנהל מעל הכתף.
        </p>

        <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-14 items-start">
          {/* Screenshot / mockup placeholder */}
          <div
            className="aspect-[4/3] flex items-center justify-center text-[13px] font-medium order-last md:order-first"
            aria-label="צילום מסך של אפליקציית השליחים"
            style={{
              background:   'var(--zooz-bg)',
              border:       '2px dashed var(--zooz-border-strong)',
              borderRadius: 'var(--zooz-radius-card)',
              color:        'var(--zooz-text3)',
            }}
          >
            מסך אפליקציית שליחים
          </div>

          {/* Value prop tiles */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courierValueProps.map((v, i) => (
              <li
                key={i}
                style={{
                  background:   'var(--zooz-bg)',
                  border:       '1px solid var(--zooz-border)',
                  borderRadius: 'var(--zooz-radius-card)',
                  padding:      '20px',
                  boxShadow:    'var(--zooz-shadow)',
                }}
              >
                <div
                  className="flex items-center justify-center rounded-xl mb-3"
                  style={{
                    width:      40,
                    height:     40,
                    background: 'var(--zooz-yellow)',
                    color:      'var(--zooz-text1)',
                  }}
                >
                  {propIcons[i] ?? propIcons[0]}
                </div>
                <h3
                  className="font-bold text-[16px] mb-1"
                  style={{ color: 'var(--zooz-text1)' }}
                >
                  {v.title}
                </h3>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: 'var(--zooz-text2)' }}
                >
                  {v.desc}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <Link
            to="/register?type=courier"
            className="inline-flex items-center gap-2 font-bold text-[15px] px-6 py-3 transition-all active:scale-95"
            style={{
              background:   'var(--zooz-text1)',
              color:        '#FFFFFF',
              borderRadius: 'var(--zooz-radius-btn)',
            }}
          >
            הצטרפות כשליח
            <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CourierSection;
