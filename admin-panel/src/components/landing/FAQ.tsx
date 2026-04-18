import React, { useState } from 'react';
import { Plus, Minus } from '@phosphor-icons/react';
import { faqItems, anchors } from './content';

const FAQ: React.FC = () => {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id={anchors.faq}
      dir="rtl"
      style={{
        background:   'var(--zooz-bg)',
        borderBottom: '1px solid var(--zooz-border)',
        padding:      'clamp(48px, 7vw, 96px) 0',
      }}
    >
      <div className="max-w-3xl mx-auto px-5 md:px-8">
        <p
          className="text-[11px] uppercase tracking-[0.2em] font-bold mb-3"
          style={{ color: 'var(--zooz-text3)' }}
        >
          שאלות נפוצות · FAQ
        </p>
        <h2
          className="font-black mb-12"
          style={{ fontSize: 'clamp(26px, 4vw, 42px)', color: 'var(--zooz-text1)' }}
        >
          שאלות{' '}
          <span
            className="px-2 rounded-lg"
            style={{ background: 'var(--zooz-yellow)', color: 'var(--zooz-text1)' }}
          >
            שכדאי
          </span>
          {' '}לשאול.
        </h2>

        <ul style={{ borderTop: '1px solid var(--zooz-border)' }}>
          {faqItems.map((item, i) => (
            <li
              key={i}
              style={{ borderBottom: '1px solid var(--zooz-border)' }}
            >
              <button
                className="w-full flex items-center justify-between py-5 text-right transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span
                  className="font-bold text-[16px] text-right flex-1 pr-0 pl-4"
                  style={{ color: 'var(--zooz-text1)' }}
                >
                  {item.q}
                </span>
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: open === i ? 'var(--zooz-text1)' : 'var(--zooz-bg-input)',
                    color:      open === i ? '#FFFFFF'            : 'var(--zooz-text2)',
                    transition: 'var(--zooz-transition)',
                  }}
                >
                  {open === i ? <Minus size={14} weight="bold" /> : <Plus size={14} weight="bold" />}
                </div>
              </button>

              {open === i && (
                <p
                  className="pb-6 text-[15px] leading-relaxed"
                  style={{ color: 'var(--zooz-text2)' }}
                >
                  {item.a}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FAQ;
