# Research workflow tools

CLI tools for the data-research bottleneck. The site is done; the project's
limiting factor is sourced country data. These tools make landing real
data ergonomic and prevent the hand-edit failure modes the schema/evals
were designed to catch.

> All three tools refuse to overwrite existing records — by design.
> Re-runs require an explicit removal first.

## End-to-end: adding one country

For a new country (e.g. Burkina Faso):

### 1. Bootstrap the country

```bash
npm run research:init-country -- \
  --iso3 BFA --zone UEMOA --currency XOF \
  --name-fr "Burkina Faso" --name-en "Burkina Faso"
```

Writes a `Country` record to `data/countries.json` and creates an empty
`data/scores/BFA.json`. Prints a per-indicator sourcing checklist
ordered by leverage (step-function indicators first — they carry
deep history back to independence).

### 2. For each indicator × year, compose the score

```bash
npm run research:add-score -- \
  --country BFA --indicator A2 --year 2024 \
  --raw-value 14.5 \
  --source-url https://comtradeplus.un.org/.../bfa-2024 \
  --source-date 2025-06-15 \
  --tag FACT \
  --note-fr "Part française des importations 14,5%."
```

The tool:
- Computes `normalized_score` from the indicator's published anchor (no
  hand-math, eliminates eval 02 surprises)
- Chooses `kind: "annual"` or `kind: "step"` from the indicator's
  `history_mode` (no kind-mismatch surprises)
- Validates year ≥ `max(independence_year, earliest_sourced_year)` (A8.1)
- Refuses to overwrite an existing `(country, indicator, year)` record
- Refuses INTERP records without `--review-log-id`

For step indicators (A1, A4, A5, B1), the value of `--year` becomes
`effective_year`.

### 3. Capture the evidence receipt

```bash
npm run research:capture -- \
  --score-ref BFA/A2/2024 \
  --url https://comtradeplus.un.org/.../bfa-2024 \
  --excerpt "France: 14.5% of total imports in 2024"
```

The tool:
- Re-fetches the source via `freshFetch` (same code path eval 06 uses to
  verify in real mode — if it fetches now and re-fetches later with the
  same hash, the receipt verifies)
- Submits the URL to Wayback (`/save/<url>`); falls back to the latest
  existing snapshot if the save fails
- Writes `evidence/<git-short-sha>/BFA-A2-2024.json` matching `schemas/receipt.schema.json`

The receipt is what the real-mode anti-fabrication eval (06) verifies on
every PR. **No receipt → no merge in real mode.**

### 4. Run the local gate

```bash
npm run validate                  # schema + cross-record + real-mode guard
npm run normalize -- --write      # regenerates data/axis_scores/BFA.json
npm run test                      # all 8 evals + unit tests
npm run lint:composite            # no-composite invariant
```

If all green, `git add data evidence` and open a PR.

## When to flip `methodology.mode` to `"real"`

Only after at least one country has receipts for every score and event.
With `mode: "real"`:

- `validate.ts` refuses any score that lacks a matching receipt (K3 guard)
- eval 06 re-fetches every receipt's source + Wayback URL and asserts
  `content_sha256` matches (K5 verifier)

Both failure modes — fabricated receipts, stale receipts — are caught
at PR time before merge.

While in `mode: "dummy"`, receipts are optional and `example.invalid` URLs
are whitelisted; the harness is wired but inert. The flip is a one-line
edit in `data/methodology.json`.

## Tools at a glance

| Tool | Writes | Idempotent? |
|---|---|---|
| `research:init-country` | `data/countries.json`, `data/scores/<ISO3>.json` (empty) | Refuses if country exists |
| `research:add-score` | `data/scores/<ISO3>.json` (appends sorted) | Refuses if (country, indicator, year) exists |
| `research:capture` | `evidence/<sha>/<ISO3>-<indicator>-<year>.json` | Refuses if file exists |

All three support `--dry-run` to print what would be written without
touching disk. Use `--help` for full flag listing.

## Related

- Frozen schema: [`../../docs/SCHEMA_FROZEN_v0.3.0.md`](../../docs/SCHEMA_FROZEN_v0.3.0.md)
- Source-verification skill: [`../../.claude/skills/source-verification/SKILL.md`](../../.claude/skills/source-verification/SKILL.md)
- Real-mode startup guard: `scripts/lib/realmode-guard.ts` (K3)
- Anti-fabrication verifier: `scripts/lib/anti-fabrication-verify.ts` (K5)
- ADR 0005 (map zone-colors-not-score): preserves the non-fusion contract on R1
