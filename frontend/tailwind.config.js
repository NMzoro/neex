/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#DC0202',
          bright: '#E41B35',
          dark: '#990000',
          deep: '#BD162C',
          light: '#FB6962',
        },
        ink: '#111111',
        coal: '#333333',
        paper: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 24px 60px -35px rgba(220, 2, 2, 0.35)',
        glow: '0 0 0 1px rgba(220, 2, 2, 0.25), 0 20px 50px -25px rgba(220, 2, 2, 0.55)',
      },
    },
  },
  plugins: [],
}
