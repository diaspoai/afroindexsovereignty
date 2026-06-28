# IAFS — Agent Rules (always loaded)

## What this project is
A public, open-source, bilingual (French-first) web index tracking the sovereignty
trajectory of the 12 francophone CFA-franc states against the colonial orbit
(France) and the CFA franc, from each country's independence (≈1960) to today.
Two independent axes, reported separately, never fused.

Source of truth: `docs/IAFS_Requirements_v0.3.md` (domain + product + temporal).
Operating manual: `docs/IAFS_SDLC_v0.1.md`.

## Non-negotiables (never violate)

1. **No composite.** Never emit a single fused "sovereignty score." Axis A and
   Axis B are reported separately, always.
2. **Option 1.** Measure only against France / the CFA orbit. No multi-pole guard.
3. **Capture, not democracy.** Axis B measures non-capture. No Freedom House,
   V-Dem, or any "civic space / democracy" indicator. Never grade against a
   Western democratic template.
4. **Provenance is mandatory.** Every datapoint MUST carry a resolvable
   `source_url` and `source_date`. No source ⇒ invalid.
5. **No fabrication.** Never invent a figure, quote, or citation. If a value
   cannot be verified against a real source, omit it. A fake source ends the
   project. Anti-fabrication is enforced by the evidence-receipt eval (06).
6. **Tag everything.** Every datapoint carries `tag ∈ {FACT, INTERPRETATION,
   CONTESTED}` and `type ∈ {HARD, INTERP}` per the spec's definitions.
7. **Anchored / absolute normalization.** A country's score moves only when
   *its own* data moves. Anchors are published in `data/indicators.json` and
   versioned; revising one is a tagged commit.
8. **French-first parity.** FR and EN kept in sync; FR presented first.
9. **No interpolation, no back-fill.** Historical gaps stay gaps. Fields named
   `interpolated`, `extrapolated`, `imputed`, `estimated_from`, `back_filled`
   are forbidden by the schema and the validator. R9 trajectory rendering must
   show gaps as gaps — never a line implying absent data.
10. **No real country data in code.** Until the research workflow lands real
    Gabon / Burkina Faso data, only clearly-labeled dummy data
    (ISO `ZZA`, `ZZB`, `source_url` host `example.invalid/dummy/...`) lives
    in `data/`. Code MUST NOT invent real country figures.

## Temporal rules (R9 / A4 / A8)

- Each country carries `independence_year` (almost all = 1960).
- Each indicator carries `earliest_sourced_year`; never scored before it.
- Each indicator declares `history_mode`: `step_function` (A1, A4, A5, B1) or
  `annual_series` (A2, A3, A6, B3, B5, B2, B4).
- Axis scores are coverage-aware: in a given year, the score is computed from
  indicators with sourced data that year, weights renormalized over the
  available set, and a `coverage` value is stored.
- If coverage is below `methodology.coverage_threshold` (default 0.20), the
  axis_score for that year is `null` and the UI renders a visible gap.

## How to verify (set the bar at the eval, not the demo)

A country is "done" only when it passes the full eval suite:
- 01 schema · 02 normalization · 03 source-resolution · 04 anchor-conformance ·
  05 tag · 06 anti-fabrication · 07 no-composite · 08 historical-honesty.

A passing page render is NOT done. CI runs all eight on every PR.

## Where things live

- `docs/`          governing spec (read-only for code)
- `schemas/`       JSON Schemas — the frozen contract
- `data/`          the source of truth (countries, indicators, scores, axis_scores, events, methodology)
- `scripts/`       validate + normalize (single source of truth, raw → score)
- `built/`         materialized trajectory (gitignored, deterministic output)
- `evals/`         the eight checks
- `src/`           the Astro site reading `built/`
- `.claude/`       skills, hooks, settings
- `evidence/`      PR-bound source-fetch receipts (anti-fabrication eval input)

## When unsure

- Debug the harness first (missing tool, loose rule, junk context), not the model.
- Load only the country and rubric the task needs. Don't pass the whole repo.
- Skills (dynamic context) live in `.claude/skills/`: `scoring`,
  `source-verification`, `translation`. Invoke the relevant one rather than
  carrying its content statically.
