import React from 'react';
import { Storefront, Motorcycle, PackageIcon } from '@phosphor-icons/react';
import { howItWorksSteps, anchors } from './content';

const stepIcons = [
  <Storefront size={28} weight="light" />,
  <Motorcycle size={28} weight="light" />,
  <PackageIcon size={28} weight="light" />,
];

const HowItWorks: React.FC = () => {
  return (
    <section
      id={anchors.howItWorks}
      dir="rtl"
      className="bg-canvas py-20 md:py-28 border-b border-borderEditorial"
    >
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <p className="text-[12px] uppercase tracking-[0.18em] text-inkMuted mb-3 text-center">
          איך זה עובד
        </p>
        <h2 className="font-serif text-ink text-center mb-16" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400 }}>
          שלושה צעדים. <em className="italic" style={{ color: '#ea2261' }}>בלי יותר.</em>
        </h2>

        <ol className="grid md:grid-cols-3 gap-10 md:gap-6">
          {howItWorksSteps.map((step, i) => (
            <li key={i} className="text-center md:text-right">
              <div className="flex md:block items-center gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded border border-ink flex items-center justify-center text-ink mb-0 md:mb-5">
                  {stepIcons[i]}
                </div>
                <div className="text-right">
                  <span className="font-serif text-[14px] text-inkMuted">{step.num}</span>
                </div>
              </div>
              <h3 className="font-serif text-ink text-[20px] mt-2 mb-2" style={{ fontWeight: 400 }}>
                {step.title}
              </h3>
              <p className="text-inkMuted text-[15px] leading-relaxed max-w-xs">
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
