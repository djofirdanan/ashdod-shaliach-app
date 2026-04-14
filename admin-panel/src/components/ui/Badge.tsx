import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'purple' | 'pink';
type BadgeColor = 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink';

interface BadgeProps {
  variant?: BadgeVariant;
  color?: BadgeColor;
  children: React.ReactNode;
  dot?: boolean;
  size?: 'sm' | 'md';
}

// Stripe-inspired: soft tinted backgrounds with colored text + border
// No gradient pills — enterprise quality subtle badges
const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: {
    background: 'rgba(29,185,84,0.10)',
    color: '#00875a',
    border: '1px solid rgba(29,185,84,0.22)',
  },
  warning: {
    background: 'rgba(245,158,11,0.10)',
    color: '#92400e',
    border: '1px solid rgba(245,158,11,0.28)',
  },
  error: {
    background: 'rgba(234,34,97,0.10)',
    color: '#c01053',
    border: '1px solid rgba(234,34,97,0.22)',
  },
  info: {
    background: 'rgba(83,58,253,0.08)',
    color: '#3d22e0',
    border: '1px solid rgba(83,58,253,0.18)',
  },
  default: {
    background: 'rgba(107,124,147,0.10)',
    color: '#6b7c93',
    border: '1px solid rgba(107,124,147,0.20)',
  },
  purple: {
    background: 'rgba(83,58,253,0.09)',
    color: '#533afd',
    border: '1px solid rgba(83,58,253,0.20)',
  },
  pink: {
    background: 'rgba(249,107,238,0.10)',
    color: '#c71fa0',
    border: '1px solid rgba(249,107,238,0.25)',
  },
};

const dotColors: Record<BadgeVariant, string> = {
  success: '#1db954',
  warning: '#f59e0b',
  error: '#ea2261',
  info: '#533afd',
  default: '#8898aa',
  purple: '#533afd',
  pink: '#f96bee',
};

const colorToVariant: Record<BadgeColor, BadgeVariant> = {
  gray: 'default',
  red: 'error',
  yellow: 'warning',
  green: 'success',
  blue: 'info',
  indigo: 'purple',
  purple: 'purple',
  pink: 'pink',
};

export const Badge: React.FC<BadgeProps> = ({
  variant,
  color,
  children,
  dot = false,
  size = 'md',
}) => {
  const resolvedVariant: BadgeVariant =
    variant ?? (color ? colorToVariant[color] : 'default');

  const styles = variantStyles[resolvedVariant];
  const dotColor = dotColors[resolvedVariant];

  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold rounded-full"
      style={{
        ...styles,
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        fontSize: size === 'sm' ? '10px' : '11px',
        letterSpacing: '0.01em',
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: dotColor }}
        />
      )}
      {children}
    </span>
  );
};
