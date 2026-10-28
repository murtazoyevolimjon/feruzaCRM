/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { DEFAULT: '#4F46E5', dark: '#4338CA', soft: '#EEF2FF' },
        nav: { DEFAULT: '#0F172A', soft: '#1E293B' },
        ok: '#10B981',
        late: '#F59E0B',
        bad: '#EF4444',
        excused: '#6366F1',
      },
    },
  },
  plugins: [],
};
