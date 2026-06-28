import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
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

  output: "hybrid",
  adapter: cloudflare()
});