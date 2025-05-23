/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './node_modules/nativewind/dist/**/*.js',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  presets: [require('nativewind/preset')],
};