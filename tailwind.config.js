/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        imss: {
          green: '#002F2A',
          'green-mid': '#0A4A42',
          'green-light': '#1A6B5E',
          wine: '#611232',
          'wine-light': '#7A1640',
          gold: '#A57F2C',
          'gold-light': '#C49A3D',
          'gold-dark': '#8A6A23',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
