import type { Config } from "tailwindcss";

/**
 * EmberFit design tokens.
 *
 * The palette is deliberately warm: dark chocolate through caramel into cream,
 * with a single warm-orange accent reserved for actions and highlights.
 * Nothing neon, nothing cold.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cocoa: {
          50: "#F8F4EF",
          100: "#EFE5D9",
          200: "#DFCDB8",
          300: "#C9AC8B",
          400: "#B08A63",
          500: "#966C46",
          600: "#7A5537",
          700: "#5E402B",
          800: "#432E20",
          900: "#2E2016",
          950: "#1C130D",
        },
        caramel: {
          50: "#FDF6EC",
          100: "#F9E7CD",
          200: "#F2CD9B",
          300: "#E8AE68",
          400: "#DE9243",
          500: "#D0762A",
          600: "#B25B20",
          700: "#8E441D",
          800: "#71371E",
          900: "#5C2F1C",
        },
        ember: {
          400: "#F4914E",
          500: "#EE7327",
          600: "#DA5A14",
        },
        cream: "#FBF7F1",
        beige: "#F1E7DA",
        sand: "#E5D6C3",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "serif"],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(67, 46, 32, 0.04), 0 8px 24px -12px rgba(67, 46, 32, 0.18)",
        lift: "0 2px 4px rgba(67, 46, 32, 0.05), 0 18px 40px -18px rgba(67, 46, 32, 0.35)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.5)",
      },
      backgroundImage: {
        "grad-cocoa": "linear-gradient(135deg, #2E2016 0%, #5E402B 45%, #B08A63 100%)",
        "grad-ember": "linear-gradient(135deg, #7A5537 0%, #D0762A 55%, #F4914E 100%)",
        "grad-cream": "linear-gradient(160deg, #FBF7F1 0%, #F1E7DA 100%)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scan-sweep": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scan-sweep": "scan-sweep 2.2s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
