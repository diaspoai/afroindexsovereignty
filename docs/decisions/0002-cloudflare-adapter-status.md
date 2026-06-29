# ADR 0002 — IAFS deploys as pure static; no Cloudflare Workers adapter

**Status:** Accepted · 2026-06-28

## Context

During scaffold, Cloudflare opened an auto-config PR (#1, merged before review) that added `@astrojs/cloudflare` with `output: "hybrid"`, a `wrangler.jsonc`, the `wrangler` devDep, and switched `npm run preview` to `wrangler dev`. This is Cloudflare's default for any Astro project — they assume SSR is wanted.

IAFS has **zero SSR pages**. Every page's frontmatter runs at build time; the entire site is prerendered into `dist/`. Running it through a Worker buys us nothing and introduced concrete pain:

- `astro preview` was disabled (CF adapter doesn't support it) → E2E needed an `http-server` workaround in `playwright.config.ts`
- +85 transitive packages (wrangler + miniflare + workers-shared) on every install
- The build emitted `_worker.js` + `_routes.json` that CF Pages had to serve via Worker indirection instead of its faster edge-static path
- Deploy fragility: every Astro / wrangler version bump risked a build break

Cloudflare's evolving product story (unified Workers & Pages UI; "Workers Static Assets" replacing classic Pages) means the choice will come up again as defaults shift.

## Decision

Revert to pure static (PR #4): remove `@astrojs/cloudflare`, `wrangler`, `wrangler.jsonc`, the SSR `output: "hybrid"` flag, and all wrangler-flavored npm scripts. Restore `npm run preview` to `astro preview`.

Deploy via **Cloudflare Pages** (classic UI flow, still available in the new unified dashboard if you click "Pages" rather than "Workers"). CF Pages serves `dist/` directly from its edge-static CDN — no Worker, no `wrangler.jsonc`, no adapter.

Live at: https://afroindexsovereignty.pages.dev

## Consequences

**Better:**
- 503 packages installed vs 588 (85 fewer transitive deps)
- `astro preview` works; E2E uses it directly with no http-server workaround
- Faster TTFB (edge-static path is hotter than Worker invocation)
- Aligns with non-negotiables C4 (cheap to run indefinitely) and C5 (fast first paint)

**Off-limits unless this ADR is superseded:**
- No re-adding `@astrojs/cloudflare` for SSR features
- No Workers Static Assets `wrangler.jsonc` for "small convenience" — if we need a Worker wrapper, write a new ADR explaining why

**If we ever genuinely need SSR** (e.g. a per-request authenticated endpoint, or HTML responses derived from runtime data we don't have at build time): adding the adapter back is a 6-line PR. The static-build will fail with a clear error rather than silently producing a broken Worker bundle.

## Links

- Auto-config PR that introduced the adapter: [#1](https://github.com/diaspoai/afroindexsovereignty/pull/1)
- Revert PR: [#4](https://github.com/diaspoai/afroindexsovereignty/pull/4)
- Deploy runbook: `docs/DEPLOY.md`
