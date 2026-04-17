import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { businessValueProps, anchors } from './content';

const BusinessSection: React.FC = () => {
  return (
    <section
      id={anchors.forBusinesses}
      dir="rtl"
      className="bg-canvas py-20 md:py-28 border-b border-borderEditorial"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <p className="text-[12px] uppercase tracking-[0.18em] text-inkMuted mb-3">
          לעסקים · for businesses
        </p>
        <h2 className="font-serif text-ink mb-4" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400 }}>
          כל הכלים <em className="italic" style={{ color: '#ea2261' }}>לנהל</em> את המשלוחים שלך.
        </h2>
        <p className="text-inkMuted text-[16px] max-w-2xl mb-14">
          מסעדה, מכולת, בית מרקחת או חנות. אם אתם שולחים — ZOOZ הופך את זה לפשוט.
        </p>

        <div className="grid md:grid-cols-[1.1fr_1fr] gap-10 md:gap-14 items-start">
          {/* Tiles */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {businessValueProps.map((v, i) => (
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

          {/* Screenshot placeholder */}
          <div
            className="rounded-lg border border-borderEditorial bg-white aspect-[4/3] flex items-center justify-center text-inkMuted text-[13px]"
            aria-label="צילום מסך של דשבורד העסקים"
          >
            {/* TODO: replace with real screenshot — admin-panel/public/landing/business-dashboard.png */}
            מסך דשבורד לעסקים
          </div>
        </div>

        <div className="mt-10">
          <Link
            to="/register?type=business"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink border-b border-ink pb-1 hover:text-primary hover:border-primary transition-colors"
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
