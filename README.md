# IAFS — Index of African Francophone Sovereignty

A public, bilingual (FR-first), open-source web index tracking the sovereignty
trajectory of the 12 francophone CFA-franc states against the colonial orbit
(France) and the CFA franc — from each country's independence (≈1960) to today.
**Two independent axes, reported separately, never fused.**

Spec: [`docs/IAFS_Requirements_v0.3.md`](docs/IAFS_Requirements_v0.3.md) ·
operating manual: [`docs/IAFS_SDLC_v0.1.md`](docs/IAFS_SDLC_v0.1.md).

## Status

**Phase 2 scaffold (schema v0.3.0).** No real country data is present. The
repository ships with clearly-labeled dummy countries (`ZZA`, `ZZB`) so the full
pipeline — validate → normalize → evals → site build → E2E — runs end-to-end on
honest sparse + step-function multi-decade data.

Real Gabon / Burkina Faso data lands via a separate sourced research workflow
and must match the frozen schema below.

## Quickstart

```bash
# Node 20+
npm ci
npm run validate
npm run normalize -- --write   # materializes axis_scores + built/trajectory
npm run test                   # evals 01–08 + units
npm run build                  # validate + normalize + Astro build
npm run dev                    # local dev server (Astro)
```

CI runs all of the above on every PR; see `.github/workflows/ci.yml`.

## What the harness enforces

| Layer | Enforces |
|---|---|
| `CLAUDE.md` / `AGENTS.md` | Always-loaded non-negotiables (no composite, Option 1, capture-not-democracy, provenance mandatory, anti-fabrication, FACT/INTERP/CONTESTED + HARD/INTERP tagging, anchored normalization, French-first, no interpolation, dummy-data boundary). |
| `schemas/*.json` | Frozen contract v0.3.0 — `additionalProperties: false` and a forbidden-field denylist (`interpolated`, `extrapolated`, `imputed`, …). |
| `scripts/validate.ts` | Schema + cross-record checks (year-bound vs `independence_year` and `earliest_sourced_year`, step monotonicity, kind-vs-`history_mode`, INTERP requires `review_log_id`, anchor recompute matches stored `normalized_score`). |
| `scripts/normalize.ts` | Single source of truth for raw → score; expands step-functions, computes coverage-aware `AxisScore`s, materializes `built/trajectory/<ISO3>.json` for the site. Stored `axis_scores` must equal recomputed (eval 02). |
| `evals/01_schema` … `08_historical_honesty` | The eight-track eval suite. CI blocks merge on failure. |
| `.claude/hooks/forbid-composite.sh` | Blocks any edit that introduces a composite-score token; runs as a PreToolUse hook AND `npm run lint:composite`. |
| `.claude/hooks/pre-edit-data-guard.sh` | Blocks any data write missing `source_url`, `source_date`, or `review_log_id` (for INTERP). |
| `.claude/skills/{scoring,source-verification,translation}` | Dynamic context; loaded only on relevant tasks (saves static-context tokens). |

## Repo layout

```
docs/                  spec (read-only for code)
schemas/               frozen JSON Schemas (v0.3.0)
data/                  source of truth (countries, indicators, methodology, scores, axis_scores, events)
scripts/               validate.ts, normalize.ts, lib/
built/                 gitignored — materialized trajectory consumed by the site
evals/                 the eight checks
src/                   Astro site (FR-first; /en mirror)
evidence/              PR-bound source-fetch receipts (anti-fabrication input)
.claude/               skills, hooks, settings
.github/               CI workflow + PR template
```

## Adding a real country (once research data is ready)

1. Add a `Country` record to `data/countries.json` with the real ISO3 (e.g. `GAB`).
2. Add `data/scores/GAB.json` with annual records for `annual_series` indicators and step records for `step_function` indicators (A1, A4, A5, B1). Every record carries `source_url` + `source_date`.
3. For every Score / Event added, the `source-verification` skill writes an evidence receipt under `evidence/<sha>/`.
4. Run `npm run validate && npm run normalize -- --write && npm run test`.
5. Flip `data/methodology.json` `mode` to `"real"` (will block on missing receipts).
6. PR with the PR template filled in.

## Licenses

- **Code:** MIT — see [LICENSE](LICENSE).
- **Data:** CC-BY-4.0 — see [LICENSE-DATA](LICENSE-DATA).

## Non-negotiables (the short list)

1. No composite score, ever. Two axes.
2. Option 1: only France / CFA orbit.
3. Capture, not democracy (Axis B).
4. Source URL + date on every datapoint.
5. No fabrication. Anti-fabrication receipts enforce this in real mode.
6. Tag everything (FACT/INTERPRETATION/CONTESTED, HARD/INTERP).
7. Anchored normalization only.
8. French-first parity.
9. No interpolation, no back-fill. Gaps stay gaps.
10. No real-country data in code while `mode: "dummy"`.
