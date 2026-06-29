# ADR 0001 — Dark "night-newsroom" palette replaces "Editorial Atlas"

**Status:** Accepted · 2026-06-28
**Supersedes:** the pre-v2 Editorial Atlas palette (paper #F7F3EC · ink #1B1B1F · earth · oxblood) defined in the initial scaffold.

## Context

The Phase-2 scaffold shipped with an "Editorial Atlas" palette: warm paper background, ink text, earth + oxblood accents, Cormorant Garamond display, indigo Axis A / ochre Axis B. The aesthetic referenced mid-century atlases — coherent with the editorial-dossier register the PRD asks for (B-3).

When the landing was first rendered, the maintainer pushed back: the palette read as **muted and dated**, the wrong vibe for a contemporary public-facing argument. Specifically: not enough contrast for the map to pop, no clear UEMOA/CEMAC differentiation, the overall register felt closer to "academic monograph" than "live public dashboard."

Three alternatives were on the table:

1. Keep paper palette, push more contrast inside it (saturate axes further on cream)
2. Switch to a clean light SaaS register (Stripe/Linear vibe — white surface + accent colors)
3. Dark "night-newsroom" register (deep charcoal bg + vivid axis colors)

## Decision

Adopt **option 3**: dark canvas, vivid axis colors, coral accent. Concretely:

- `--c-bg: #0A0B10` near-black with warm cast
- `--c-text: #F2EEE5` warm cream
- `--c-axis-a: #6B8EFF` electric indigo (Axis A · External Autonomy)
- `--c-axis-b: #FFB94A` warm amber (Axis B · Internal Self-Determination)
- `--c-accent: #FF5C5C` coral (gap line, baseline, kicker text, dummy banner)

Typography unchanged: Cormorant Garamond (display) · Inter (body) · JetBrains Mono (data). The editorial register stays; the surface flips dark.

## Consequences

**Better:**
- Map hero pops; UEMOA/CEMAC zones are unmistakable
- Coral accent gives the "gap" / "dummy data" / kicker copy a single recognizable signal
- All colors live as CSS custom properties (`--c-*`) consumed via Tailwind tokens — no raw hex in components

**Costs accepted:**
- Light-mode users with strong preferences will dislike it; we don't ship a light variant
- The 1950s-atlas reference disappears; the editorial register now leans more "Rest of World" / "Le Monde diplomatique digital" than "old print"

**Off-limits going forward:**
- No re-introducing the warm paper palette without a fresh ADR superseding this one
- The two axis colors must stay distinct in hue AND luminance (indigo + amber pass colorblindness checks)
- Color is reinforcement only — tag system (FACT/INTERP/CONTESTED) carries meaning via shape + typography (C6)

## Links

- Implementation: `tailwind.config.mjs`, `src/styles/global.css`
- Landing rebuild PR: [feat/landing-v2-big-interactive-map](https://github.com/diaspoai/afroindexsovereignty/pull/3)
- Non-landing palette sweep: same PR, later commit
