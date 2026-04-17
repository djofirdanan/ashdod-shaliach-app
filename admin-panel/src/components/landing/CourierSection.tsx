import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { courierValueProps, anchors } from './content';

const CourierSection: React.FC = () => {
  return (
    <section
      id={anchors.forCouriers}
      dir="rtl"
      className="bg-canvas py-20 md:py-28 border-b border-borderEditorial"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <p className="text-[12px] uppercase tracking-[0.18em] text-inkMuted mb-3">
          לשליחים · for couriers
        </p>
        <h2 className="font-serif text-ink mb-4" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400 }}>
          עבודה <em className="italic" style={{ color: '#ea2261' }}>שמכבדת</em> את הזמן שלך.
        </h2>
        <p className="text-inkMuted text-[16px] max-w-2xl mb-14">
          בחר משלוחים לפי המרחק, הרכב, והשעות שלך. בלי לחץ, בלי מנהל מעל הכתף.
        </p>

        <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-14 items-start">
          {/* Screenshot placeholder */}
          <div
            className="rounded-lg border border-borderEditorial bg-white aspect-[4/3] flex items-center justify-center text-inkMuted text-[13px] order-last md:order-first"
            aria-label="צילום מסך של אפליקציית השליחים"
          >
            {/* TODO: replace with real screenshot — admin-panel/public/landing/courier-app.png */}
            מסך אפליקציית שליחים
          </div>

          {/* Tiles */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courierValueProps.map((v, i) => (
              <li
                key={i}
                className="border border-borderEditorial bg-white rounded-lg p-5 shadow-editorial-card"
              >
                <h3 className="font-serif text-ink text-[18px] mb-2" style={{ fontWeight: 400 }}>
                  {v.title}
                </h3>
                <p className="text-inkMuted text-[14px] leading-relaxed">{v.desc}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <Link
            to="/register?type=courier"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink border-b border-ink pb-1 hover:text-primary hover:border-primary transition-colors"
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
