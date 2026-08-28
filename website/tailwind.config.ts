import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14171c",
          soft: "#2b303a",
        },
        muted: "#5b6470",
        line: "#e5e8ec",
        surface: "#f6f7f9",
        accent: {
          DEFAULT: "#374151",
          strong: "#1f2937",
        },
        signal: "#1f7a52", // restrained green, used sparingly for status/accents
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      maxWidth: {
        content: "1160px",
      },
      letterSpacing: {
        tightish: "-0.01em",
      },
    },
  },
  plugins: [],
};

export default config;
