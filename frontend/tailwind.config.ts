import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080a0f", // głęboki obsidian
        surface: "#0e131f", // ciemna stal
        surfaceHover: "#161e31",
        surfaceBorder: "#1e293b",
        studio: {
          bg: "#080a0f",
          card: "#0d1322",
          surface: "#0e1626",
          border: "#1e293b",
          hover: "#182338",
        },
        cyanGlow: "#00f0ff",
        emeraldGlow: "#10b981",
        amberGlow: "#f59e0b",
        crimsonGlow: "#ef4444",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        glowCyan: "0 0 25px -5px rgba(0, 240, 255, 0.25)",
        glowAmber: "0 0 25px -5px rgba(245, 158, 11, 0.25)",
        glowEmerald: "0 0 25px -5px rgba(16, 185, 129, 0.25)",
        glowCrimson: "0 0 25px -5px rgba(239, 68, 68, 0.25)",
      },
      animation: {
        pulseSlow: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        scanline: "scanline 8s linear infinite",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
