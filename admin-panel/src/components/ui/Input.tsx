import React from 'react';
import { Warning } from '@phosphor-icons/react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, helperText, className, id, style, ...props }, ref) => {
    const inputId = id || label?.replace(/\s+/g, '-').toLowerCase();
    const [focused, setFocused] = React.useState(false);

    const borderColor = error
      ? '#ea2261'
      : focused
      ? '#533afd'
      : '#e0e6ed';

    const boxShadow = error
      ? focused ? '0 0 0 3px rgba(234,34,97,0.15)' : 'none'
      : focused
      ? '0 0 0 3px rgba(83,58,253,0.12)'
      : 'none';

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[12px] font-semibold mb-1.5 uppercase tracking-[0.05em]"
            style={{ color: '#3c4257' }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
              style={{ color: error ? '#ea2261' : focused ? '#533afd' : '#8898aa' }}
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={className}
            style={{
              width: '100%',
              padding: leftIcon ? '9px 40px 9px 14px' : rightIcon ? '9px 14px 9px 40px' : '9px 14px',
              borderRadius: '6px',
              border: `1px solid ${borderColor}`,
              boxShadow,
              fontSize: '14px',
              color: '#061b31',
              background: focused ? '#fff' : '#f8fafc',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
              fontFamily: 'inherit',
              ...style,
            }}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {rightIcon && (
            <div
              className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              style={{ color: '#8898aa' }}
            >
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-[12px] font-medium flex items-center gap-1" style={{ color: '#ea2261' }}>
            <Warning size={13} /> {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-[12px]" style={{ color: '#8898aa' }}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
