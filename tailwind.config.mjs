/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        // Editorial Atlas palette — pan-African / continental, not flag-based.
        // Tags MUST NOT rely on color alone (see TagBadge.astro).
        ink: "#1B1B1F",
        paper: "#F7F3EC",
        earth: "#C9A37A",
        oxblood: "#6B1E1E",
        // The two axes. Indigo vs ochre: distinct in hue AND luminance
        // so they remain legible in B/W and across color-vision deficiencies.
        axisA: "#1F3A93", // External autonomy — outward / structural / orbit
        axisB: "#B8860B", // Internal self-determination — inward / soil
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "ui-serif", "Georgia", "serif"],
        sans: ['Inter', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      maxWidth: {
        prose: "65ch",
      },
    },
  },
  plugins: [],
};
