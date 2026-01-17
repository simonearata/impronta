import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      fontFamily: {
        serif: ["Cormorant Garamond", "ui-serif", "Georgia", "serif"],
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tighter2: "-0.035em",
      },
    },
  },
  plugins: [typography],
} satisfies Config;
