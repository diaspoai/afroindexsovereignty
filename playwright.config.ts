import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "retain-on-failure",
  },
  webServer: {
    // The merged Cloudflare adapter disables `astro preview` and requires
    // wrangler for its own preview path. For E2E we don't need the Worker
    // runtime — every page is prerendered to dist/ — so we serve dist/
    // with a plain static file server. Avoids pulling wrangler into tests.
    command: "npm run build && npx --yes http-server dist -p 4321 -a 127.0.0.1 -s --no-dotfiles",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
