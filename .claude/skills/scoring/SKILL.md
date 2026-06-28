---
name: scoring
description: Convert a sourced raw observation for one IAFS indicator into a Score record (annual or step). Loads the methodology rubric and the anchor table only when invoked, so the static rule file stays short. Use when adding a new datapoint, revising an anchor, or recomputing a country's series.
---

# Scoring (dynamic context, fires on scoring tasks)

## When to invoke
- Adding a new datapoint to `data/scores/<ISO3>.json`.
- Revising an anchor or weight in `data/indicators.json`.
- Producing a step record for an institutional indicator (A1, A4, A5, B1).
- Reviewing a contested INTERP score (B2, B4).

## Inputs required (none may be invented)
- `country` (ISO3, real or `ZZ?` dummy), `indicator_id`, `year` (annual) or `effective_year` (step).
- `raw_value` — a sourced number or rubric-level string.
- A live `source_url` and `source_date` for the cited document.

## Procedure
1. **Load the indicator definition** from `data/indicators.json`. Confirm:
   - `history_mode` matches the record `kind` you plan to write
     (`step_function` → `kind: "step"`; `annual_series` → `kind: "annual"`).
   - The year ≥ `max(country.independence_year, indicator.earliest_sourced_year)`.
2. **Apply the anchor.** Read `indicator.anchor`:
   - `linear`: `score = clamp(0, 100, 100 * (raw_at_0 - raw) / (raw_at_0 - raw_at_100))`.
   - `ordinal`: pick the `levels` entry whose `raw` equals your raw_value; use its `score`.
   - `interp_rubric` (INTERP only — B2, B4): pick a defined level score and reuse it as the raw_value AND the normalized_score.
3. **Tag the record.**
   - `type` = the indicator's `type` (HARD or INTERP). It is not a per-record choice.
   - `tag` ∈ {`FACT`, `INTERPRETATION`, `CONTESTED`}:
     - `FACT` for HARD records with an unambiguous source.
     - `INTERPRETATION` for INTERP records (B2, B4) and any HARD record requiring analyst judgment to apply the rubric.
     - `CONTESTED` when the source is disputed or under review in the open governance log.
4. **For INTERP records:** create or reuse a `review_log_id` and add a one-line `note_fr` / `note_en`. The validator rejects INTERP without `review_log_id`.
5. **For step records:** confirm `effective_year` is strictly later than the previous step for the same indicator. The validator rejects overlapping steps.
6. **Run `npm run validate` then `npm run normalize -- --write`** locally before committing. Validate catches schema/anchor errors; normalize updates `data/axis_scores/<ISO3>.json` so eval 02 passes in CI.
7. **Hand off to source-verification** (the `source-verification` skill) to produce the PR-bound evidence receipt under `evidence/<sha>/<ISO3>-<indicator>-<year>.json`.

## Hard rules (from CLAUDE.md, repeated for vigilance)
- No interpolation, no extrapolation, no back-fill. Gaps stay gaps.
- No composite score. Two axes, separately.
- A1 carries the spine premium ×1.5. Do not "fix" this — it is a stated value choice.
- No real-country data while `methodology.mode === "dummy"`. Real Gabon/Burkina datapoints land via a separate research workflow.
