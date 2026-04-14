import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// Stripe-inspired button styles
// Primary: rich violet gradient + blue-tinted shadow
// Secondary: outlined purple
// Danger: ruby gradient
// Ghost: transparent
// Success: green gradient

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #533afd 0%, #3d22e0 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 6px rgba(50,50,93,0.11), 0 1px 3px rgba(0,0,0,0.08)',
  },
  danger: {
    background: 'linear-gradient(135deg, #ea2261 0%, #c01053 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 6px rgba(234,34,97,0.20), 0 1px 3px rgba(0,0,0,0.08)',
  },
  success: {
    background: 'linear-gradient(135deg, #1db954 0%, #00897b 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 6px rgba(29,185,84,0.20), 0 1px 3px rgba(0,0,0,0.08)',
  },
};

const variantHoverStyles: Record<string, React.CSSProperties> = {
  primary: {
    boxShadow: '0 7px 14px rgba(50,50,93,0.15), 0 3px 6px rgba(0,0,0,0.10)',
    transform: 'translateY(-1px)',
  },
  danger: {
    boxShadow: '0 7px 14px rgba(234,34,97,0.25), 0 3px 6px rgba(0,0,0,0.10)',
    transform: 'translateY(-1px)',
  },
  success: {
    boxShadow: '0 7px 14px rgba(29,185,84,0.25), 0 3px 6px rgba(0,0,0,0.10)',
    transform: 'translateY(-1px)',
  },
};

const variantBaseClasses: Record<string, string> = {
  secondary: 'bg-white font-semibold',
  ghost: 'bg-transparent font-medium',
  outline: 'bg-transparent font-semibold',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-[12px] gap-1.5 rounded-[5px]',
  md: 'px-4 py-2 text-[13px] gap-2 rounded-[6px]',
  lg: 'px-6 py-2.5 text-sm gap-2 rounded-[6px]',
};

const variantStaticStyles: Record<string, React.CSSProperties> = {
  secondary: {
    color: '#533afd',
    border: '1px solid rgba(83,58,253,0.35)',
    boxShadow: '0 2px 5px rgba(50,50,93,0.08)',
  },
  ghost: {
    color: '#6b7c93',
    border: '1px solid transparent',
  },
  outline: {
    color: '#3c4257',
    border: '1px solid #e0e6ed',
    boxShadow: '0 2px 5px rgba(50,50,93,0.05)',
  },
};

const Spinner: React.FC = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  style,
  ...props
}) => {
  const isGradient = ['primary', 'danger', 'success'].includes(variant);
  const [hovered, setHovered] = React.useState(false);

  const baseStyle: React.CSSProperties = isGradient
    ? {
        ...variantStyles[variant],
        ...(hovered && !disabled && !isLoading ? variantHoverStyles[variant] : {}),
        transition: 'all 0.15s ease',
        ...style,
      }
    : {
        ...variantStaticStyles[variant],
        transition: 'all 0.15s ease',
        ...style,
      };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      style={baseStyle}
      onMouseEnter={(e) => {
        setHovered(true);
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        props.onMouseLeave?.(e);
      }}
      className={clsx(
        'inline-flex items-center justify-center font-semibold cursor-pointer',
        'focus:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-[0.98]',
        variantBaseClasses[variant] ?? '',
        sizeClasses[size],
        className
      )}
    >
      {isLoading ? (
        <Spinner />
      ) : (
        leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};
