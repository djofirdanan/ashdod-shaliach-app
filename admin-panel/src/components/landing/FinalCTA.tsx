import React from 'react';
import { Link } from 'react-router-dom';
import { finalCta } from './content';

const FinalCTA: React.FC = () => {
  return (
    <section dir="rtl" className="bg-canvas py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
        <h2 className="font-serif text-ink mb-4" style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 400 }}>
          {finalCta.headline}
        </h2>
        <p className="text-inkMuted text-[16px] md:text-[17px] mb-10">{finalCta.sub}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register?type=business"
            className="inline-flex items-center justify-center px-8 py-3 rounded text-white font-semibold text-[15px]"
            style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
          >
            {finalCta.businessLabel}
          </Link>
          <Link
            to="/register?type=courier"
            className="inline-flex items-center justify-center px-8 py-3 rounded text-ink font-semibold text-[15px] border border-ink"
          >
            {finalCta.courierLabel}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
