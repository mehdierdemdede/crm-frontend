import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        background: "#f8fafc",
        foreground: "#0f172a",
        primary: {
          DEFAULT: "#2563eb",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#e2e8f0",
          foreground: "#475569",
        },
        border: "#d0d7e3",
      },
      container: {
        center: true,
        padding: "1.5rem",
      },
    },
  },
};

export default config;
