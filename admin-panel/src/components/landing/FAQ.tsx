import React from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { faqItems, anchors } from './content';

const FAQ: React.FC = () => {
  return (
    <section
      id={anchors.faq}
      dir="rtl"
      className="bg-canvas py-20 md:py-28 border-b border-borderEditorial"
    >
      <div className="max-w-3xl mx-auto px-5 md:px-8">
        <p className="text-[12px] uppercase tracking-[0.18em] text-inkMuted mb-3">
          שאלות נפוצות · FAQ
        </p>
        <h2 className="font-serif text-ink mb-12" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400 }}>
          שאלות <em className="italic" style={{ color: '#ea2261' }}>שכדאי</em> לשאול.
        </h2>

        <ul className="border-t border-ink">
          {faqItems.map((item, i) => (
            <li key={i} className="border-b border-ink">
              <details className="group">
                <summary className="list-none flex items-center justify-between cursor-pointer py-5 text-ink text-[16px] font-semibold">
                  <span>{item.q}</span>
                  <CaretDown
                    size={18}
                    weight="light"
                    className="transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="pb-6 text-inkMuted text-[15px] leading-relaxed">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FAQ;
