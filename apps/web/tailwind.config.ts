import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#588b8b",
          light: "#6da3a3",
          dark: "#466f6f",
          50: "#f0f5f5",
          100: "#d6e4e4",
          200: "#aec9c9",
          500: "#588b8b",
          700: "#466f6f",
          900: "#2d4848",
        },
        sand: {
          DEFAULT: "#e4d5b7",
          light: "#f0e8d5",
          dark: "#c9b894",
          50: "#faf8f3",
          100: "#f3efe4",
          200: "#e9dfc9",
          500: "#e4d5b7",
          700: "#c9b894",
          900: "#8a7a5c",
        },
      },
      fontFamily: {
        serif: ['"Courier New"', "Courier", "monospace"],
        sans: ['"Courier New"', "Courier", "monospace"],
        mono: ['"Courier New"', "Courier", "monospace"],
      },
      letterSpacing: {
        tighter2: "-0.015em",
      },
    },
  },
  plugins: [typography],
} satisfies Config;
