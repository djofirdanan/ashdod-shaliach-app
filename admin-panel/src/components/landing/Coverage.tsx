import React from 'react';
import { MapPin } from '@phosphor-icons/react';
import { PLACEHOLDER_coverageNeighborhoods } from './content';

const Coverage: React.FC = () => {
  return (
    <section
      dir="rtl"
      style={{
        background:   'var(--zooz-bg)',
        borderBottom: '1px solid var(--zooz-border)',
        padding:      'clamp(48px, 7vw, 96px) 0',
      }}
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <p
          className="text-[11px] uppercase tracking-[0.2em] font-bold mb-3"
          style={{ color: 'var(--zooz-text3)' }}
        >
          אזור שירות · coverage
        </p>
        <h2
          className="font-black mb-4"
          style={{ fontSize: 'clamp(26px, 4vw, 42px)', color: 'var(--zooz-text1)' }}
        >
          פועלים היום בכל שכונות{' '}
          <span
            className="px-2 rounded-lg"
            style={{ background: 'var(--zooz-yellow)', color: 'var(--zooz-text1)' }}
          >
            אשדוד
          </span>.
        </h2>
        <p
          className="text-[16px] max-w-2xl mb-14"
          style={{ color: 'var(--zooz-text2)', lineHeight: 1.7 }}
        >
          לא גוררים משלוחים מתל אביב. לא מפסידים זמן בדרך. רק אשדוד — רק מקומי.
        </p>

        <div className="grid md:grid-cols-[1.2fr_1fr] gap-10 md:gap-14 items-start">
          {/* Map illustration */}
          <div
            className="aspect-[4/3] relative overflow-hidden"
            aria-label="מפה של אשדוד"
            style={{
              borderRadius: 'var(--zooz-radius-card)',
              border:       '1px solid var(--zooz-border)',
              background:   'var(--zooz-bg-card)',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 400 300" className="w-full h-full" aria-hidden="true">
                <rect width="400" height="300" fill="var(--zooz-bg-card, #FAFAFA)" />
                {/* Coastline */}
                <path
                  d="M20,60 Q60,80 90,120 Q100,160 130,200 Q180,240 260,250 Q340,240 380,200 L380,290 L20,290 Z"
                  fill="#F5F5F7"
                  stroke="#EFEFEF"
                  strokeWidth="1"
                />
                {/* Street grid */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <line key={`h${i}`} x1="60" y1={90 + i * 30} x2="370" y2={90 + i * 30} stroke="#EFEFEF" strokeWidth="0.5" />
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                  <line key={`v${i}`} x1={80 + i * 38} y1="80" x2={80 + i * 38} y2="280" stroke="#EFEFEF" strokeWidth="0.5" />
                ))}
                {/* Pin cluster — yellow ZOOZ pins */}
                {[
                  [140, 140], [200, 160], [260, 150], [180, 200], [240, 210],
                  [160, 180], [220, 180], [280, 200], [300, 170], [120, 200],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="5" fill="#FFE500" stroke="#0A0A0F" strokeWidth="1.5" />
                ))}
                {/* City label */}
                <text
                  x="200" y="55"
                  textAnchor="middle"
                  fontFamily="'Noto Sans Hebrew', sans-serif"
                  fontSize="13"
                  fontWeight="700"
                  fill="#0A0A0F"
                >
                  אשדוד
                </text>
              </svg>
            </div>
          </div>

          {/* Neighborhoods list */}
          <div>
            <h3
              className="font-bold text-[18px] mb-4 flex items-center gap-2"
              style={{ color: 'var(--zooz-text1)' }}
            >
              <MapPin size={20} weight="bold" color="var(--zooz-yellow)" />
              שכונות מכוסות
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]" style={{ color: 'var(--zooz-text2)' }}>
              {PLACEHOLDER_coverageNeighborhoods.map((n) => (
                <li
                  key={n}
                  className="pb-2"
                  style={{ borderBottom: '1px solid var(--zooz-border)' }}
                >
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Coverage;
