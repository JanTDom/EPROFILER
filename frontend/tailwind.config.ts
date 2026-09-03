import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#0f172a", // slate-900
        muted: {
          DEFAULT: "#f1f5f9", // slate-100
          foreground: "#64748b", // slate-500
        },
        border: "#e2e8f0", // slate-200
        primary: {
          DEFAULT: "#0f172a", // surowy, elegancki granat/czerń
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#2563eb", // techniczny błękit analityczny
          foreground: "#ffffff",
        },
        warning: "#d97706", // amber-600 (dla uników i odchyleń)
        danger: "#dc2626", // red-600 (dla niespójności)
        success: "#16a34a", // green-600 (odpowiedź wprost)
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
