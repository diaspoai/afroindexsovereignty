# IAFS — Requirements · v0.3

**Index of African Francophone Sovereignty**
**Author:** @Trilogy237
**Scope of this document:** *requirements only* — what the index measures, and what the product must be and do. **Design, implementation, testing, review, deployment, and maintenance are owned by the development phase in Claude Code** (see B§9); how they should be approached lives in `IAFS_SDLC_v0.1.md`.
**Supersedes:** methodology spec v0.2, PRD v0.2, and the temporal addendum v0.1 (all merged here).

---
---

# PART A — Domain / Measurement Requirements

*What is measured and the rules of measurement. These are fixed analytical inputs, not things for development to redesign.*

## A1. Purpose & unit of analysis

The IAFS tracks, over time, the sovereignty trajectory of the **12 francophone states of the CFA franc zone**, measured against the specific structure the project exists to examine: **the former colonial relationship with France and the CFA franc (Option 1).** It deliberately does **not** guard against substituting one external patron for another — accepted by design; the index is sharpest on the France/CFA question and is not a general "global sovereignty" ranking.

Sovereignty is treated as an *argument to be measured*, not a verdict. The unit of analysis is structural (the euro-pegged, historically French-backed CFA system), not linguistic.

| Zone | Currency | States |
|---|---|---|
| West (UEMOA / BCEAO) | XOF | Benin, Burkina Faso, Côte d'Ivoire, Mali, Niger, Senegal, Togo |
| Central (CEMAC / BEAC) | XAF | Cameroon, Central African Republic, Chad, Rep. of Congo, Gabon |

## A2. What the index rejects as a yardstick

Democracy is a governance technology, **not** the definition of legitimate self-rule and **not** a measuring stick for African states. The index contains no "democracy," "civic space," or third-party democracy-index indicators. Axis B instead measures **capture** — concentration of decision-making power, whoever holds it — which presupposes no political system.

## A3. Two axes, never fused

The index reports **two separate scores per country per year** and never fuses them into a composite. Countries are plotted on a 2-D plane (Axis A × Axis B); each axis also carries its own time series.

- **Axis A — External Autonomy:** freedom of core decisions from French/colonial-orbit control, measured specifically against France and the franc.
- **Axis B — Internal Self-Determination (non-capture):** the degree to which decisions are made by the political community rather than monopolized by **(a)** a narrow domestic elite or **(b)** an external patron. Penalizes both capture modes. Not a democracy index.

## A4. Temporal scope & baseline

- **A4.1 — Scope:** each country is covered from its year of nominal independence to the present, not merely a recent window.
- **A4.2 — Baseline (t=0):** almost all 12 states became independent in **1960** (the "Year of Africa"), giving a shared baseline of 1960. Per-country footnotes apply (Cameroon: French Cameroun 1 Jan 1960, reunification 1 Oct 1961; Senegal: independence within the short-lived Mali Federation, then separate 20 Aug 1960).
- **A4.3 — The gap thesis:** the t=0 reading is *expected* to show low substantive sovereignty despite formal independence. The timeline measures the gap between the flag (1960) and real autonomy, and the march since. This is a feature, not an anomaly to correct.

## A5. Indicators

Each indicator is tagged **HARD** (documented institutional fact or computable public data) or **INTERP.** (analyst reading, anchored to sourced evidence). The two are kept visually distinct so judgment is never mistaken for measurement.

**Axis A — External Autonomy (France / CFA orbit)**

| # | Indicator | Measures | Source | Type | Weight |
|---|---|---|---|---|---|
| **A1** | **CFA monetary arrangement (the franc)** | peg, French guarantee, board composition, operations-account legacy, reserve-repatriation rules | treaty texts, BEAC/BCEAO | HARD (ordinal) | **spine ×1.5** |
| A2 | French trade share | share of exports + imports with France | UN Comtrade | HARD | 1.0 |
| A3 | French financial dependence | AFD aid share + French-linked debt + French ownership of strategic assets | AFD, World Bank, OECD | HARD (mixed) | 1.0 |
| A4 | French military dependence | French bases, troops, defense pacts, French share of arms procurement | SIPRI, open-source | HARD (ordinal) | 1.0 |
| A5 | Diplomatic posture toward Paris | ties status, expulsions, bloc alignment (Françafrique/ECOWAS vs AES/sovereigntist) | event log, primary statements | HARD (event ordinal) | 1.0 |
| A6 | UN voting coincidence with France | how often the state votes with France on contested resolutions | UN voting records | HARD | 1.0 |

**Axis B — Internal Self-Determination (non-capture)**

