/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── Stripe-inspired palette ───────────────────────────────────
        // Primary brand — rich violet-purple
        primary: {
          DEFAULT: '#533afd',
          50:  '#f0eeff',
          100: '#e3dfff',
          200: '#c9c2ff',
          300: '#a99bff',
          400: '#7f6dff',
          500: '#533afd',
          600: '#3d22e0',
          700: '#2e18bc',
          800: '#1f1190',
          900: '#150d6e',
        },
        // Deep navy — headline text
        navy: {
          DEFAULT: '#061b31',
          50:  '#e8eef5',
          100: '#c5d4e6',
          200: '#9cb6d5',
          300: '#6e95c2',
          400: '#4979ae',
          500: '#2a5d9a',
          600: '#1c4a7d',
          700: '#113661',
          800: '#0a2348',
          900: '#061b31',
        },
        // Brand dark — immersive indigo sections
        brand: {
          dark: '#1c1e54',
          darkest: '#0d253d',
        },
        // Accent colors
        ruby:    '#ea2261',   // gradient decorative
        magenta: '#f96bee',   // gradient decorative
        // Functional
        success: '#1db954',
        warning: '#ff9f0a',
        error:   '#ea2261',
        info:    '#533afd',
        // Backgrounds
        bgLight: '#f6f9fc',   // Stripe's subtle blue-gray canvas
        bgDark:  '#0d253d',
        cardLight: '#ffffff',
        cardDark:  '#1c1e54',
        // Borders
        borderLight: '#e0e6ed',
        borderCard:  '#e8ecf0',
        // ─── Editorial Light tokens ──────────────────────────────────────
        canvas:           '#fbfaf6',  // off-white page background
        ink:              '#111111',  // primary text on canvas
        inkMuted:         '#555555',  // secondary text on canvas
        borderEditorial:  '#e8e6dc',  // subtle hairlines on canvas
      },
      fontFamily: {
        sans: ['"Noto Sans Hebrew"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"Source Code Pro"', 'Menlo', 'monospace'],
        serif: ['Georgia', '"Times New Roman"', 'serif'],
      },
      boxShadow: {
        // Stripe's signature blue-tinted multi-layer shadows
        'stripe-sm':  '0 2px 5px 0 rgba(50,50,93,0.10), 0 1px 1px 0 rgba(0,0,0,0.07)',
        'stripe':     '0 7px 14px 0 rgba(50,50,93,0.10), 0 3px 6px 0 rgba(0,0,0,0.07)',
        'stripe-md':  '0 13px 27px -5px rgba(50,50,93,0.15), 0 8px 16px -8px rgba(0,0,0,0.10)',
        'stripe-lg':  '0 30px 60px -12px rgba(50,50,93,0.25), 0 18px 36px -18px rgba(0,0,0,0.30)',
        'stripe-xl':  '0 50px 100px -20px rgba(50,50,93,0.25), 0 30px 60px -30px rgba(0,0,0,0.30)',
        'stripe-focus': '0 0 0 4px rgba(83,58,253,0.20)',
        'stripe-danger-focus': '0 0 0 4px rgba(234,34,97,0.20)',
        'editorial-card': '0 1px 2px rgba(17,17,17,0.04), 0 8px 24px rgba(17,17,17,0.06)',
      },
      letterSpacing: {
        'stripe-display': '-0.06em',
        'stripe-heading': '-0.04em',
        'stripe-sub': '-0.02em',
      },
      backgroundImage: {
        // Stripe brand gradients
        'stripe-hero': 'linear-gradient(135deg, #533afd 0%, #ea2261 50%, #f96bee 100%)',
        'stripe-primary': 'linear-gradient(135deg, #533afd, #3d22e0)',
        'stripe-ruby': 'linear-gradient(135deg, #ea2261, #f96bee)',
        'stripe-ocean': 'linear-gradient(135deg, #061b31, #1c1e54)',
        'stripe-teal': 'linear-gradient(135deg, #00d4aa, #0070ba)',
        'stripe-gold': 'linear-gradient(135deg, #f59e0b, #ea2261)',
        'stripe-emerald': 'linear-gradient(135deg, #1db954, #00b090)',
      },
      borderRadius: {
        'stripe': '6px',
        'stripe-md': '8px',
        'stripe-lg': '12px',
        'stripe-xl': '16px',
        'stripe-2xl': '20px',
      },
    },
  },
  plugins: [],
};
