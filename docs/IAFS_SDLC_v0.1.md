# IAFS — AI-Driven SDLC · v0.1

**Author:** @Trilogy237
**Companion to:** `IAFS_Phase0_Methodology_v0.2.md` (what is measured) and `IAFS_PRD_v0.1.md` (what the product does). This document defines **how the project is built and maintained with AI agents.**
**Grounding:** Osmani, Saboo & Kartakis, *The New SDLC With Vibe Coding* (Google, June 2026). Concepts are applied here in our own words to IAFS.

---

## 0. The one idea that organizes everything

The New SDLC's core claim — *set the bar at the eval, not the demo* — is the same principle as IAFS's founding rule: *a sourced case persuades; an unsourced one is dismissed.* In both, **verification is the line between real work and vibes.** So this SDLC is built backwards from verification: we decide what "correct" means first, encode it as automated checks, and let agents move fast inside those guardrails.

For IAFS, "correct" has **two tracks**:
- **Software correctness** — the site builds, renders, and conforms to the schema.
- **Epistemic correctness** — every datapoint resolves to a real source of the right date, every score matches the published anchor, every FACT/INTERP/CONTESTED tag is right, and no number was invented.

The second track is non-negotiable and unusual; most projects don't have it. It is the project's reason to exist, so it gets first-class tooling.

---

## 1. Agent = model + harness (so we invest in the harness)

Per the paper, an agent is ~10% model and ~90% harness — the rule files, schema, tools, guardrails, and skills around the model. When an agent does something wrong, debug the harness first. For IAFS the harness is:

| Harness layer | IAFS instance |
|---|---|
| Rule files (static context) | `CLAUDE.md` / `AGENTS.md` — the non-negotiables (Appendix A) |
| Governing documents | the methodology spec v0.2 + the PRD |
| Deterministic guardrails | the JSON schema + `validate` script (rejects any datapoint missing a source/date; rejects any composite score) |
| Skills (dynamic context) | a scoring skill, a source-verification skill, a translation skill |
| Tools / MCP | web search + fetch (sourcing), Git (the source of truth) |
| Observability | the eval suite output + a drift checklist (§4) |

The model will be swapped under this harness over time; the harness is the durable asset.

---

## 2. Context engineering: static vs dynamic (this is a financial lever)

Static context loads every turn — reliable, expensive. Dynamic context loads on demand — cheap per task. The boundary is a versioned architectural decision, reviewed in PRs.

| Context | Bucket | Why |
|---|---|---|
| The non-negotiables: two axes never fused, Option 1 (France/CFA only), no composite, source-required, FACT/INTERP/CONTESTED, French-first parity | **Static** (`CLAUDE.md`) | Safety rules the agent must never forget |
| Full methodology spec, anchor table, scoring rubric | **Dynamic** (skill, fires on scoring tasks) | Heavy; only needed when scoring |
| Per-country data, event log | **Dynamic** (read from `data/` on demand) | Large; load only the country in play |
| Translation conventions | **Dynamic** (skill, fires on FR/EN tasks) | Only needed at translation time |

Rule of thumb: if forgetting it would make the agent *unsafe or off-mission*, it's static; if it's reference material a task pulls when relevant, it's dynamic.

---

## 3. The lifecycle, phase by phase (and who owns each)

AI compresses the lifecycle unevenly: implementation collapses to hours; requirements, architecture, and verification stay slow because they are judgment work. So **specification quality is the bottleneck** — which is why we front-loaded it.

| Phase | Status / owner | Notes |
|---|---|---|
| **Requirements / spec** | ✅ done — chat | Spec v0.2 + PRD. The bottleneck phase; already invested. |
| **Architecture** | ✅ done — human calls, documented | Two axes, anchored normalization, Option 1, static-site, two-speed cadence. The "stubbornly human" phase; the calls are recorded in the spec so the agent implements rather than decides them. |
| **Implementation** | Code (conductor + orchestrator) | Fast. Site + scripts. AI turns this from writing into reviewing. |
| **Verification** | automated + human (§4) | The heart. Tests for software, evals for data honesty. A country is "done" when it passes the eval suite, not when the page renders. |
| **Maintenance / operate** | chat + automation (§6) | The two-speed cadence: annual data refresh + monthly event log. The underrated phase — kept cheap by the harness. |

The ceiling is the **80% problem**: agents nail the first 80% fast; the last 20% needs human context. For IAFS the 20% that stays human is exactly: interpretive scores (B2/B4), anchor calibration, and adjudicating contested entries. Plan human time there, not on the routine 80%.

---

## 4. Verification design (the two tracks, concretely)

**Track 1 — software tests (deterministic):**
- Schema validation: every `scores/*.json` and `events.json` record conforms to the contract.
- Normalization test: given a raw value + the published anchor, the stored `normalized_score` is recomputed and must match. (This makes scoring auditable and catches silent anchor drift.)
- Build + render + dead-link checks on the static site.

