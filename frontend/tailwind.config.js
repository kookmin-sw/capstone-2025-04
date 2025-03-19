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
          DEFAULT: "var(--primary-color)",
          hover: "var(--primary-hover)",
          light: "rgba(var(--primary-color-rgb), 0.1)",
          "light-hover": "rgba(var(--primary-color-rgb), 0.2)",
          50: "rgba(var(--primary-color-rgb), 0.05)",
          100: "rgba(var(--primary-color-rgb), 0.1)",
          200: "rgba(var(--primary-color-rgb), 0.2)",
          300: "rgba(var(--primary-color-rgb), 0.3)",
          400: "rgba(var(--primary-color-rgb), 0.4)",
          500: "rgba(var(--primary-color-rgb), 0.5)",
          600: "rgba(var(--primary-color-rgb), 0.6)",
          700: "rgba(var(--primary-color-rgb), 0.7)",
          800: "rgba(var(--primary-color-rgb), 0.8)",
          900: "rgba(var(--primary-color-rgb), 0.9)",
        },
        amber: {
          300: "rgb(255 205 133)",
          400: "#fbbf24",
        },
      },
    },
  },
  plugins: [],
};
