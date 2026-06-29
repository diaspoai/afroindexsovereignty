# Architecture Decision Records

Short, dated records of meaningful architectural / design / process decisions.
The point is to capture the **why** behind a choice so future contributors
(human or agent) don't re-litigate settled questions.

## Format

Each ADR is one file: `NNNN-short-slug.md`. Four sections:

1. **Status** — `Accepted` · `Superseded by NNNN` · `Deprecated` · `Proposed`.
2. **Context** — what was the situation, what were the alternatives, what
   forced the choice.
3. **Decision** — what we chose, in one sentence then expanded.
4. **Consequences** — what becomes easier, harder, off-limits. Costs we accept.

Keep them short (≤ 60 lines). If you need to elaborate, link a longer doc.

## When to write one

- A non-obvious technical or design call that took thinking
- A reversal of a prior decision (write a new ADR; mark the old one Superseded)
- A rule that lives only in commit messages or tribal memory

## When NOT to write one

- Routine bug fixes
- Style/lint choices encoded in a linter or formatter
- Decisions already captured authoritatively elsewhere
  (e.g. the frozen schema in `docs/SCHEMA_FROZEN_v0.3.0.md`)
