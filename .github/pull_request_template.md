<!--
  IAFS pull-request checklist.
  Fill every section. CI blocks merge on failure.
-->

## Summary

(One paragraph: what changed and why.)

## Type of change

- [ ] Data (new scores / events / country)
- [ ] Methodology / anchor / weight (versioned change — bump methodology.json)
- [ ] Code (site, scripts, evals, CI)
- [ ] Docs / spec
- [ ] Translation parity

## Countries touched

(ISO3 codes — `ZZA`, `ZZB` for dummy; real codes once real data lands.)

## Indicators touched

(`A1`–`A6`, `B1`–`B5`.)

## Tag choices

For each new or revised Score record, list:

- `country/indicator/year` → `tag = FACT|INTERPRETATION|CONTESTED`, `type = HARD|INTERP`, reason in one line.

## Evidence receipts (anti-fabrication)

- [ ] For each changed Score / Event, a receipt exists at `evidence/<sha>/<ISO3>-<indicator>-<year>.json` (or `event-<id>.json`) produced by the `source-verification` skill.
- [ ] (real mode) `content_sha256` matches a fresh re-fetch, `wayback_url` resolves.

## Translation parity (FR/EN)

- [ ] Every new user-facing string has both `_fr` and `_en` (or both `title_fr/title_en`, etc.).
- [ ] French version is the source; English mirrors it.

## Verification

- [ ] `npm run validate` passes locally.
- [ ] `npm run normalize` passes locally (no axis-score drift), or `--write` ran and `data/axis_scores/` is staged.
- [ ] `npm run test` passes (evals 01–08 + units).
- [ ] `npm run lint:composite` passes.
- [ ] `npm run build` succeeds.

## Non-negotiables touched?

If your change might affect a non-negotiable (no composite, Option 1, capture-not-democracy, anchored normalization, no interpolation, French-first, no real-country-data-in-dummy-mode), justify here and request a maintainer review.
