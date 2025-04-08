/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/tailwind")],
  content: ["./app/**/*.{tsx,ts}", "./components/**/*.{tsx,ts}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
