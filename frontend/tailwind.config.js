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
          DEFAULT: "#007cdb",
          hover: "#0c91eb",
          50: "#f0f8ff",
          100: "#e0effe",
          200: "#b9e0fe",
          300: "#7cc7fd",
          400: "#36acfa",
          500: "#0c91eb",
          600: "#007cdb",
          700: "#015aa3",
          800: "#064d86",
          900: "#0b416f",
          950: "#07294a",
        },
        secondary: "#6b7280",
        background: "#f9fafb",
        white: "#ffffff",
        textPrimary: "#111827",
        textSecondary: "#4b5563",
        border: "#d1d5db",
        error: "#ef4444",
        success: "#10b981",
      },
    },
  },
  plugins: [],
};
