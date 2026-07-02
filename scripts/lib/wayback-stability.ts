/**
 * Poka-yoke for the anti-fabrication receipt pipeline.
 *
 * Fetches a Wayback URL N times with a delay between attempts and reports
 * whether every fetch returned the same content_sha256. If any two disagree,
 * or any single fetch errors, the URL is not stable enough to write a
 * real-mode receipt against — the caller (tools/research/capture.ts) refuses
 * to persist the receipt, forcing the researcher to pick a more stable
 * source or wait for the Wayback snapshot to settle.
 *
 * Why this exists: eval 06 re-fetches wayback URLs on every CI run. If the
 * archived page's bytes vary across fetches — banner variants, session IDs,
 * edge-server names, mid-archival snapshots — the receipt sha256 will drift
 * and CI will fail. Catching instability at receipt-write time makes an
 * unstable receipt structurally impossible.
 *
 * Pure — no process.exit / no I/O other than the injected fetch + sleep,
 * so callers can unit-test the probe deterministically.
 */

export interface ProbeFetchResult {
  http_status: number;
  content_sha256: string;
  fetch_error?: string;
}

export interface StabilityProbeResult {
  stable: boolean;
  uniqueHashes: string[];
  httpStatus: number;
  contentSha256: string;
  fetchError?: string;   // set if any probe fetch failed; stable is false
}

export interface StabilityProbeOptions {
  probes: number;
  delayMs: number;
  fetchFn: (url: string) => Promise<ProbeFetchResult>;
  sleep?: (ms: number) => Promise<void>;
  onProbe?: (attempt: number, total: number, result: ProbeFetchResult) => void;
}

export async function probeWaybackStable(
  waybackUrl: string,
  opts: StabilityProbeOptions,
): Promise<StabilityProbeResult> {
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const hashes: string[] = [];
  let lastStatus = 0;
  for (let i = 0; i < opts.probes; i++) {
    const snap = await opts.fetchFn(waybackUrl);
    opts.onProbe?.(i + 1, opts.probes, snap);
    if (snap.fetch_error || snap.http_status < 200 || snap.http_status >= 400) {
      return {
        stable: false,
        uniqueHashes: [],
        httpStatus: snap.http_status,
        contentSha256: "",
        fetchError: `probe ${i + 1}/${opts.probes}: ${snap.fetch_error ?? `HTTP ${snap.http_status}`}`,
      };
    }
    hashes.push(snap.content_sha256);
    lastStatus = snap.http_status;
    if (i < opts.probes - 1 && opts.delayMs > 0) {
      await sleep(opts.delayMs);
    }
  }
  const uniqueHashes = Array.from(new Set(hashes));
  return {
    stable: uniqueHashes.length === 1,
    uniqueHashes,
    httpStatus: lastStatus,
    contentSha256: hashes[0]!,
  };
}
