import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient?: string;
  shadowColor?: string;
  trend?: {
    value: number;
    label: string;
  };
  isLoading?: boolean;
  // Legacy color prop
  color?: 'purple' | 'pink' | 'green' | 'orange' | 'blue' | 'teal' | 'ruby' | 'gold';
}

// Stripe-inspired gradient palette
const colorMap: Record<string, { gradient: string; shadow: string }> = {
  purple: {
    gradient: 'linear-gradient(135deg, #533afd 0%, #3d22e0 100%)',
    shadow: '0 13px 27px -5px rgba(83,58,253,0.40), 0 8px 16px -8px rgba(83,58,253,0.25)',
  },
  ruby: {
    gradient: 'linear-gradient(135deg, #ea2261 0%, #c01053 100%)',
    shadow: '0 13px 27px -5px rgba(234,34,97,0.40), 0 8px 16px -8px rgba(234,34,97,0.25)',
  },
  pink: {
    gradient: 'linear-gradient(135deg, #ea2261 0%, #f96bee 100%)',
    shadow: '0 13px 27px -5px rgba(249,107,238,0.35), 0 8px 16px -8px rgba(249,107,238,0.20)',
  },
  teal: {
    gradient: 'linear-gradient(135deg, #00b090 0%, #007acc 100%)',
    shadow: '0 13px 27px -5px rgba(0,176,144,0.40), 0 8px 16px -8px rgba(0,176,144,0.25)',
  },
  green: {
    gradient: 'linear-gradient(135deg, #1db954 0%, #00897b 100%)',
    shadow: '0 13px 27px -5px rgba(29,185,84,0.40), 0 8px 16px -8px rgba(29,185,84,0.25)',
  },
  gold: {
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #dc6f0a 100%)',
    shadow: '0 13px 27px -5px rgba(245,158,11,0.40), 0 8px 16px -8px rgba(245,158,11,0.25)',
  },
  orange: {
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea2261 100%)',
    shadow: '0 13px 27px -5px rgba(245,158,11,0.35), 0 8px 16px -8px rgba(245,158,11,0.20)',
  },
  blue: {
    gradient: 'linear-gradient(135deg, #0070ba 0%, #533afd 100%)',
    shadow: '0 13px 27px -5px rgba(0,112,186,0.40), 0 8px 16px -8px rgba(0,112,186,0.25)',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  gradient,
  shadowColor,
  color = 'purple',
  trend,
  isLoading = false,
}) => {
  const palette = colorMap[color] || colorMap.purple;
  const bg = gradient || palette.gradient;
  const shadow = shadowColor || palette.shadow;

  if (isLoading) {
    return (
      <div
        className="rounded-[12px] p-5 min-h-[130px] animate-pulse"
        style={{ background: bg, opacity: 0.6 }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-[8px] bg-white/20" />
          <div className="w-14 h-5 rounded-full bg-white/20" />
        </div>
        <div className="h-7 w-20 bg-white/25 rounded mb-2" />
        <div className="h-3 w-28 bg-white/15 rounded" />
      </div>
    );
  }

  const trendUp = (trend?.value ?? 0) >= 0;

  return (
    <div
      className="rounded-[12px] p-5 min-h-[130px] cursor-default transition-all duration-200 relative overflow-hidden hover:scale-[1.02]"
      style={{ background: bg, boxShadow: shadow }}
    >
      {/* Decorative spheres */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20px',
          left: '-20px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.10)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-10px',
          right: '-10px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
        }}
      />

      {/* Top row */}
      <div className="relative flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-[8px] flex items-center justify-center text-white"
          style={{ background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(4px)' }}
        >
          {icon}
        </div>

        {trend && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
            style={{ background: trendUp ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.15)' }}
          >
            <span>{trendUp ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="relative">
        <p className="text-[2rem] font-black text-white leading-none tracking-tight mb-1">
          {value}
        </p>
        <p className="font-semibold text-[13px] text-white/90 mb-0.5">{title}</p>
        {subtitle && <p className="text-white/65 text-[11px]">{subtitle}</p>}
      </div>

      {/* Trend bar */}
      {trend && (
        <div
          className="relative mt-3 pt-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.18)' }}
        >
          <p className="text-white/60 text-[11px]">
            {trendUp ? '▲' : '▼'} {trend.label}
          </p>
        </div>
      )}
    </div>
  );
};
