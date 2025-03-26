/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Chess.com colors
        'primary-green': '#58AC3E', // Primary green for buttons and highlights
        'dark-green': '#3A7D32', // Deeper green for hover states
        'dark-gray': '#2B2B2B', // Backgrounds, nav bars
        'medium-gray': '#4D4D4D', // Secondary text, icons
        'light-gray': '#BFBFBF', // Dividers, inactive buttons
        'soft-white': '#F5F5F5', // Light mode background
        'accent-yellow': '#FFCC00', // Notifications, highlights
        
        // Chess board colors (chess.com style)
        'board-light': '#F0D9B5', // Light squares beige
        'board-dark': '#58AC3E', // Dark squares green
        'board-light-selected': '#f7f769', // Selected light square
        'board-dark-selected': '#89D155', // Selected dark square 
        'possible-move': 'rgba(0, 0, 0, 0.2)',
        'possible-capture': 'rgba(255, 0, 0, 0.4)',
        'last-move': 'rgba(255, 255, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-out': 'fadeOut 0.3s ease-in-out',
        'highlight-move': 'highlightMove 1.5s',
        'pulse-turn': 'pulseTurn 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        highlightMove: {
          '0%': { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
        pulseTurn: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      boxShadow: {
        'piece': '0 5px 15px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
} 