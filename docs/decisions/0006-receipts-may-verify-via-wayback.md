# ADR 0006 — Receipts may verify via Wayback snapshot for mutable sources

**Status:** Accepted · 2026-06-29

## Context

K5 shipped the anti-fabrication eval 06: in real mode, every receipt's
`content_sha256` is re-verified by CI by re-fetching the source URL and
hashing the body. The design intentionally catches both fabricated
receipts AND source drift — if the source changed, the hash differs,
the receipt is stale.

This works perfectly for sources whose content is stable: treaty texts,
government PDFs, BCEAO/IMF official communiqués, archived datasets.

It **fails immediately** for mutable sources: Wikipedia (edited daily),
news articles (silently updated), scholarly aggregators that re-render
pages dynamically. The hash on the receipt is correct at fetch time;
the next CI run re-fetches and gets a different hash because the source
changed; eval 06 fails for reasons unrelated to credibility.

We hit this on the K8 BFA pilot. The 1960 baseline for BFA A1 cites
Wikipedia's BCEAO article (Q1-a in the pilot conversation) — acceptable
as a pilot citation pending upgrade to a primary source. Without a
mechanism for mutable sources, the receipt would fail eval 06 within days.

Three alternatives considered:

- **A**: ban mutable sources entirely. Forces primary citations always.
  Too strict — pilots need to ship, and some legitimate sources
  (Wikipedia-as-aggregator-of-primary-references) are useful.
- **B**: drop the sha256 check entirely; rely only on the Wayback
  snapshot's existence. Loses the fabrication catch — anyone could
  write a receipt for any URL.
- **C**: per-receipt opt-in to verify against the Wayback snapshot
  instead of the live URL. Snapshots are immutable; verification stays
  stringent; the live URL is captured for human readers and audit.

## Decision

Adopt **option C**: receipts gain an optional field `verify_via: "live" | "wayback"`, default `"live"`.

- **`verify_via: "live"`** (default, unchanged behavior): eval 06 fetches
  `source_url` and hashes the body. `wayback_url` is HEAD-probed separately.
- **`verify_via: "wayback"`**: eval 06 fetches `wayback_url` (the immutable
  snapshot) and hashes the body. The HEAD-probe is implicit (the fetch IS
  the probe). The `source_url` field is informational.

`tools/research/capture.ts` gains `--verify-via live|wayback`. When set
to `wayback`, capture:
1. Live-fetches `source_url` (sanity check that the live URL works)
2. Submits to Wayback (or finds existing snapshot)
3. **Re-fetches the Wayback snapshot and hashes THAT** — the receipt's
   `content_sha256` reflects the immutable snapshot

## Consequences

**Better:**
- Mutable sources (Wikipedia, news, social-media-reporting outlets) are
  usable as citations without breaking eval 06 every time the source
  is edited
- Fabrication detection preserved: the snapshot is immutable in Wayback,
  so hashing it still catches a receipt pointing at content that doesn't
  exist
- Backward-compatible: existing receipts default to `verify_via: "live"`

**Costs accepted:**
- Wayback Machine becomes a single point of trust for mutable-source
  verification. If Wayback ever serves modified content under an existing
  snapshot URL (it doesn't, but if), the verification would silently pass.
  Mitigated by Wayback's reputation and the project's open audit trail.
- A two-step capture (live + snapshot) takes ~30s more than live-only.
  Acceptable for a research workflow.
- Reviewer must check `verify_via` field in PRs — a receipt declared
  `"wayback"` for a stable source (e.g. a treaty PDF) is fine but wasteful.

**Off-limits without superseding this ADR:**
- `verify_via: "none"` or "skip" — no escape from verification entirely
- Hashing arbitrary cached versions (only Wayback is accepted as the
  immutable-snapshot provider)

**When to use each:**
- `verify_via: "live"` (default) — government PDFs, official statements,
  scholarly archive URLs, datasets with permanent IDs (DOI), BCEAO/IMF
  communiqués at stable URLs
- `verify_via: "wayback"` — Wikipedia, news articles, blog posts,
  any URL whose content management system allows post-publication edits

## Links

- Schema: `schemas/receipt.schema.json` (`verify_via` field)
- Tool: `tools/research/capture.ts` (`--verify-via` flag)
- Eval: `evals/06_anti_fabrication.test.ts` (real-mode branch)
- Type: `scripts/lib/realmode-guard.ts` (Receipt interface)
- Built on: K5 ([ADR-less; implementation in PR #8])
