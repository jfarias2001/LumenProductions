import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Acento da marca Lumen (índigo)
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Superfícies dark (fundo → cards → elevações)
        surface: {
          950: '#0a0a0f',
          900: '#0f1117',
          850: '#14161f',
          800: '#1a1d29',
          700: '#242837',
          600: '#2f3445',
          500: '#3b4154',
        },
        // Acento secundário (IA)
        ai: {
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px -8px rgba(99,102,241,0.5)',
        card: '0 1px 2px rgba(0,0,0,0.4), 0 4px 12px -4px rgba(0,0,0,0.5)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in': { from: { transform: 'translateX(16px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
