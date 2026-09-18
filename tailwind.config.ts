import type { Config } from 'tailwindcss';

function token(name: string): string {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cabinet: {
          background: token('background'),
          surface: token('surface'),
          elevated: token('surface-elevated'),
          text: token('text'),
          muted: token('text-muted'),
          border: token('border'),
          accent: token('accent'),
          positive: token('positive'),
          negative: token('negative'),
          warning: token('warning'),
          brass: token('brass'),
        },
      },
      borderRadius: {
        'cabinet-sm': 'var(--radius-sm)',
        'cabinet-md': 'var(--radius-md)',
        'cabinet-lg': 'var(--radius-lg)',
      },
      fontFamily: {
        serif: ['var(--font-title)'],
        sans: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        'cabinet-overlay': 'var(--shadow-overlay)',
      },
    },
  },
  plugins: [],
} satisfies Config;