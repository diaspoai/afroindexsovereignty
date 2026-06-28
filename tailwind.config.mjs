/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (every color references a CSS custom property) ──
        // Defined in src/styles/global.css. Components MUST consume these
        // tokens, not raw hex.
        bg:        "rgb(var(--c-bg) / <alpha-value>)",
        surface:   "rgb(var(--c-surface) / <alpha-value>)",
        surface2:  "rgb(var(--c-surface-2) / <alpha-value>)",
        border:    "rgb(var(--c-border) / <alpha-value>)",
        ink:       "rgb(var(--c-text) / <alpha-value>)",
        text:      "rgb(var(--c-text) / <alpha-value>)",
        muted:     "rgb(var(--c-text-muted) / <alpha-value>)",
        dim:       "rgb(var(--c-text-dim) / <alpha-value>)",

        // Axis A — External Autonomy. Vivid indigo, pops on dark canvas.
        axisA:     "rgb(var(--c-axis-a) / <alpha-value>)",
        axisAsoft: "rgb(var(--c-axis-a-soft) / <alpha-value>)",

        // Axis B — Internal Self-Determination. Warm amber, equal weight to A.
        axisB:     "rgb(var(--c-axis-b) / <alpha-value>)",
        axisBsoft: "rgb(var(--c-axis-b-soft) / <alpha-value>)",

        // Accent — the "gap" / baseline / oxblood. Vivid coral.
        accent:    "rgb(var(--c-accent) / <alpha-value>)",
        oxblood:   "rgb(var(--c-accent) / <alpha-value>)", // alias for back-compat

        // Status (rare on this site, but defined for parity with Levels spec)
        success:   "rgb(var(--c-success) / <alpha-value>)",
        warning:   "rgb(var(--c-warning) / <alpha-value>)",
        danger:    "rgb(var(--c-danger) / <alpha-value>)",

        // Editorial Atlas legacy aliases — kept for any unmigrated components,
        // mapped to the new tokens so colors stay coherent.
        paper:     "rgb(var(--c-bg) / <alpha-value>)",
        earth:     "rgb(var(--c-axis-b-soft) / <alpha-value>)",
      },
      fontFamily: {
        // Display: serif keeps the editorial register. Body: Inter (Levels).
        serif: ['"Cormorant Garamond"', "ui-serif", "Georgia", "serif"],
        sans:  ['Inter', "ui-sans-serif", "system-ui", "sans-serif"],
        mono:  ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        // Levels scale: 12 / 14 / 16 / 20 / 24 / 32 (px). No oversize headings.
        "xs":  ["12px", { lineHeight: "16px" }],
        "sm":  ["14px", { lineHeight: "20px" }],
        "base":["16px", { lineHeight: "24px" }],
        "lg":  ["20px", { lineHeight: "28px" }],
        "xl":  ["24px", { lineHeight: "32px" }],
        "2xl": ["32px", { lineHeight: "40px" }],
        // Display-only escape hatch — the hero alone, capped at 64px.
        "display": ["clamp(40px, 6vw, 64px)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
      },
      spacing: {
        // Levels scale: 4 / 8 / 12 / 16 / 24 / 32 (px). Tailwind defaults map.
        "1":  "4px",
        "2":  "8px",
        "3":  "12px",
        "4":  "16px",
        "6":  "24px",
        "8":  "32px",
        "12": "48px",
        "16": "64px",
        "24": "96px",
      },
      maxWidth: {
        prose: "65ch",
        page:  "1280px",
      },
      borderRadius: {
        "none": "0",
        "sm":   "4px",
        "md":   "8px",
        "lg":   "12px",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};
