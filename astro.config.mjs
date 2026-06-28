import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
//
// IAFS is a pure static site:
//   - Every page's frontmatter runs at build time; zero SSR pages exist.
//   - Cloudflare Pages serves dist/ directly from its edge CDN — no Worker.
//   - Restores `astro preview` (the CF adapter disables it) and removes
//     the wrangler dev-server dependency from the E2E pipeline.
//
// See docs/decisions/0002-cloudflare-adapter-status.md (when written) for
// the full rationale.
export default defineConfig({
  site: "https://afroindexsovereignty.org",
  trailingSlash: "never",
  integrations: [tailwind()],
  i18n: {
    defaultLocale: "fr",
    locales: ["fr", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  build: {
    inlineStylesheets: "auto",
  },
  vite: {
    resolve: {
      alias: {
        "@built": new URL("./built", import.meta.url).pathname,
        "@data": new URL("./data", import.meta.url).pathname,
      },
    },
  },
});
