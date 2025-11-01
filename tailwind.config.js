/** @type {import('tailwindcss').Config} */
module.exports = {
  // 1. THIS IS THE MOST IMPORTANT CHANGE
  darkMode: 'class', // Enables class-based dark mode
  
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // We will use these as our 'dark' theme colors
        'pure-black': '#000000',
        'pure-white': '#FFFFFF',
        'night': '#111111',       // Dark main background
        'grey-dark': '#333333',  // Dark card/input background
        'grey-mid': '#888888',   // Dark placeholder/subtle text
        'grey-light': '#F5F5F5', // Dark main text / Light background
      },
    },
  },
  plugins: [],
};