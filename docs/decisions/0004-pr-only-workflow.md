# ADR 0004 — PR-only workflow, enforced by branch protection

**Status:** Accepted · 2026-06-28

## Context

During Phase-2 scaffold and the v2 redesign, several commits landed directly on `main`: the initial scaffold push, the Cloudflare adapter fix series, two follow-up CI fixes. Each was small and felt safe in the moment. They were also un-reviewed and bypassed the eval suite as a merge gate.

For a project whose editorial credibility hinges on auditability (CLAUDE.md non-negotiables #1–#9), "trust me, this commit is safe" is the wrong posture. The maintainer pulled the rule explicit on 2026-06-28: *"always create PR for all future commits. No direct commit to main. Please enforce it."*

Two enforcement levels were available:

1. **Convention only** — document the rule in `CLAUDE.md`, hope future agents/contributors honor it.
2. **Technical enforcement** — GitHub branch protection on `main` requiring PRs, requiring the `ci` status check, blocking force-pushes and deletions.

## Decision

Adopt **technical enforcement** (level 2). Branch protection on `main` set via the GitHub API:

```json
{
  "required_status_checks": { "strict": true, "contexts": ["ci"] },
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "required_conversation_resolution": true
}
```

Plus document the rule in `CLAUDE.md` under "Workflow (PR-only — no exceptions)" so any agent reading the repo's static context sees it before its first edit.

## Consequences

**Better:**
- Every change is reviewable, audited, and revertable individually
- CI runs on every PR; the eight evals + lint:composite gate every merge
- The commit history on `main` is the audit trail the project's credibility line depends on

**Off-limits:**
- Direct `git push origin main` (rejected by GitHub)
- Force-pushes to `main` (blocked)
- Squashing review-time fixes back into one commit by deleting the PR branch (deletion blocked)

**Costs accepted:**
- Even one-line typo fixes require a branch + PR + CI run. Acceptable for a project with high credibility stakes; would be overkill for a hobby script.

**Exception:** an explicit, in-message authorization from the maintainer can override for a specific change. Even then, prefer a PR.

## Links

- CLAUDE.md "Workflow (PR-only — no exceptions)" section
- Branch protection rule on `main`: visible via `gh api repos/diaspoai/afroindexsovereignty/branches/main/protection`
