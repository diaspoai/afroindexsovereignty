/**
 * Pure receipt verification.
 *
 * Given a Receipt (what was recorded at fetch time) and the freshly
 * re-fetched source + a probe of the wayback snapshot, return [] if
 * everything verifies or string[] of errors if anything drifted.
 *
 * Pure function: takes synthesized data, returns errors. The actual
 * fetch lives in scripts/lib/fetcher.ts and is wired together in
 * evals/06_anti_fabrication.test.ts. This split makes the verifier
 * unit-testable without network mocking.
 */
import type { Receipt } from "./realmode-guard.ts";

export interface FetchedSource {
  source_url: string;
  http_status: number;            // 0 if request failed before status was read
  content_sha256: string;         // empty string if fetch failed
  fetch_error?: string;
}

export interface WaybackProbe {
  wayback_url: string;
  http_status: number;            // 0 if request failed
  probe_error?: string;
}

export interface VerifyInput {
  receipt: Receipt;
  fresh_fetch: FetchedSource;
  wayback_probe: WaybackProbe;
}

export function verifyReceiptAgainstFresh(input: VerifyInput): string[] {
  const { receipt, fresh_fetch, wayback_probe } = input;
  const errors: string[] = [];
  const ref = receipt.score_ref;

  // ── Source side ─────────────────────────────────────────────────
  if (fresh_fetch.fetch_error) {
    errors.push(`receipt ${ref}: source re-fetch failed — ${fresh_fetch.fetch_error}`);
  } else {
    if (fresh_fetch.http_status < 200 || fresh_fetch.http_status >= 300) {
      errors.push(`receipt ${ref}: source returned HTTP ${fresh_fetch.http_status} (was ${receipt.http_status} at receipt time)`);
    }
    if (fresh_fetch.content_sha256 && fresh_fetch.content_sha256 !== receipt.content_sha256) {
      errors.push(
        `receipt ${ref}: content_sha256 drift — source changed since receipt was written. ` +
        `Receipt: ${receipt.content_sha256.slice(0, 12)}… Fresh: ${fresh_fetch.content_sha256.slice(0, 12)}…`
      );
    }
  }

  // ── Wayback side ────────────────────────────────────────────────
  if (wayback_probe.probe_error) {
    errors.push(`receipt ${ref}: wayback probe failed — ${wayback_probe.probe_error}`);
  } else if (wayback_probe.http_status < 200 || wayback_probe.http_status >= 400) {
    errors.push(`receipt ${ref}: wayback_url returned HTTP ${wayback_probe.http_status} (snapshot unreachable)`);
  }

  return errors;
}
