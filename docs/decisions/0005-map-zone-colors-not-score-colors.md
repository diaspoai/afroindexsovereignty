# ADR 0005 — Map colors indicate monetary zone, not score

**Status:** Accepted · 2026-06-28

## Context

The R1 landing map highlights the 12 CFA-franc states. The redesign filled UEMOA states with vivid indigo (`--c-axis-a-soft`) and CEMAC states with vivid amber (`--c-axis-b-soft`) — the exact colors used elsewhere as Axis A and Axis B semantic markers.

This creates a real risk of category confusion: a visitor unfamiliar with the project might read "indigo state = high axis-A score" / "amber state = high axis-B score." That violates the founding non-negotiable:

- **NN#1**: no composite score, two axes always reported separately
- **NN#7**: anchored/absolute normalization (a country's score moves only when *its own* data moves)
- The map showing real-data-implications before any real data exists would be the worst possible failure mode

Alternatives considered:

- **A**: Use entirely different hues for monetary zones (e.g. teal + magenta) so they can't be confused with axis colors
- **B**: Use uniform earth fill for all 12 with no zone differentiation
- **C**: Use the axis colors for zone, but enforce the "zone ≠ score" rule by code + copy + caption + tooltip

## Decision

Adopt **option C**, with three reinforcing guardrails:

1. **Caption** (visible under the map): *"Les couleurs indiquent la zone monétaire (institutionnel), pas un score. Aucune donnée par pays n'est rendue."* / *"Colors indicate monetary zone (institutional fact), not a score. No per-country data is rendered."*
2. **Tooltip / aria-label on every CFA state path** explicitly says `"<Country> — <Zone>, <Currency> — Données à venir"` so no axis-score is implied
3. **Code-level prohibition**: until real per-country data exists (i.e. `methodology.mode === "real"` AND that country has scores), the map MUST NOT color any state by an axis-derived value — only by zone (or uniform). Receipts in the codebase: `src/components/landing/AfricaMap.astro` only reads `c.zone` to choose fill; it never reads any score.

## Consequences

**Better:**
- The map's color scheme reuses the project's recognizable axis palette → visual cohesion with the rest of the site
- The two CFA monetary zones (UEMOA / CEMAC) become unmissable at a glance — a real institutional fact worth surfacing
- The non-fusion contract is preserved technically, not just by convention

**Cost accepted:**
- The reuse of axis colors creates a teaching burden in the caption + tooltips that wouldn't exist with different hues
- A contributor could in theory wire score-driven coloring later "to match a country profile" — the prohibition lives in this ADR and in component review, not yet in a lint rule

**Off-limits going forward without a new ADR:**
- Coloring CFA states by any axis score on the landing
- Removing the caption or weakening the tooltip language
- Applying the indigo/amber fills outside of the zone-membership context (e.g. heatmap-style intensity from an axis value)

**When real per-country data lands**, country-profile pages already use the axis palette for trajectories and scores — that's fine, because the context there is explicitly per-country score data. The landing map remains zone-only.

## Links

- Implementation: `src/components/landing/AfricaMap.astro`
- Non-fusion principle: `docs/IAFS_Requirements_v0.3.md` §A3
- Visual language rules: `CLAUDE.md` non-negotiable #1 + #6
