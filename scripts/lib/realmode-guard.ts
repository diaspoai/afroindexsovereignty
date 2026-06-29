/**
 * Real-mode startup guard.
 *
 * When methodology.mode === "real", this is the LIGHT pre-check that runs
 * inside validate.ts — before the heavier eval 06 (anti-fabrication). It
 * catches the project-killer mistake of flipping mode to "real" without
 * evidence receipts in place, BEFORE any PR can ship unverified scores.
 *
 * What it checks:
 *   1. No source_url uses the example.invalid host (those are dummy-only)
 *   2. Every Score has a matching Receipt (by score_ref = ISO3/IND/YEAR)
 *   3. Every Event has a matching Receipt (by score_ref = event/<id>)
 *   4. Each Receipt's source_url matches its referent's source_url exactly
 *
 * What it does NOT check (eval 06 does):
 *   - Re-fetching the source and verifying content_sha256 still matches
 *   - Whether wayback_url actually resolves
 *
 * Pure function: takes data as input, returns string[] of errors.
 * Easy to unit-test without touching the filesystem.
 */
import type { Score, IafsEvent, Methodology } from "./types.ts";

export interface Receipt {
  score_ref: string;
  source_url: string;
  fetched_at: string;
  http_status: number;
  content_sha256: string;
  content_excerpt?: string;
  wayback_url: string;
  /** Which URL eval 06 re-fetches to verify content_sha256. Default "live". */
  verify_via?: "live" | "wayback";
}

export interface RealModeInput {
  methodology: Pick<Methodology, "mode">;
  scores: Score[];
  events: IafsEvent[];
  receipts: Receipt[];
}

export function scoreRef(s: Score): string {
  const year = s.kind === "annual" ? s.year : s.effective_year;
  return `${s.country}/${s.indicator_id}/${year}`;
}

export function eventRef(e: { id: string }): string {
  return `event/${e.id}`;
}

function isExampleInvalid(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith("example.invalid");
  } catch {
    return false;
  }
}

export function checkRealMode(input: RealModeInput): string[] {
  if (input.methodology.mode !== "real") return [];

  const errors: string[] = [];

  for (const s of input.scores) {
    if (isExampleInvalid(s.source_url)) {
      errors.push(`real mode: score ${scoreRef(s)} has example.invalid source_url (dummy URL not allowed in real mode)`);
    }
  }
  for (const e of input.events) {
    if (isExampleInvalid(e.source_url)) {
      errors.push(`real mode: event ${e.id} has example.invalid source_url (dummy URL not allowed in real mode)`);
    }
  }

  const receiptByRef = new Map<string, Receipt>();
  for (const r of input.receipts) {
    const existing = receiptByRef.get(r.score_ref);
    if (!existing || r.fetched_at > existing.fetched_at) {
      receiptByRef.set(r.score_ref, r);
    }
  }

  for (const s of input.scores) {
    const ref = scoreRef(s);
    const r = receiptByRef.get(ref);
    if (!r) {
      errors.push(`real mode: score ${ref} missing evidence receipt (expected score_ref="${ref}" in any evidence/**/${s.country}-${s.indicator_id}-*.json)`);
      continue;
    }
    if (r.source_url !== s.source_url) {
      errors.push(`real mode: receipt for ${ref} has source_url ${r.source_url} but score has ${s.source_url} — receipt is stale or refers to wrong source`);
    }
  }

  for (const e of input.events) {
    const ref = eventRef(e);
    const r = receiptByRef.get(ref);
    if (!r) {
      errors.push(`real mode: event ${e.id} missing evidence receipt (expected score_ref="${ref}" in any evidence/**/event-${e.id}.json)`);
      continue;
    }
    if (r.source_url !== e.source_url) {
      errors.push(`real mode: receipt for event ${e.id} has source_url ${r.source_url} but event has ${e.source_url}`);
    }
  }

  return errors;
}
