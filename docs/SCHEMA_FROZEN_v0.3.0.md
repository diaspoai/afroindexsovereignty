# IAFS — Frozen Schema v0.3.0

**Status:** frozen. This is the contract real Gabon / Burkina Faso data must
match to land in the repo. Any change to this contract is a `v0.3.X` bump (or
`v0.4.0` for a breaking change) with a matching commit on `schemas/`.

Canonical artifacts:
- `schemas/country.schema.json`
- `schemas/indicator.schema.json`
- `schemas/score.schema.json`
- `schemas/axis_score.schema.json`
- `schemas/event.schema.json`
- `schemas/methodology.schema.json`

JSON Schemas are authoritative; the TypeScript types in `scripts/lib/types.ts`
are derived for convenience. `additionalProperties: false` everywhere — extra
fields fail validation.

---

## 1. Country (`data/countries.json`)

```ts
{
  iso3: "BEN"|"BFA"|"CIV"|"MLI"|"NER"|"SEN"|"TGO"|"CMR"|"CAF"|"TCD"|"COG"|"GAB"|"ZZ[A-Z]",
  zone: "UEMOA"|"CEMAC"|"DUMMY",
  currency: "XOF"|"XAF"|"DUMMY",
  name_fr: string,
  name_en: string,
  independence_year: 1900..2030,         // baseline t=0; almost all CFA-zone = 1960
  independence_footnote_fr?: string,     // e.g. Cameroon reunification 1961
  independence_footnote_en?: string,
}
```

## 2. Indicator (`data/indicators.json`)

The rubric is frozen as data, so anchor/weight calibration is a tagged commit
on `indicators.json` (no code change).

```ts
{
  id: "A1"|"A2"|"A3"|"A4"|"A5"|"A6"|"B1"|"B2"|"B3"|"B4"|"B5",
  axis: "A"|"B",
  name_fr: string, name_en: string,
  type: "HARD"|"INTERP",
  weight: number,                         // A1 = 1.5 (spine), HARD = 1.0, INTERP = 0.5
  cadence: "annual"|"event",
  history_mode: "step_function"|"annual_series",
  earliest_sourced_year: 1900..2030,      // NEVER score before this year
  source_class: string,                   // descriptive — "UN Comtrade", "BEAC/BCEAO", etc.
  anchor:
    | { kind: "linear", raw_at_100: number, raw_at_0: number, clamp: true }
    | { kind: "ordinal", levels: [{ raw: string|number, score: 0..100, label_fr, label_en }, ...] }
    | { kind: "interp_rubric", levels: [{ score: 0..100, description_fr, description_en }, ...] },
}
```

`history_mode` is fixed per indicator: A1, A4, A5, B1 are `step_function`; A2, A3, A6, B2, B3, B4, B5 are `annual_series`. The validator rejects `kind` mismatches.

## 3. Score (`data/scores/<ISO3>.json`)

Discriminated union by `kind`. Annual records cover exactly their year; step records hold from `effective_year` until the next step (or until the current year).

```ts
// kind === "annual"
{
  kind: "annual",
  country: ISO3,
  indicator_id: IndicatorId,
  axis: "A"|"B",
  year: 1900..2100,
  raw_value: number | string,             // string for ordinal raw levels
  normalized_score: 0..100,               // MUST equal normalizeRaw(raw_value, indicator.anchor)
  type: "HARD"|"INTERP",                  // MUST equal indicator.type
  tag: "FACT"|"INTERPRETATION"|"CONTESTED",
  source_url: string,                     // resolvable; mandatory
  source_date: string,                    // ISO date of source publication
  note_fr?: string, note_en?: string,
  event_ref?: string,
  review_log_id?: string,                 // REQUIRED when type === "INTERP"
}

// kind === "step"
{
  kind: "step",
  country: ISO3,
  indicator_id: IndicatorId,
  axis: "A"|"B",
  effective_year: 1900..2100,             // strictly later than the previous step for this indicator
  raw_value: number | string,
  normalized_score: 0..100,
  type: "HARD"|"INTERP",
  tag: "FACT"|"INTERPRETATION"|"CONTESTED",
  source_url, source_date,
  event_ref?, note_fr?, note_en?, review_log_id?
}
```

**Forbidden fields anywhere in the record tree** (denylist; the validator and
the historical-honesty eval reject these):
`interpolated`, `extrapolated`, `imputed`, `estimated_from`, `back_filled`,
`backfilled`, `smoothed`.

**Year-bound rule (R9 / A8.1):**
`year` (or `effective_year`) MUST be `>= max(country.independence_year, indicator.earliest_sourced_year)`.

## 4. AxisScore (`data/axis_scores/<ISO3>.json`)

Stored on disk (D9) AND reproducible by `normalize.ts`. Eval 02 asserts byte-equivalence (modulo float precision). Produced by `npm run normalize -- --write`.

```ts
{
  country: ISO3,
  axis: "A"|"B",
  year: 1900..2100,
  axis_score: number | null,              // null when below_coverage_threshold OR no contributing indicators
  coverage: 0..1,                         // Σ weight(contributing) / Σ weight(axis)
  contributing_indicators: IndicatorId[], // sorted by insertion order in indicators.json
  missing_indicators: IndicatorId[],
  below_coverage_threshold: boolean,      // coverage < methodology.coverage_threshold
  is_baseline_year: boolean,              // year === country.independence_year
}
```

One record per `(country, axis, year)` for every year from `independence_year` through the current year (controlled by `IAFS_CURRENT_YEAR` env var; defaults to `new Date().getUTCFullYear()`).

## 5. Event (`data/events.json`)

```ts
{
  id: "[a-z0-9][a-z0-9-]{1,80}",         // stable kebab-case slug
  country: ISO3,
  date: "YYYY-MM-DD",
  axis: "A"|"B",
  indicator_id: IndicatorId,
  title_fr, title_en,
  description_fr, description_en,
  direction: "+" | "-" | "0",
  source_url, source_date,
}
```

## 6. Methodology (`data/methodology.json`)

```ts
{
  version: "0.3.0",                       // semver-style
  anchor_set_id: "0.3",
  coverage_threshold: 0.20,               // default; data, not code
  mode: "dummy" | "real",                 // dummy whitelists example.invalid URLs in eval 03
  licenses: { data: "CC-BY-4.0", code: "MIT" },
}
```

`mode: "real"` activates strict source-resolution AND requires evidence receipts under `evidence/<sha>/` for every changed Score / Event (eval 06).

---

## How a real-data PR proves itself

A Score record arriving from the research workflow passes the gate iff:

1. `validate.ts` accepts it (schema + cross-record).
2. `normalize.ts --write` produces an `AxisScore` series that round-trips (eval 02).
3. Source URL resolves and `source_date` is a real ISO date ≤ today (eval 03 in real mode).
4. `raw_value` is consistent with the indicator's anchor (eval 04) and `normalized_score = normalizeRaw(raw_value, anchor)`.
5. Tag and type are correct (eval 05); INTERP records carry `review_log_id` and a note.
6. An evidence receipt at `evidence/<sha>/<ISO3>-<indicator>-<year>.json` exists, its `content_sha256` matches a fresh re-fetch in CI, and its `wayback_url` resolves (eval 06).
7. No forbidden composite token appears anywhere in the diff (eval 07).
8. The record's year ≥ `max(independence_year, earliest_sourced_year)`; no `interpolated`/`extrapolated`/… fields; trajectory rendering breaks at gap years (eval 08).

If all eight pass, the data is mergeable. If any fail, CI blocks.
