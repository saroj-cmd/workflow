const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: c("bg"), surface: c("surface"), "surface-2": c("surface-2"), border: c("border"),
        fg: c("fg"), muted: c("muted"), brand: c("brand"), "brand-2": c("brand-2"),
        success: c("success"), warning: c("warning"), danger: c("danger"), info: c("info"),
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.12)",
        lift: "0 2px 4px rgb(0 0 0 / 0.04), 0 24px 48px -16px rgb(0 0 0 / 0.22)",
        glow: "0 0 0 1px rgb(var(--brand) / 0.25), 0 12px 32px -8px rgb(var(--brand) / 0.45)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        float: { "0%,100%": { transform: "translate(0,0) scale(1)" }, "50%": { transform: "translate(30px,-40px) scale(1.08)" } },
      },
      animation: { shimmer: "shimmer 1.6s infinite", float: "float 14s ease-in-out infinite" },
    },
  },
  plugins: [],
};
