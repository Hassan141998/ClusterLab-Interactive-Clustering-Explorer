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
        bg: "#0d0d0d",
        surface: "#141414",
        surface2: "#1a1a1a",
        border: "#262626",
        purple: {
          DEFAULT: "#7c3aed",
          light: "#a855f7",
          dark: "#5b21b6",
        },
        neon: "#39ff14",
        "neon-dim": "#1a7a09",
        muted: "#6b7280",
        text: "#e5e7eb",
      },
      fontFamily: {
        sans: ["Space Grotesk", "sans-serif"],
        mono: ["Roboto Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "fade-in": "fadeIn 0.3s ease-in",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px #7c3aed, 0 0 10px #7c3aed" },
          "100%": { boxShadow: "0 0 10px #7c3aed, 0 0 20px #7c3aed, 0 0 40px #7c3aed" },
        },
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        slideUp: { "0%": { transform: "translateY(10px)", opacity: 0 }, "100%": { transform: "translateY(0)", opacity: 1 } },
      },
      boxShadow: {
        "neon-purple": "0 0 20px rgba(124,58,237,0.4)",
        "neon-green": "0 0 20px rgba(57,255,20,0.4)",
      },
    },
  },
  plugins: [],
};
