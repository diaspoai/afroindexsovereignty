import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCountries, loadMethodology, loadScoresFor, REPO_ROOT } from "../scripts/lib/io.ts";

/**
 * Anti-fabrication / trajectory eval.
 *
 * Mechanism (per IAFS_SDLC_v0.1.md §4 + the schema proposal):
 *   For every score in a PR, the source-verification skill writes an evidence
 *   receipt under evidence/<SHA>/<ISO3>-<indicator>-<year>.json containing:
 *     { score_ref, source_url, fetched_at, http_status, content_sha256,
 *       content_excerpt, wayback_url }
 *   CI then re-fetches the source and asserts the hash + Wayback URL match.
 *
 * Dummy mode behavior:
 *   In methodology.mode === "dummy", no live fetch is performed. The eval
 *   instead asserts the receipt directory STRUCTURE the real-mode CI will
 *   require — i.e., the system is wired and ready, but receipt content is not
 *   enforced for dummy URLs (since example.invalid does not resolve).
 *
 * Real mode (future): enforce receipt presence + matching content_sha256
 *   against a fresh fetch + Wayback URL resolution.
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

  it("real-mode receipt enforcement is unreachable in dummy mode (placeholder until first real country lands)", () => {
    if (methodology.mode !== "real") return;
    expect.fail("Real-mode receipt enforcement must be implemented before flipping methodology.mode='real'");
  });
});
