# ADR 0003 — Levels design-system skill on Editorial Atlas semantics

**Status:** Accepted · 2026-06-28

## Context

The v1 landing was visually consistent but lacked discipline: oversize headings, ad-hoc spacing values, interactive elements with implicit hover-only states, no enforcement of "semantic tokens over raw hex." Reviewing it against the maintainer's "I don't love the UI" signal surfaced that the underlying issue was **structural**, not just aesthetic.

The maintainer asked to install the [Levels](https://typeui.sh) design-system skill via `npx typeui.sh pull levels -p claude-code`. Levels is a conversion-focused, modern, clean spec: SaaS palette (zinc + violet), Inter everywhere, WCAG 2.2 AA testable acceptance criteria, explicit interaction states (default · hover · focus-visible · active · disabled), spacing 4/8/12/16/24/32, type 12/14/16/20/24/32.

Levels' **aesthetic** (zinc + violet, SaaS register) directly clashes with the IAFS contract: the axis colors are non-negotiable (indigo Axis A, amber Axis B); the voice is editorial, not SaaS; "convert toward action" is the wrong frame for a sourced public-index that has no funnel.

Three ways to combine the two were considered:

- **A**: Replace Editorial Atlas entirely with Levels → aesthetic loss, contract violation
- **B**: Adopt Levels' **structure** (tokens, scales, interaction-state discipline, a11y acceptance criteria) but keep Editorial Atlas's **aesthetic** (palette, typography, semantic axis colors)
- **C**: Use Levels only on conversion surfaces (CTA flows) — but IAFS has none

## Decision

Adopt **option B**: Levels' structural discipline on Editorial Atlas semantics.

Concretely:
- Spacing scale locked to `4 / 8 / 12 / 16 / 24 / 32` (Tailwind config)
- Type scale locked to `12 / 14 / 16 / 20 / 24 / 32` px + a single `text-display` escape hatch (hero only, clamped 40–64px)
- Every interactive element declares `default · hover · focus-visible · active` (no implicit hover-only); enforced by component review + axe
- All colors via CSS custom properties (`--c-*`) referenced through Tailwind tokens; **zero raw hex in `.astro` component class attrs** (verified by `grep -rn "bg-white\|bg-paper\|text-paper\|border-ink" src/`)
- WCAG 2.2 AA via axe-core scans in Playwright (no critical violations per scan)
- Voice tightening: editorial register kept; landing copy cut 20–30%

The Levels SKILL.md file lives at `.claude/skills/design-system/SKILL.md` (and `.agents/` mirror) — committed so any agent/tool reads the same rules.

## Consequences

**Better:**
- Predictable visual rhythm; new components inherit constraints automatically
- A11y is testable, not aspirational
- Future palette changes happen in `tailwind.config.mjs` + `global.css` only; components don't move

**Off-limits going forward:**
- No raw hex in `.astro` components (enforce with grep in PR review until a lint hook lands)
- No new heading sizes outside the scale (use `text-display` only for the hero)
- No `hover:` without a corresponding `focus-visible:` on the same element

**Levels' aesthetic** (zinc/violet palette, Inter display, conversion framing) is **not adopted** and must not be reintroduced piecemeal. If it ever needs to be (e.g. a separate marketing surface), write a new ADR scoping where.

## Links

- Skill source: `.claude/skills/design-system/SKILL.md`
- Implementation PR (v2 landing): [#3](https://github.com/diaspoai/afroindexsovereignty/pull/3)
- Non-landing sweep: same PR, later commit
