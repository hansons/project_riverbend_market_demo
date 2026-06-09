import type { Config } from 'tailwindcss';

// Brand tokens resolve to CSS variables (set by ThemeProvider from the active
// tenant row). This is what makes the Slice 4 "live re-skin" possible: flipping
// the tenant updates the CSS vars and every utility re-colors instantly.
// Format: `rgb(var(--x) / <alpha-value>)` so opacity modifiers (bg-brand/10) work.
const brand = (name: string) => `rgb(var(--brand-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: brand('primary'),
          'primary-dark': brand('primary-dark'),
          accent: brand('accent'),
          berry: brand('berry'),
          ink: brand('ink'),
          paper: brand('paper'),
          card: brand('card'),
          muted: brand('muted'),
          line: brand('line'),
        },
        // Static status palette (not tenant-themed).
        status: {
          ok: '#2E7D32',
          warn: '#E0A526',
          alert: '#C0392B',
          info: '#2563EB',
          idle: '#9CA3AF',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'Arial', 'sans-serif'],
      },
      maxWidth: { content: '76rem' },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      boxShadow: {
        card: '0 1px 3px rgba(42,38,32,0.07), 0 1px 2px rgba(42,38,32,0.04)',
        lift: '0 10px 30px -12px rgba(42,38,32,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
