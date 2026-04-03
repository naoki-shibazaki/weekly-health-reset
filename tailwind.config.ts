import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#5B8CFF",
        success: "#4CAF82",
        warning: "#FF8C42",
        purple: "#B57BFF",
      },
    },
  },
  plugins: [],
};

export default config;
