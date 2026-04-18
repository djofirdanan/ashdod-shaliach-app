import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChartBar, MapPin, ChatCircle, Gauge } from '@phosphor-icons/react';
import { businessValueProps, anchors } from './content';

const propIcons = [
  <Gauge size={22} weight="bold" />,
  <MapPin size={22} weight="bold" />,
  <ChartBar size={22} weight="bold" />,
  <ChatCircle size={22} weight="bold" />,
];

const BusinessSection: React.FC = () => {
  return (
    <section
      id={anchors.forBusinesses}
      dir="rtl"
      style={{
        background:   'var(--zooz-bg)',
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
          לעסקים · for businesses
        </p>

        {/* Heading */}
        <h2
          className="font-black mb-4"
          style={{ fontSize: 'clamp(26px, 4vw, 42px)', color: 'var(--zooz-text1)' }}
        >
          כל הכלים{' '}
          <span
            className="px-2 rounded-lg"
            style={{ background: 'var(--zooz-yellow)', color: 'var(--zooz-text1)' }}
          >
            לנהל
          </span>
          {' '}את המשלוחים שלך.
        </h2>
        <p
          className="text-[16px] max-w-2xl mb-14"
          style={{ color: 'var(--zooz-text2)', lineHeight: 1.7 }}
        >
          מסעדה, מכולת, בית מרקחת או חנות. אם אתם שולחים — ZOOZ הופך את זה לפשוט.
        </p>

        <div className="grid md:grid-cols-[1.1fr_1fr] gap-10 md:gap-14 items-start">
          {/* Value prop tiles */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {businessValueProps.map((v, i) => (
              <li
                key={i}
                style={{
                  background:   'var(--zooz-bg-card)',
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

          {/* Screenshot / mockup placeholder */}
          <div
            className="aspect-[4/3] flex items-center justify-center text-[13px] font-medium"
            aria-label="צילום מסך של דשבורד העסקים"
            style={{
              background:   'var(--zooz-bg-card)',
              border:       '2px dashed var(--zooz-border-strong)',
              borderRadius: 'var(--zooz-radius-card)',
              color:        'var(--zooz-text3)',
            }}
          >
            מסך דשבורד לעסקים
          </div>
        </div>

        <div className="mt-10">
          <Link
            to="/register?type=business"
            className="inline-flex items-center gap-2 font-bold text-[15px] px-6 py-3 transition-all active:scale-95"
            style={{
              background:   'var(--zooz-text1)',
              color:        '#FFFFFF',
              borderRadius: 'var(--zooz-radius-btn)',
            }}
          >
            הצטרפות כעסק
            <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BusinessSection;
