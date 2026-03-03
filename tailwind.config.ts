import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        body: "#fcfcf7",
        coral: {
          DEFAULT: "#ff6d4d",
          50: "#fff3f0",
          100: "#ffe0d9",
          500: "#ff6d4d",
          600: "#e5563a",
          700: "#cc4028",
        },
        green: {
          DEFAULT: "#befd71",
          50: "#f4fee6",
          500: "#befd71",
        },
        "grey-1": "#383838",
        "grey-2": "#454647",
        "grey-3": "#6b6b6b",
        "grey-4": "#9a9a9a",
        "grey-5": "#e5e5e0",
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xs: "5px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "32px",
      },
    },
  },
  plugins: [],
};
export default config;
