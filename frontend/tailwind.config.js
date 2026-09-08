/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#0a0f1a",
          900: "#0d1526",
          800: "#111c33",
        },
      },
    },
  },
  plugins: [],
};