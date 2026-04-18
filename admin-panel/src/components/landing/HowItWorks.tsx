import React from 'react';
import { Storefront, Motorcycle, CheckCircle } from '@phosphor-icons/react';
import { howItWorksSteps, anchors } from './content';

const stepIcons = [
  <Storefront size={26} weight="bold" />,
  <Motorcycle size={26} weight="bold" />,
  <CheckCircle size={26} weight="bold" />,
];

const HowItWorks: React.FC = () => {
  return (
    <section
      id={anchors.howItWorks}
      dir="rtl"
      style={{
        background:   'var(--zooz-bg-card)',
        borderBottom: '1px solid var(--zooz-border)',
        padding:      'clamp(48px, 7vw, 96px) 0',
      }}
    >
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        {/* Label */}
        <p
          className="text-[11px] uppercase tracking-[0.2em] font-bold text-center mb-3"
          style={{ color: 'var(--zooz-text3)' }}
        >
          איך זה עובד
        </p>

        {/* Heading */}
        <h2
          className="font-black text-center mb-16"
          style={{
            fontSize: 'clamp(26px, 4vw, 40px)',
            color:    'var(--zooz-text1)',
          }}
        >
          שלושה צעדים.{' '}
          <span
            className="px-2 rounded-lg"
            style={{ background: 'var(--zooz-yellow)', color: 'var(--zooz-text1)' }}
          >
            בלי יותר.
          </span>
        </h2>

        <ol className="grid md:grid-cols-3 gap-8 md:gap-6">
          {howItWorksSteps.map((step, i) => (
            <li
              key={i}
              className="text-right"
              style={{
                background:   'var(--zooz-bg)',
                border:       '1px solid var(--zooz-border)',
                borderRadius: 'var(--zooz-radius-card)',
                padding:      '24px 20px',
                boxShadow:    'var(--zooz-shadow)',
              }}
            >
              {/* Icon + number */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    width:      48,
                    height:     48,
                    background: 'var(--zooz-yellow)',
                    color:      'var(--zooz-text1)',
                    flexShrink: 0,
                  }}
                >
                  {stepIcons[i]}
                </div>
                <span
                  className="font-black text-[32px] leading-none"
                  style={{ color: 'var(--zooz-border-strong)' }}
                >
                  {step.num}
                </span>
              </div>

              <h3
                className="font-bold text-[18px] mb-2"
                style={{ color: 'var(--zooz-text1)' }}
              >
                {step.title}
              </h3>
              <p
                className="text-[14px] leading-relaxed"
                style={{ color: 'var(--zooz-text2)' }}
              >
                {step.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorks;
