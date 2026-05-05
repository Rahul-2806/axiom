/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // AXIOM Design System
        axiom: {
          black:    "#050508",
          void:     "#0a0a12",
          surface:  "#0f0f1a",
          border:   "#1a1a2e",
          gold:     "#D4AF37",
          "gold-dim": "#9a7e27",
          cyan:     "#00f5ff",
          "cyan-dim": "#007a80",
          purple:   "#6c3aff",
          red:      "#ff2d55",
          green:    "#00ff87",
          text:     "#e8e8f0",
          muted:    "#6b6b80",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
        body:    ["'DM Sans'", "sans-serif"],
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(212,175,55,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.05) 1px, transparent 1px)",
        "axiom-gradient": "linear-gradient(135deg, #050508 0%, #0a0a12 50%, #0f0f1a 100%)",
      },
      backgroundSize: {
        "grid": "40px 40px",
      },
      animation: {
        "pulse-gold": "pulse-gold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan": "scan 3s linear infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        "pulse-gold": {
          "0%, 100%": { opacity: 1, boxShadow: "0 0 0 0 rgba(212,175,55,0.4)" },
          "50%": { opacity: 0.8, boxShadow: "0 0 0 8px rgba(212,175,55,0)" },
        },
        "scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "glow": {
          "from": { textShadow: "0 0 10px rgba(212,175,55,0.5)" },
          "to":   { textShadow: "0 0 20px rgba(212,175,55,0.9), 0 0 40px rgba(212,175,55,0.4)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
