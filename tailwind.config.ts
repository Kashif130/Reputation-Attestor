import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0f14",
          900: "#0f1621",
          800: "#151f2e",
          700: "#1d2a3d",
          600: "#28394f",
        },
        signal: {
          400: "#5eead4",
          500: "#2dd4bf",
          600: "#14b8a6",
        },
        amber: {
          400: "#fbbf7d",
          500: "#f5a341",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(45,212,191,0.15), 0 8px 30px -8px rgba(45,212,191,0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