| # | Indicator | Measures | Source | Type | Weight |
|---|---|---|---|---|---|
| B1 | Power concentration | executive tenure, dynastic succession, dissolution of opposition, open-ended mandates | national records, event log | HARD (mixed/event) | 1.0 |
| B2 | Economic-control concentration (elite capture) | control concentrated in a ruling family/clique, regime-connected firms, resource-rent capture | mixed | INTERP. | 0.5 |
| B3 | Fiscal self-direction | revenue serving domestic priorities vs external debt + aid dependence (aid + external-loan share of budget) | World Bank, OECD | HARD | 1.0 |
| B4 | Strategic-sector ownership (foreign capture) | domestic/state vs foreign ownership of oil, gas, mining | mixed | INTERP. | 0.5 |
| B5 | Food self-sufficiency | cereal import-dependency ratio | FAO | HARD | 1.0 |

## A6. Normalization — anchored / absolute

Every indicator maps to **0–100** against **frozen, published anchor points**, not against the live cohort, so a country's line moves only when *its own* data moves — and a 1965 score sits on the same scale as a 2025 score (this cross-time comparability is what makes A4 possible). Anchors are versioned; changing one is a tracked change. Provisional anchor values exist for Phase 1 calibration and are not yet frozen.

## A7. Weighting

- **No cross-axis aggregation.** Two axes, reported side by side. The index never emits one "sovereignty score."
- **Within each axis:** HARD = weight 1.0; INTERP. = 0.5; normalized to 100% per axis.
- **Spine premium:** A1 (the CFA franc) carries ×1.5, an explicit, flagged value choice — published and revisable after Phase 1.

## A8. Historical coverage rules

- **A8.1 — Per-indicator availability:** each indicator declares its earliest sourced year and is **never scored before its data exists.** Availability genuinely differs by indicator.
- **A8.2 — No interpolation, no back-fill:** gaps remain gaps. The source-and-date rule and the anti-fabrication rule apply identically to historical datapoints. Never smooth, extrapolate, or invent a value to fill a past hole.
- **A8.3 — Coverage-aware scoring (chosen):** in a given year, an axis score is computed from the indicators with sourced data that year, weights renormalized over the available set, and a **coverage value** recorded alongside. *(Alternative not chosen: a fixed "historical-core" subset; revisable if deep coverage proves too thin.)*
- **A8.4 — Deep history via step-functions:** the institutional/event indicators (A1, A4, A5, B1) carry deep history as sourced step-changes; quantitative indicators join from their earliest sourced year.

## A9. Cadence

- **Forward (ongoing):** annual layer (A2, A3, A6, B3, B5) refreshed when its source publishes; event layer (A1, A4, A5, B1, and B2/B4 on triggers) reviewed monthly; a dated, sourced event log published monthly.
- **Historical reconstruction (one-time, per country):** backfill from 1960. Bounded and distinct from the forward cadence.
- A score line moves mid-year only when a documented event moves an event-layer indicator. No freshness is implied that the data cannot support.

## A10. Known limitations (stated up front)

1. **Option 1 is blind to the master-swap** — accepted by design.
2. **Small-N** (12 structurally similar states): comparative within this group, not a global ranking.
3. **Anchors and the ×1.5 spine premium embed value judgments** — published, versioned, revisable.
4. **Interpretive indicators (B2, B4)** carry judgment — half-weighted, sourced, governed.
5. **A1 has low discrimination** across the cohort (all in the CFA band; XOF marginally above XAF post-2020) — but it is arguably the most important thing the index says.
6. **Deep history is uneven** — institutional indicators reach 1960; several quantitative proxies do not. Handled by A8, not by fabrication.

## A11. Openness & governance (requirement level)

The index must be **open-source, forkable, and auditable**: anyone can inspect a score, its source, and the project's history. Interpretive scores (B2, B4) must pass through a **transparent adjudication process** so contested judgments are resolved in the open rather than silently. *(The concrete mechanics — issue/PR flow, review log, licenses — are a development decision; CC-BY for data and a permissive code license are the intended direction.)*

---
---

# PART B — Product Requirements

*What the product must be and do with the measured data.*

## B1. Vision

A public, bilingual, open-source web index that shows — over time, from independence to today — how far the 12 francophone CFA-franc states have moved from the colonial orbit and the franc, turning a sourced, auditable dataset into a visual instrument a non-specialist can read, **without ever collapsing the argument into a single score.**

## B2. Goals & non-goals

**Goals:** two independent axis scores per country and their evolution since 1960; every number auditable at the point of use; two-speed freshness; bilingual FR/EN, French-first; open-source.
**Non-goals:** no composite score, ever; no democracy grading; no real-time/daily ticker; no user accounts or per-user state.

## B3. Users & audience

Primary: the pan-African analytical community (incl. *Fétiches de Guerre*) and educated general readers following Françafrique and CFA debates. Secondary: journalists, students, researchers. Contributors: open-source corrections and interpretive-score challenges.
*Requirement:* all non-contributor users are assumed **non-specialist** — every technical term carries a one-line plain-language gloss in-product.

## B4. Functional requirements

