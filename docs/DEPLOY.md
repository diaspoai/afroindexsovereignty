# Deploy — Cloudflare Pages

IAFS deploys to Cloudflare Pages as a static site. Free tier covers expected
traffic indefinitely (C4). Every push to `main` triggers a production build;
every PR gets its own preview URL.

This document is the one-time setup. After it's done, deploys are automatic.

---

## 0 · Prerequisites

- A Cloudflare account (free tier — no credit card required).
- Owner / admin access on the `diaspoai/afroindexsovereignty` GitHub repo (so you can authorize the Cloudflare GitHub App).

## 1 · Connect Cloudflare to the GitHub repo

1. Sign in to <https://dash.cloudflare.com/>.
2. In the left sidebar, click **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**.
3. Click **Connect GitHub**. Authorize the **Cloudflare Pages** GitHub App. When prompted, install it on the `diaspoai` organization (or just on the `afroindexsovereignty` repo). Cloudflare needs read access to commits and write access to deployment statuses.
4. Pick `diaspoai/afroindexsovereignty` from the repo list. Click **Begin setup**.

## 2 · Build configuration

Fill in exactly:

| Field | Value |
|---|---|
| Project name | `iafs` (or anything — becomes the `*.pages.dev` subdomain) |
| Production branch | `main` |
| Framework preset | **Astro** |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(leave empty)* |

### Environment variables (Production AND Preview)

| Variable | Value | Why |
|---|---|---|
| `IAFS_CURRENT_YEAR` | `2026` | Pins the trajectory end year so builds are reproducible; bump annually. |
| `NODE_VERSION` | `22` | Matches `.nvmrc`. Cloudflare's wrangler requires Node 22+. |

Click **Save and Deploy**. First build takes ~2 minutes.

## 3 · First-deploy verification

Once the green ✓ appears next to the deployment:

1. Open the `https://iafs.pages.dev` URL Cloudflare assigned.
2. Smoke-check:
   - FR home renders the cohort grid (R1).
   - `/plot` shows the A×B plot (R2).
   - `/country/ZZA` renders the Sovereignty Scrubber (R9) — drag the year handle; readouts update.
   - `/en/` mirror loads via the language switch (R8).
   - The DUMMY DATA banner is visible at the top (`mode: "dummy"`).

If any of those fail, the build log in the Cloudflare dashboard will say why.

## 4 · Branch protection (do this once CI is green on the first PR)

GitHub UI → **Settings** → **Branches** → **Add classic branch protection rule** (or **Add ruleset**):

- Branch name pattern: `main`
- **Require status checks to pass before merging** → check **`CI / ci`** (appears after the first PR runs).
- **Require a pull request before merging** → 1 approving review.
- **Do not allow bypassing the above settings.**

This prevents direct pushes to `main` from bypassing the eval suite.

## 5 · Custom domain (optional)

In Cloudflare Pages → your project → **Custom domains** → **Set up a custom domain** → enter your domain (e.g. `iafs.example.org`). Cloudflare walks you through DNS records (one CNAME); no extra cost on free tier.

## 6 · Operating the deploy

After setup, the loop is:

- Open a PR → CI runs locally + Cloudflare builds a **preview URL** posted as a check.
- Merge to `main` → Cloudflare rebuilds production automatically.
- Annual update: bump `IAFS_CURRENT_YEAR` in CF env vars + this repo's CI workflow.

No manual `wrangler` / `astro build` invocations needed. The repo is the source of truth.

## 7 · Costs

At expected traffic (tens of thousands of unique visitors / month, mostly
European + African daytime), all of this runs within Cloudflare Pages' free
tier limits (unlimited requests, 500 builds / month, 1 build at a time). The
only paid surface would be a custom domain through a registrar — Cloudflare
itself charges nothing.

---

*Once the first deploy is green, this document is effectively a runbook for
disaster recovery (e.g. if the CF project is ever deleted by accident).*
