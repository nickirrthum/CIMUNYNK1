/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Archivo Black"', 'Manrope', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Comunynk CMYK softened palette
        cmyk: {
          c: '#22B8E6',  // cyan
          m: '#E5379B',  // magenta
          y: '#F5C518',  // yellow (legible)
          k: '#2A2A2E',  // key/black graphite
          'c-soft': '#ECF8FD',
          'm-soft': '#FCEBF4',
          'y-soft': '#FEF7DA',
          'k-soft': '#F4F4F6',
          'c-ring': '#7DD3F2',
          'm-ring': '#F4A4CC',
          'y-ring': '#FBE38A',
        },
        ink: {
          50:  '#F7F7F8',
          100: '#EEEEF1',
          200: '#D8D8DD',
          300: '#B3B3BA',
          400: '#7C7C85',
          500: '#52525A',
          600: '#3D3D44',
          700: '#2A2A2E',
          800: '#1B1B1E',
          900: '#0E0E10',
        },
        paper: '#FAF8F4',
        paperDark: '#F1ECE3',
      },
      backgroundImage: {
        'paper-grain': "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.12  0 0 0 0 0.12  0 0 0 0.045 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        'cmyk-stripes': 'repeating-linear-gradient(135deg, #22B8E6 0 8px, #E5379B 8px 16px, #F5C518 16px 24px, #2A2A2E 24px 32px, transparent 32px 80px)',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        registerSpin: {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        inkPulse: {
          '0%, 100%': { transform: 'scale(1)',   opacity: '1' },
          '50%':      { transform: 'scale(1.15)', opacity: '.85' },
        },
      },
      animation: {
        'fade-up':       'fadeUp 0.22s ease-out',
        'fade-in':       'fadeIn 0.18s ease-out',
        'register-spin': 'registerSpin 14s linear infinite',
        'ink-pulse':     'inkPulse 2.2s ease-in-out infinite',
      },
      boxShadow: {
        'ink': '0 1px 2px rgba(42,42,46,0.04), 0 4px 16px rgba(42,42,46,0.06)',
        'ink-md': '0 4px 24px rgba(42,42,46,0.08)',
      },
    },
  },
  plugins: [],
}