**Track 2 — epistemic evals (the project's soul):**
- **Source-resolution eval:** every datapoint's `source_url` resolves live and its `source_date` is consistent. A score with a dead or missing source fails.
- **Anchor-conformance eval (output eval):** each score is the correct mapping of its raw value through the published anchor — no off-rubric numbers.
- **Tag eval:** FACT/INTERP/CONTESTED and HARD/INTERP are applied per the spec's definitions.
- **Anti-fabrication eval (trajectory eval):** for any agent-produced score, the trajectory must show a real fetch of the cited source — not a number that merely looks plausible. This is the guardrail against the one failure mode that would kill the project's credibility.
- **No-composite eval:** assert the system never emits a single fused "sovereignty score."

*Set the bar at the eval, not the demo:* the definition of "Gabon is scored" is "Gabon passes all of the above," not "Gabon's page loads."

---

## 5. Economics & model routing

Context and routing are financial levers, not just technical ones. Because IAFS is long-lived (years, monthly updates), the agentic-engineering curve (more up front, low per-feature after) is the right side of the crossover — front-load schemas, evals, structured context.

Routing:
- **Big / capable model** → judgment work: scoring decisions, interpretive adjudication (B2/B4), methodology changes, anchor calibration.
- **Small / cheap model** → routine work: schema validation, link-checking, CI, regression runs, first-pass FR/EN translation drafts.

Don't pass the whole repo into every prompt; load the country and the rubric the task needs (see §2).

---

## 6. Operating modes & the maintenance loop

Two working modes from the paper:
- **Conductor** (real-time, in the IDE): exploring the build, unfamiliar code — the initial site work in Code.
- **Orchestrator** (async, hand off a goal, review what returns): well-specified batch work — validating data, scoring the remaining 10 states, generating translations, regression checks.

**Monthly maintenance loop (two-speed cadence):**
1. *(orchestrator)* draft event-log entries from the month's sourced developments → human review (the 20%).
2. *(automated)* re-run the eval suite over event-layer indicators (A1, A4, A5, B1, B2/B4 on triggers).
3. *(annual trigger)* when a source publishes, refresh the annual-layer indicators and recompute.
4. *(human)* approve; commit. The commit history is the audit trail and the trajectory the site renders.

Optional future step the paper points at: a small **update agent** that proposes monthly event entries with sources attached, always gated by human review — prototype and production in the same loop.

---

## 7. Setup checklist (the harness to create in Code)

- [ ] `CLAUDE.md` / `AGENTS.md` — the non-negotiables (Appendix A) — committed and versioned.
- [ ] `data/` schema + `indicators.json` (anchors, weights) frozen as the contract.
- [ ] `scripts/validate.*` — rejects any datapoint missing source/date; rejects composites.
- [ ] `scripts/normalize.*` — single source of truth for raw→score, so the conformance test can recompute.
- [ ] `/evals/` — the Track-2 checks (source-resolution, anchor-conformance, tag, anti-fabrication, no-composite).
- [ ] CI: run Track 1 + Track 2 on every PR; block merge on failure.
- [ ] A scoring skill + a translation skill (dynamic context).
- [ ] Governance: PR template + interpretive-score review log (from spec §8).
- [ ] Dual licensing: CC-BY (data), MIT (code).

---

## Appendix A — Starter `CLAUDE.md` / `AGENTS.md` (static context)

> Drop this at the repo root. It is the always-loaded rule file — the most important, most expensive context, so keep it short and absolute. Version it like code.

```md
# IAFS — Agent Rules (always loaded)

## What this project is
A public, open-source, bilingual (FR-first) index tracking the sovereignty
trajectory of the 12 francophone CFA-franc states against the colonial orbit
(France) and the CFA franc. Two independent axes, never fused.

## Non-negotiables (never violate)
1. NEVER emit a single composite "sovereignty score." Two axes, reported separately.
2. Measure ONLY against France / the CFA orbit (Option 1). No multi-pole guard.
3. Axis B measures CAPTURE, not democracy. Never grade against a Western
   democratic template. No Freedom House / V-Dem "civic space" indicators.
4. Every datapoint MUST carry a live source_url and a source_date. No source → not allowed.
5. NEVER invent a figure, quote, or citation. If unverifiable, label it an
   estimate or omit it. A fabricated source is a project-ending failure.
6. Tag everything: FACT / INTERPRETATION / CONTESTED, and HARD / INTERP.
7. Anchored/absolute normalization only: a score moves only when that country's
   own data moves. Anchors are published; changing one is a tagged commit.
8. French-first parity: FR and EN content kept in sync; FR presented first.

## How to verify (set the bar at the eval, not the demo)
- A country is "done" only when it passes the eval suite: schema, source-resolution,
  anchor-conformance, tag, anti-fabrication, no-composite. Not when the page renders.

## Where things live
- methodology/  = the spec (governing). data/ = the source of truth. scripts/ =
  validate + normalize. evals/ = the checks. site/ = static front-end reading data/.

## When unsure
- Debug the harness first (missing tool, loose rule, junk context), not the model.
- Load the country + rubric the task needs; do not pass the whole repo every prompt.
```

---

*v0.1. Companion to the spec and PRD; together they are the full input package for Claude Code. Next: hand all three to Code to scaffold the repo + harness, then return here to score Gabon and Burkina against the evals.*
