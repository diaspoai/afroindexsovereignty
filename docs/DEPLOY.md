# Deploy — Cloudflare Pages

IAFS deploys to Cloudflare Pages as a pure static site. Free tier covers
expected traffic indefinitely (C4). Every push to `main` triggers a
production build; every PR gets its own preview URL.

**Live:** https://afroindexsovereignty.pages.dev

This document is the one-time setup, and the recovery runbook if the
project is ever deleted by accident.

> **Note on Cloudflare's UI:** as of mid-2026, Cloudflare merged Workers
> and Pages into a single **Workers & Pages** dashboard. There are no
> separate tabs. The "Create application" flow defaults to a Workers-
> style deploy (which would require `wrangler.jsonc` — we don't ship one,
> see [ADR 0002](decisions/0002-cloudflare-adapter-status.md)). You must
> deliberately choose the **Pages** flow.

---

## 0 · Prerequisites

- A Cloudflare account (free tier — no credit card required)
- Owner/admin access on `diaspoai/afroindexsovereignty` so you can authorize
  the Cloudflare Pages GitHub App

## 1 · Create the Pages project

1. Sign in to <https://dash.cloudflare.com/>
2. Left sidebar → **Workers & Pages**
3. Click **Create application** (top right)
4. Look for the **Pages** option specifically. Depending on the UI version,
   it may appear as:
   - A separate "Pages" card/tab on the create screen, **or**
   - A small link "Import an existing Git repository" with a Pages preset, **or**
   - Tucked under "More options" / "Other deployment options"
5. **Important:** if the first screen says "Create a Worker" at the top
   and asks for a `Deploy command` field — that's the **Workers** flow.
   Go back. We want Pages, which has **no Deploy command field**.
6. **Connect GitHub** when prompted. Authorize the `diaspoai` org.
7. Pick `diaspoai/afroindexsovereignty` from the repo list.

## 2 · Build configuration

Fill in exactly:

| Field | Value |
|---|---|
| Project name | `afroindexsovereignty` (becomes the `*.pages.dev` subdomain) |
| Production branch | `main` |
| Framework preset | **Astro** |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(leave empty)* |

### Environment variables (Production AND Preview)

| Variable | Value | Why |
|---|---|---|
| `NODE_VERSION` | `22` | `package.json` engines require 22+. Without this CF picks an older default and the build fails. |
| `IAFS_CURRENT_YEAR` | `2026` | Pins the trajectory end year for reproducible builds. Bump once a year. |

Click **Save and Deploy**. First build takes ~2 minutes.

## 3 · First-deploy verification

Once the green ✓ appears next to the deployment, open the project's
`*.pages.dev` URL and smoke-check:

- FR home (`/`) — dark canvas, "Deux scores. Jamais un." split-colored, BIG Africa map, DUMMY DATA banner on top
- Hover a CFA state → side panel updates with country + zone
- Click a UEMOA chip → 7 western states pulse
- `/en` mirror loads via the language switch (top-right `EN`)
- `/country/ZZA` renders the Sovereignty Scrubber + indicator table
- Drag the year scrubber 1960→2026 → axis readouts update; gap years show as `—`

If any of those fail, the **Builds** tab in the CF dashboard has the build log.

## 4 · Branch protection (already configured)

The `main` branch is protected via the GitHub API (see [ADR 0004](decisions/0004-pr-only-workflow.md)). Direct pushes are blocked; PRs are required;
the `ci` status check must pass. To re-apply if it ever drifts:

```bash
gh api -X PUT repos/diaspoai/afroindexsovereignty/branches/main/protection \
  --input - <<'EOF'
{
  "required_status_checks": { "strict": true, "contexts": ["ci"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0, "dismiss_stale_reviews": true },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "required_conversation_resolution": true
}
EOF
```

## 5 · Custom domain (optional)

In the CF Pages project → **Custom domains** → **Set up a custom domain**
→ enter your domain (e.g. `iafs.example.org`). CF walks you through the
DNS record (one CNAME). No extra cost on free tier.

## 6 · Operating the deploy

After setup, the loop is:

- Open a PR → CI runs locally + CF Pages builds a **preview URL** posted as a check
- Merge to `main` → CF Pages rebuilds production automatically
- Annual: bump `IAFS_CURRENT_YEAR` in CF env vars + `.github/workflows/ci.yml`

No manual `wrangler` invocations. No `astro build` by hand. The repo is the source of truth.

## 7 · Don't get tricked into the Workers flow

The new unified UI funnels users toward Workers by default. If you ever
re-create the project and find yourself on a screen with a **"Deploy
command"** field expecting `npx wrangler deploy` — **back out**. That
flow expects `wrangler.jsonc` and either an SSR adapter or a Workers
Static Assets binding. IAFS ships none of those by design ([ADR 0002](decisions/0002-cloudflare-adapter-status.md)). Always pick **Pages**.

## 8 · Costs

At expected traffic (tens of thousands of unique visitors/month, mostly
European + African daytime), all of this stays within CF Pages' free tier
(unlimited requests, 500 builds/month, 1 concurrent build). The only paid
surface would be a custom domain through a registrar — CF itself charges
nothing.
