/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'Segoe UI', 'sans-serif'],
      },
      /* توکن‌های رنگی Design System — «تخته‌سنگ ریاضی» (docs/DESIGN_SYSTEM.md §۲) */
      colors: {
        paper: '#F7F9FF',
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        sun: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
      },
      /* سایه‌های دو لایه با جوهر نیلی — §۴ */
      boxShadow: {
        soft: '0 1px 2px rgba(49,46,129,0.06), 0 4px 16px -4px rgba(49,46,129,0.08)',
        lift: '0 2px 4px rgba(49,46,129,0.06), 0 12px 32px -8px rgba(49,46,129,0.16)',
        glow: '0 0 0 1px rgba(99,102,241,0.12), 0 8px 24px -6px rgba(79,70,229,0.35)',
      },
      /* توکن‌های حرکت — §۷ */
      transitionDuration: {
        fast: '150ms',
        base: '250ms',
        slow: '400ms',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.34,1.56,.64,1)',
        glide: 'cubic-bezier(.22,1,.36,1)',
      },
      keyframes: {
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        tick: {
          '0%': { opacity: '0', transform: 'scale(0)' },
          '60%': { opacity: '1', transform: 'scale(1.2)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-8px)' },
        },
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        pop: 'pop 250ms spring both',
        rise: 'rise 400ms glide both',
        'shake': 'shake 400ms glide',
        tick: 'tick 400ms spring both',
        float: 'float 7s ease-in-out infinite alternate',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
