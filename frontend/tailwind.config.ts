import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lr: {
          nuit: '#0B100E',
          charbon: '#16181A',
          'vert-profond': '#0B3D2E',
          emeraude: '#0F7B5A',
          'emeraude-vive': '#2FD08B',
          ivoire: '#EDE9DF',
          argent: '#B9BEC2',
          night2: '#0F1815',
          panel: '#111A17',
          line: '#24342E',
          line2: '#35493F',
          muted: '#93A19A',
          'em-deep': '#1B9A6B',
        },
        territoire: {
          int: '#6F94B5',
          vit: '#2FD08B',
          inf: '#D0A94A',
          tec: '#3FB6C6',
          cre: '#E0806F',
          sag: '#A08DD0',
        },
      },
      fontFamily: {
        display: ['Instrument Serif', 'serif'],
        hud: ['Chakra Petch', 'sans-serif'],
        body: ['Schibsted Grotesk', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: { montee: 'cubic-bezier(.2,.7,.2,1)' },
      transitionDuration: { fast: '120ms', base: '240ms', slow: '600ms' },
      boxShadow: { lueur: '0 0 28px rgba(47,208,139,.38)' },
    },
  },
} satisfies Config
