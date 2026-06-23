import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5ff',
          500: '#3b5bdb',
          600: '#364fc7',
          700: '#2f44b5',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
