import { describe, it, expect } from "vitest";
import { checkRealMode, scoreRef, eventRef, type Receipt, type RealModeInput } from "./realmode-guard.ts";
import type { Score, IafsEvent } from "./types.ts";

function annualScore(country: string, indicator: string, year: number, url: string): Score {
  return {
    kind: "annual", country, indicator_id: indicator as never, axis: "A",
    year, raw_value: 50, normalized_score: 50,
    type: "HARD", tag: "FACT",
    source_url: url, source_date: "2024-01-01",
  };
}
function stepScore(country: string, indicator: string, year: number, url: string): Score {
  return {
    kind: "step", country, indicator_id: indicator as never, axis: "A",
    effective_year: year, raw_value: "x", normalized_score: 40,
    type: "HARD", tag: "FACT",
    source_url: url, source_date: "2024-01-01",
  };
}
function event(id: string, url: string): IafsEvent {
  return {
    id, country: "GAB", date: "2024-01-01", axis: "A", indicator_id: "A5",
    title_fr: "x", title_en: "x", description_fr: "x", description_en: "x",
    direction: "+", source_url: url, source_date: "2024-01-01",
  };
}
function receipt(ref: string, url: string, fetched_at = "2026-06-28T00:00:00Z"): Receipt {
  return {
    score_ref: ref, source_url: url, fetched_at,
    http_status: 200,
    content_sha256: "a".repeat(64),
    wayback_url: "https://web.archive.org/web/2026/" + url,
  };
}

describe("checkRealMode", () => {
  it("returns [] when mode is dummy regardless of receipts", () => {
    const input: RealModeInput = {
      methodology: { mode: "dummy" },
      scores: [annualScore("GAB", "A2", 2024, "https://example.invalid/x")],
      events: [],
      receipts: [],
    };
    expect(checkRealMode(input)).toEqual([]);
  });

  it("real mode: rejects example.invalid URLs on scores", () => {
    const errs = checkRealMode({
      methodology: { mode: "real" },
      scores: [annualScore("GAB", "A2", 2024, "https://example.invalid/dummy")],
      events: [],
      receipts: [],
    });
    expect(errs.some((e) => e.includes("example.invalid"))).toBe(true);
  });

  it("real mode: rejects example.invalid URLs on events", () => {
    const errs = checkRealMode({
      methodology: { mode: "real" },
      scores: [],
      events: [event("e1", "https://example.invalid/dummy")],
      receipts: [],
    });
    expect(errs.some((e) => e.includes("event e1") && e.includes("example.invalid"))).toBe(true);
  });

  it("real mode: every score requires a receipt with score_ref ISO3/IND/YEAR", () => {
    const s = annualScore("BFA", "A2", 2024, "https://comtrade.un.org/x");
    const errs = checkRealMode({
      methodology: { mode: "real" },
      scores: [s], events: [], receipts: [],
    });
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain("BFA/A2/2024 missing evidence receipt");
  });

  it("real mode: receipt source_url must match the score's source_url", () => {
    const s = annualScore("BFA", "A2", 2024, "https://comtrade.un.org/correct");
    const r = receipt("BFA/A2/2024", "https://comtrade.un.org/STALE-URL");
    const errs = checkRealMode({
      methodology: { mode: "real" },
      scores: [s], events: [], receipts: [r],
    });
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain("stale");
  });

  it("real mode: a matching receipt clears the score", () => {
    const url = "https://comtrade.un.org/x";
    const s = annualScore("BFA", "A2", 2024, url);
    const r = receipt("BFA/A2/2024", url);
    expect(checkRealMode({
      methodology: { mode: "real" }, scores: [s], events: [], receipts: [r],
    })).toEqual([]);
  });

  it("real mode: events require receipts with score_ref event/<id>", () => {
    const url = "https://gov.bf/announce";
    const e = event("bfa-severance-2026", url);
    const errs = checkRealMode({
      methodology: { mode: "real" }, scores: [], events: [e], receipts: [],
    });
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain("event bfa-severance-2026 missing evidence receipt");
    expect(errs[0]).toContain("score_ref=\"event/bfa-severance-2026\"");
  });

  it("real mode: a matching event receipt clears it", () => {
    const url = "https://gov.bf/announce";
    const e = event("bfa-severance-2026", url);
    const r = receipt("event/bfa-severance-2026", url);
    expect(checkRealMode({
      methodology: { mode: "real" }, scores: [], events: [e], receipts: [r],
    })).toEqual([]);
  });

  it("step scores: score_ref uses effective_year", () => {
    const s = stepScore("BFA", "A1", 2020, "https://treaty.example/x");
    expect(scoreRef(s)).toBe("BFA/A1/2020");
  });

  it("eventRef formats event/<id>", () => {
    expect(eventRef({ id: "x-y-z" })).toBe("event/x-y-z");
  });

  it("real mode: multiple receipts for same ref — newest fetched_at wins", () => {
    const url = "https://comtrade.un.org/x";
    const s = annualScore("BFA", "A2", 2024, url);
    const stale = receipt("BFA/A2/2024", "https://comtrade.un.org/OLD", "2025-01-01T00:00:00Z");
    const fresh = receipt("BFA/A2/2024", url, "2026-06-28T00:00:00Z");
    expect(checkRealMode({
      methodology: { mode: "real" }, scores: [s], events: [], receipts: [stale, fresh],
    })).toEqual([]);
  });

  it("real mode: composite failure — surfaces all errors at once", () => {
    // Expected errors (5):
    //   1. GAB/A2/2024 has example.invalid URL
    //   2. event e1 has example.invalid URL
    //   3. GAB/A2/2024 missing receipt
    //   4. BFA/A2/2024 missing receipt
    //   5. event e1 missing receipt
    // (Same URL triggers both checks intentionally — both are independently true.)
    const errs = checkRealMode({
      methodology: { mode: "real" },
      scores: [
        annualScore("GAB", "A2", 2024, "https://example.invalid/x"),
        annualScore("BFA", "A2", 2024, "https://comtrade.un.org/y"),
      ],
      events: [event("e1", "https://example.invalid/e")],
      receipts: [],
    });
    expect(errs.length).toBe(5);
  });
});
