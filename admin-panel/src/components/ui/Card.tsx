import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  variant?: 'default' | 'elevated' | 'flat' | 'accent';
  accentColor?: string;
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-7',
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  hover = false,
  variant = 'default',
  accentColor,
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-[8px] transition-all duration-200',
        paddingMap[padding],
        variant === 'flat'
          ? 'border border-[#e8ecf0]'
          : variant === 'elevated'
          ? ''
          : '',
        className
      )}
      style={{
        border: variant === 'accent' ? `1px solid ${accentColor ? accentColor + '30' : '#e8ecf0'}` : '1px solid #e8ecf0',
        boxShadow:
          variant === 'elevated'
            ? '0 13px 27px -5px rgba(50,50,93,0.15), 0 8px 16px -8px rgba(0,0,0,0.10)'
            : variant === 'flat'
            ? 'none'
            : '0 2px 5px 0 rgba(50,50,93,0.10), 0 1px 1px 0 rgba(0,0,0,0.07)',
        ...(hover
          ? { cursor: 'pointer' }
          : {}),
        ...(variant === 'accent' && accentColor
          ? { borderTopColor: accentColor, borderTopWidth: '3px' }
          : {}),
      }}
      onMouseEnter={
        hover
          ? (e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 13px 27px -5px rgba(50,50,93,0.15), 0 8px 16px -8px rgba(0,0,0,0.10)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }
          : undefined
      }
      onMouseLeave={
        hover
          ? (e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 2px 5px 0 rgba(50,50,93,0.10), 0 1px 1px 0 rgba(0,0,0,0.07)';
              (e.currentTarget as HTMLDivElement).style.transform = '';
            }
          : undefined
      }
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  iconBg?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
  iconBg = 'linear-gradient(135deg, #533afd, #3d22e0)',
}) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-3">
      {icon && (
        <div
          className="w-9 h-9 rounded-[8px] flex items-center justify-center text-white flex-shrink-0"
          style={{
            background: iconBg,
            boxShadow: '0 4px 6px rgba(50,50,93,0.11), 0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: '#061b31' }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-[12px] mt-0.5" style={{ color: '#8898aa' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);
