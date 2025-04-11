/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#00b8db",
          hover: "#0095bb",
          50: "#e6f9fb",
          100: "#cceff7",
          200: "#99e2f0",
          300: "#66d4e9",
          400: "#33c6e2",
          500: "#00b8db",
          600: "#0095bb",
          700: "#007a99",
          800: "#005f77",
          900: "#004455",
          950: "#002933",
        },
        secondary: "#6b7280",
        background: "#f9fafb",
        white: "#ffffff",
        textPrimary: "#111827",
        textSecondary: "#4b5563",
        border: "#b0b2b5",
        error: "#ef4444",
        success: "#10b981",
      },
    },
  },
  plugins: [],
};
