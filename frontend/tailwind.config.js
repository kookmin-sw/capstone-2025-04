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
          50: "#fff8ed",
          100: "#fff0d4",
          200: "#ffdea9",
          300: "#ffcd85",
          400: "#fea239",
          500: "#fc8413",
          600: "#ed6909",
          700: "#c54f09",
          800: "#9c3e10",
          900: "#7e3510",
          950: "#441906",
        },
      },
    },
  },
  plugins: [],
};
