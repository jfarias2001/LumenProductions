import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Acento da marca Lumen (índigo elétrico)
        brand: {
          50: '#eeeefe',
          100: '#e0e0fd',
          200: '#c7c6fb',
          300: '#a5a3f9',
          400: '#8886f9',
          500: '#6d6af8',
          600: '#5a52ee',
          700: '#4a41d6',
          800: '#3d37ad',
          900: '#343289',
        },
        // Superfícies noite (azul-violeta profundo: fundo → cards → elevações)
        surface: {
          950: '#060714',
          900: '#0a0c1b',
          850: '#0f1124',
          800: '#151830',
          700: '#1f2342',
          600: '#2b3054',
          500: '#3a4070',
        },
        // Acento secundário (IA — violeta)
        ai: {
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
        },
        // Acento de luz (detalhes luminosos — ciano)
        glow: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(109,106,248,0.35), 0 8px 32px -8px rgba(109,106,248,0.45)',
        'glow-ai': '0 0 0 1px rgba(168,85,247,0.35), 0 8px 32px -8px rgba(168,85,247,0.4)',
        card: '0 1px 2px rgba(0,0,0,0.45), 0 8px 24px -12px rgba(0,0,0,0.6)',
        'card-hover': '0 2px 4px rgba(0,0,0,0.5), 0 16px 32px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(109,106,248,0.18)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in': { from: { transform: 'translateX(16px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        aurora: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(40px, -30px) scale(1.12)' },
          '66%': { transform: 'translate(-30px, 30px) scale(0.94)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'fade-up': 'fade-up 0.25s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        aurora: 'aurora 18s ease-in-out infinite',
        'aurora-slow': 'aurora 26s ease-in-out infinite reverse',
      },
    },
  },
  plugins: [],
} satisfies Config;
