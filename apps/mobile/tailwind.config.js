/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#121A1F",
        canvas: "#F4F0E8",
        accent: "#0D6EFD",
        card: "#FFFFFF",
        muted: "#5F6C77"
      }
    }
  },
  plugins: []
};

