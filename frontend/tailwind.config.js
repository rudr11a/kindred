/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // supports dark mode toggle
  theme: {
    extend: {
      colors: {
        reddit: {
          orange: '#ff4500',
          orangeHover: '#e03d00',
          bg: '#F8FAFC',
          bgDark: '#0b1416', // Reddit modern dark background
          card: '#ffffff',
          cardDark: '#1a282d', // Reddit modern dark card
          border: '#E2E8F0',
          borderDark: '#343536',
          text: '#0F172A',
          textDark: '#d7dadc',
          blue: '#0079d3',
          gray: '#787c7e',
        }
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