The product must let a user:
- **R1** — see the 12 states on a **map**, colorable by Axis A or Axis B, and open any country.
- **R2** — see the **two-axis plot** (Axis A × Axis B, one marker per country, labeled quadrants); never a combined axis.
- **R3** — open a **country profile**: both axis scores; every indicator with raw value, normalized score, HARD/INTERP tag, FACT/INTERP/CONTESTED tag, and a working source link; and a per-axis time series.
- **R4** — see a **trajectory** of each axis over time, with a cohort overlay.
- **R5** — browse an **event log**: reverse-chronological, filterable, each event tagged to country, axis, indicator, and direction (+/−/0).
- **R6** — read the **methodology**: full rubric, anchor table, weights (incl. the A1 spine premium), and limitations.
- **R7** — **download the data** as raw open data, with a link to the source repository.
- **R8** — **switch language** FR/EN with full parity, French presented first.
- **R9** — see the trajectory (extends R4) **from the country's independence year (~1960) to the present**, with the 1960 baseline marked, event step-changes on institutional indicators, a **coverage/confidence indicator** where the series is sparse, and **gaps shown honestly** — never a continuous line implying absent data.

## B5. Non-functional requirements (constraints)

- **C1 Auditability:** every rendered number links to a resolvable source; project history publicly inspectable.
- **C2 No-composite invariant:** the system must be incapable of emitting a single fused score.
- **C3 Updatable without code changes:** publishing new data (year, country, event) must not require application-code changes.
- **C4 Low running cost:** cheap enough to sustain indefinitely by a solo maintainer.
- **C5 Performance:** fast first paint; usable on mobile.
- **C6 Accessibility:** WCAG-aware contrast; HARD/INTERP and FACT/INTERP/CONTESTED must not rely on color alone.
- **C7 Openness:** source and data open and forkable under clearly stated licenses.

## B6. Content & brand requirements

- **B-1 Plain language:** non-specialist glosses for all technical terms.
- **B-2 Tag system as visual language:** FACT/INTERPRETATION/CONTESTED and HARD/INTERP. as consistent, first-class visual elements everywhere.
- **B-3 Editorial register:** the voice of a serious editorial dossier (*The Sovereignty Review* lineage) — confident, minimal dense prose; charts/timelines/pull-stats carry the argument.
- **B-4 Continental identity:** visual identity reads as pan-African/continental, not tied to one national flag. (Palette/treatment are a design decision for Code.)
- **B-5 Axis distinctness:** Axis A and Axis B visually distinct everywhere; never blended.
- **B-6 Reading the gap:** make the nominal-vs-substantive-sovereignty gap legible to a non-specialist (e.g., the 1960 baseline framed plainly as "independence on paper").

## B7. Data requirements

- **D1 Granularity:** one record per country × indicator × year, plus a separate dated event log.
- **D2 Provenance mandatory:** every datapoint carries a resolvable source reference and a source date. No provenance = invalid.
- **D3 Tagging:** every datapoint carries its HARD/INTERP type and FACT/INTERP/CONTESTED tag.
- **D4 Versioned & auditable:** every change to data, anchors, or weights is individually inspectable in project history.
- **D5 Two-speed freshness:** annually-refreshed vs event-driven indicators are distinguished; no implied freshness beyond what is sourced.
- **D6 Anchored scores reproducible:** a stored score is reproducible from its raw value and the published anchor.
- **D7 Independence year:** each country record carries `independence_year` (with a footnote field).
- **D8 Indicator availability:** each indicator carries its `earliest_sourced_year`.
- **D9 Coverage stored, interpolation forbidden:** each axis-year score stores its `coverage` value; no stored or displayed value may be interpolated; sparse periods display as sparse.

## B8. Proof-of-concept scope & acceptance

**Scope:** two countries scored end-to-end — **Gabon and Burkina Faso** — a controlled contrast (same region, both post-coup, one per monetary zone, opposite external trajectories, both with internal-capture stories).
**Acceptance:**
1. Both scored on all 11 indicators, every datapoint sourced and tagged.
2. Provisional anchors and the A1 spine weight produce defensible relative results (absurd outputs ⇒ recalibrate).
3. Both usable through R1–R7.
4. Trajectories render **from 1960 to present** with honestly-sourced points and visible coverage, even where deep history is sparse (proving the mechanism, not requiring a dense 66-year series).
5. POC content available in FR and EN (R8).

## B9. Out of scope here (owned by Claude Code)

Not specified in this requirements document; handled in development per the SDLC doc: **design** (visual system, palette, layout, components); **implementation** (stack, repo structure, the concrete data schema, scoring/validation scripts, the site); **testing** (software tests + the epistemic eval suite); **review** (code review + interpretive-score governance mechanics); **deployment** (hosting, build, release); **maintenance** (operating cadence and update loop).

## B10. Open requirement decisions

- **A1 spine weight (×1.5):** confirm or revise during Phase 1 calibration.
- **Translation timing:** per-release vs batched after each phase freezes (French-first parity holds either way).
- **Coverage-aware vs historical-core subset** for deep history: written as coverage-aware; revisable after Phase 1.

---

*v0.3 — single requirements document (domain + product + temporal). Pairs with `IAFS_SDLC_v0.1.md` (operating manual). Development phases owned by Claude Code.*
