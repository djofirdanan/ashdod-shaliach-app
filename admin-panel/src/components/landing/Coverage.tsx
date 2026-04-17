import React from 'react';
import { MapPin } from '@phosphor-icons/react';
import { PLACEHOLDER_coverageNeighborhoods } from './content';

const Coverage: React.FC = () => {
  return (
    <section
      dir="rtl"
      className="bg-canvas py-20 md:py-28 border-b border-borderEditorial"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <p className="text-[12px] uppercase tracking-[0.18em] text-inkMuted mb-3">
          אזור שירות · coverage
        </p>
        <h2 className="font-serif text-ink mb-4" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400 }}>
          פועלים היום בכל שכונות <em className="italic" style={{ color: '#ea2261' }}>אשדוד</em>.
        </h2>
        <p className="text-inkMuted text-[16px] max-w-2xl mb-14">
          לא גוררים משלוחים מתל אביב. לא מפסידים זמן בדרך. רק אשדוד — רק מקומי.
        </p>

        <div className="grid md:grid-cols-[1.2fr_1fr] gap-10 md:gap-14 items-start">
          {/* Stylized map */}
          <div
            className="rounded-lg border border-ink bg-white aspect-[4/3] relative overflow-hidden"
            aria-label="מפה של אשדוד"
          >
            {/* Simplified map illustration — can be replaced with SVG later */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 400 300" className="w-full h-full" aria-hidden="true">
                <rect width="400" height="300" fill="#fbfaf6" />
                {/* Coastline */}
                <path d="M20,60 Q60,80 90,120 Q100,160 130,200 Q180,240 260,250 Q340,240 380,200 L380,290 L20,290 Z" fill="#f3f0e5" stroke="#e8e6dc" strokeWidth="1" />
                {/* Street grid */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <line key={`h${i}`} x1="60" y1={90 + i * 30} x2="370" y2={90 + i * 30} stroke="#e8e6dc" strokeWidth="0.5" />
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                  <line key={`v${i}`} x1={80 + i * 38} y1="80" x2={80 + i * 38} y2="280" stroke="#e8e6dc" strokeWidth="0.5" />
                ))}
                {/* Pin cluster */}
                {[
                  [140, 140], [200, 160], [260, 150], [180, 200], [240, 210],
                  [160, 180], [220, 180], [280, 200], [300, 170], [120, 200],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="4" fill="#533afd" opacity="0.75" />
                ))}
                {/* ZOOZ label */}
                <text x="200" y="60" textAnchor="middle" fontFamily="Georgia, serif" fontSize="14" fill="#111">אשדוד</text>
              </svg>
            </div>
          </div>

          {/* Neighborhoods list */}
          <div>
            <h3 className="font-serif text-ink text-[18px] mb-4 flex items-center gap-2" style={{ fontWeight: 400 }}>
              <MapPin size={18} weight="light" />
              שכונות מכוסות
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px] text-inkMuted">
              {PLACEHOLDER_coverageNeighborhoods.map((n) => (
                <li key={n} className="border-b border-borderEditorial pb-1">{n}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Coverage;
