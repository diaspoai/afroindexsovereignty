import { describe, it, expect } from "vitest";
import {
  loadCountries, loadEvents, loadMethodology, loadScoresFor,
} from "../scripts/lib/io.ts";

/**
 * Source-resolution eval.
 *
 * In dummy mode (methodology.mode === "dummy"), URLs under the
 * `example.invalid` host are whitelisted: we verify the URL is a well-formed
 * https:// URL on the dummy host, but we do NOT make a network call.
 *
 * In real mode, every source_url must HEAD/GET 2xx within timeout; the
 * source_date must be a valid ISO date not in the future. The real-mode
 * branch is exercised once real data lands (and the methodology.mode flips).
 */
describe("eval 03: source-resolution", () => {
  const methodology = loadMethodology();
  const today = new Date().toISOString().slice(0, 10);

  function assertDummyUrl(u: string, ctx: string) {
    expect(u.startsWith("https://"), `${ctx}: source_url must be https`).toBe(true);
    const host = new URL(u).host;
    expect(host.endsWith("example.invalid"), `${ctx}: dummy mode requires example.invalid host, got ${host}`).toBe(true);
  }

  function assertDate(d: string, ctx: string) {
    expect(d, `${ctx}: source_date must be ISO date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(d <= today, `${ctx}: source_date ${d} is in the future`).toBe(true);
  }

  it("methodology.mode is set", () => {
    expect(["dummy", "real"]).toContain(methodology.mode);
  });

  it("every score's source is resolvable per mode", () => {
    for (const country of loadCountries()) {
      const scores = loadScoresFor(country.iso3);
      for (const s of scores) {
        const ctx = `${country.iso3} ${s.indicator_id}`;
        if (methodology.mode === "dummy") {
          assertDummyUrl(s.source_url, ctx);
          assertDate(s.source_date, ctx);
        } else {
          // Real-mode network resolution lives here; placeholder until real data lands.
          expect.fail("real-mode source-resolution not yet wired — flip methodology.mode back to dummy or implement live fetcher");
        }
      }
    }
  });

  it("every event's source is resolvable per mode", () => {
    for (const e of loadEvents()) {
      const ctx = `event ${e.id}`;
      if (methodology.mode === "dummy") {
        assertDummyUrl(e.source_url, ctx);
        assertDate(e.source_date, ctx);
      } else {
        expect.fail("real-mode source-resolution not yet wired");
      }
    }
  });
});
