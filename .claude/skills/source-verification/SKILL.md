---
name: source-verification
description: Fetch a cited source, hash its content, capture a Wayback snapshot, and write an evidence receipt under evidence/<sha>/. Invoked whenever a Score or Event record is added or modified — the trajectory eval (06_anti_fabrication) requires the receipt before merge.
---

# Source verification (dynamic context, fires on data edits)

## When to invoke
- Any time a record is added or edited under `data/scores/` or `data/events.json`.
- Before opening a PR that touches data.

## Output contract (the eval 06 input)
For each changed Score or Event, write:
```
evidence/<git-short-sha>/<ISO3>-<indicator>-<year>.json
```
(for events: `evidence/<sha>/event-<event-id>.json`)

with shape:
```json
{
  "score_ref": "GAB/A2/2024",
  "source_url": "https://...",
  "fetched_at": "2026-06-28T12:34:56Z",
  "http_status": 200,
  "content_sha256": "abc...",
  "content_excerpt": "First ~500 chars or the relevant table/cell",
  "wayback_url": "https://web.archive.org/web/2026.../https://..."
}
```

## Procedure
1. **Fetch.** `WebFetch(source_url)` → record `http_status`, full body.
2. **Hash.** Compute `sha256(body)` → `content_sha256`.
3. **Excerpt.** Pull the first ~500 chars OR (preferably) the specific paragraph / table cell that supports the score's `raw_value`. Quote verbatim.
4. **Archive.** Submit to Wayback (`https://web.archive.org/save/<url>`) and record the returned snapshot URL. If submission fails (rate limit, blocked), fall back to the latest existing snapshot via `https://archive.org/wayback/available?url=<url>`. If no snapshot exists at all, FAIL — flag the PR and ask the maintainer to handle manually.
5. **Write the receipt.** JSON, pretty-printed.

## What the CI eval (06) will check
- Receipt exists for every changed Score / Event in the PR diff.
- `source_url` matches the Score / Event record's `source_url`.
- CI re-fetches and asserts the fresh `sha256` equals the receipt's `content_sha256`. If the source has changed, the receipt is stale and the PR is held.
- The `wayback_url` resolves to a real snapshot at or before `fetched_at`.

## Dummy mode
If `data/methodology.json` has `mode: "dummy"`, receipts are NOT required for `example.invalid` URLs. The harness is still wired and ready; the moment the mode flips to `real`, every score must carry a receipt or CI blocks the merge.

## Hard rule
Never write a receipt for a source you have not actually fetched. A fabricated receipt is the project-ending failure mode — worse than a missing one, because it appears verified.
