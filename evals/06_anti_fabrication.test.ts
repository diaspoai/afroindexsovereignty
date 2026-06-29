import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCountries, loadMethodology, loadScoresFor, REPO_ROOT } from "../scripts/lib/io.ts";
import { loadReceipts } from "../scripts/lib/receipts.ts";
import { verifyReceiptAgainstFresh } from "../scripts/lib/anti-fabrication-verify.ts";
import { freshFetch, waybackProbe } from "../scripts/lib/fetcher.ts";

/**
 * Anti-fabrication / trajectory eval.
 *
 * The project's credibility line.
 *
 * Dummy mode (methodology.mode === "dummy"):
 *   - example.invalid URLs are whitelisted; no network calls.
 *   - We only verify the harness is wired and receipt files (if present)
 *     parse against the schema.
 *
 * Real mode (methodology.mode === "real"):
 *   - Every receipt under evidence/**\/*.json is verified by re-fetching
 *     its source_url and probing its wayback_url.
 *   - Fresh sha256 must match the receipt's content_sha256 (catches both
 *     source-drift AND fabricated receipts — a faked receipt would point
 *     to a URL whose actual content hashes differently).
 *   - Wayback snapshot must resolve (2xx/3xx).
 *
 * Escape hatch for offline local dev:
 *   IAFS_SKIP_NETWORK_EVALS=1 skips the network-bound checks in real mode
 *   with a logged warning. CI never sets this; CI always runs the network
 *   verification when in real mode.
 */
describe("eval 06: anti-fabrication", () => {
  const methodology = loadMethodology();

  it("evidence/ directory exists (harness wired)", () => {
    expect(existsSync(join(REPO_ROOT, "evidence")), "evidence/ directory must exist — anti-fabrication harness").toBe(true);
  });

  it("receipt schema is well-formed for any receipts present", () => {
    const root = join(REPO_ROOT, "evidence");
    if (!existsSync(root)) return;
    const shas = readdirSync(root).filter((f) => !f.startsWith("."));
    for (const sha of shas) {
      const dir = join(root, sha);
      const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
      for (const f of files) {
        const r = JSON.parse(readFileSync(join(dir, f), "utf-8"));
        for (const k of ["score_ref","source_url","fetched_at","http_status","content_sha256","wayback_url"]) {
          expect(r[k], `${sha}/${f} missing ${k}`).toBeDefined();
        }
      }
    }
  });

  it("dummy-mode: every score's source_url is on example.invalid (no fabrication possible)", () => {
    if (methodology.mode !== "dummy") return;
    for (const country of loadCountries()) {
      for (const s of loadScoresFor(country.iso3)) {
        const host = new URL(s.source_url).host;
        expect(host.endsWith("example.invalid"), `${country.iso3} ${s.indicator_id}: dummy mode requires example.invalid, got ${host}`).toBe(true);
      }
    }
  });

  it("real-mode: re-fetches every receipt's source + probes wayback snapshot", async () => {
    if (methodology.mode !== "real") return;

    const skip = process.env.IAFS_SKIP_NETWORK_EVALS === "1";
    if (skip) {
      // Offline local-dev escape hatch. CI never sets this.
      // eslint-disable-next-line no-console
      console.warn("eval 06: IAFS_SKIP_NETWORK_EVALS=1 — skipping network verification (CI does not honor this).");
      return;
    }

    const receipts = loadReceipts().map((r) => r.receipt);
    expect(receipts.length, "real mode requires at least one receipt").toBeGreaterThan(0);

    const allErrors: string[] = [];
    // Run each receipt's fresh-fetch + wayback-probe in parallel,
    // collect verification errors.
    const verifications = await Promise.all(
      receipts.map(async (receipt) => {
        const [fresh_fetch, wayback_probe] = await Promise.all([
          freshFetch(receipt.source_url),
          waybackProbe(receipt.wayback_url),
        ]);
        return verifyReceiptAgainstFresh({ receipt, fresh_fetch, wayback_probe });
      }),
    );
    for (const errs of verifications) allErrors.push(...errs);

    expect(allErrors, `anti-fabrication: ${allErrors.length} drift/missing-snapshot error(s):\n  · ${allErrors.join("\n  · ")}`).toEqual([]);
  }, 5 * 60 * 1000); // up to 5 min for fetching many sources in CI
});
