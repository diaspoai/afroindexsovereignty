import { describe, it, expect } from "vitest";
import { probeWaybackStable, type ProbeFetchResult } from "./wayback-stability.ts";

/**
 * Mock fetch that returns a scripted sequence of results.
 * Also captures the URL for each call.
 */
function scriptedFetch(results: ProbeFetchResult[]): {
  fetchFn: (url: string) => Promise<ProbeFetchResult>;
  calls: string[];
} {
  const calls: string[] = [];
  let i = 0;
  return {
    calls,
    fetchFn: async (url) => {
      calls.push(url);
      const r = results[i++];
      if (!r) throw new Error(`scriptedFetch exhausted after ${calls.length} calls`);
      return r;
    },
  };
}

const noSleep = async (_ms: number) => {};

describe("probeWaybackStable", () => {
  it("stable=true when all N probes return the same sha256", async () => {
    const { fetchFn, calls } = scriptedFetch([
      { http_status: 200, content_sha256: "abc123" },
      { http_status: 200, content_sha256: "abc123" },
      { http_status: 200, content_sha256: "abc123" },
    ]);
    const result = await probeWaybackStable("https://web.archive.org/x", {
      probes: 3, delayMs: 0, fetchFn, sleep: noSleep,
    });
    expect(result.stable).toBe(true);
    expect(result.uniqueHashes).toEqual(["abc123"]);
    expect(result.contentSha256).toBe("abc123");
    expect(result.httpStatus).toBe(200);
    expect(result.fetchError).toBeUndefined();
    expect(calls).toHaveLength(3);
  });

  it("stable=false when two probes disagree", async () => {
    const { fetchFn } = scriptedFetch([
      { http_status: 200, content_sha256: "aaa" },
      { http_status: 200, content_sha256: "bbb" },
      { http_status: 200, content_sha256: "aaa" },
    ]);
    const result = await probeWaybackStable("https://web.archive.org/x", {
      probes: 3, delayMs: 0, fetchFn, sleep: noSleep,
    });
    expect(result.stable).toBe(false);
    expect(result.uniqueHashes.sort()).toEqual(["aaa", "bbb"]);
    expect(result.fetchError).toBeUndefined();
  });

  it("stable=false with fetchError when a probe errors", async () => {
    const { fetchFn } = scriptedFetch([
      { http_status: 200, content_sha256: "abc" },
      { http_status: 0, content_sha256: "", fetch_error: "This operation was aborted" },
    ]);
    const result = await probeWaybackStable("https://web.archive.org/x", {
      probes: 3, delayMs: 0, fetchFn, sleep: noSleep,
    });
    expect(result.stable).toBe(false);
    expect(result.fetchError).toContain("probe 2/3");
    expect(result.fetchError).toContain("This operation was aborted");
  });

  it("stable=false when a probe returns HTTP 5xx", async () => {
    const { fetchFn } = scriptedFetch([
      { http_status: 503, content_sha256: "" },
    ]);
    const result = await probeWaybackStable("https://web.archive.org/x", {
      probes: 3, delayMs: 0, fetchFn, sleep: noSleep,
    });
    expect(result.stable).toBe(false);
    expect(result.fetchError).toContain("HTTP 503");
  });

  it("N=1 is allowed (probe disabled) — single fetch, always stable", async () => {
    const { fetchFn, calls } = scriptedFetch([
      { http_status: 200, content_sha256: "abc" },
    ]);
    const result = await probeWaybackStable("https://web.archive.org/x", {
      probes: 1, delayMs: 0, fetchFn, sleep: noSleep,
    });
    expect(result.stable).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it("sleeps between probes but not before first or after last", async () => {
    const { fetchFn } = scriptedFetch([
      { http_status: 200, content_sha256: "abc" },
      { http_status: 200, content_sha256: "abc" },
      { http_status: 200, content_sha256: "abc" },
    ]);
    const sleeps: number[] = [];
    await probeWaybackStable("https://web.archive.org/x", {
      probes: 3,
      delayMs: 500,
      fetchFn,
      sleep: async (ms) => { sleeps.push(ms); },
    });
    expect(sleeps).toEqual([500, 500]);  // 2 sleeps between 3 probes
  });

  it("stops fetching on first error — no wasted probes", async () => {
    const { fetchFn, calls } = scriptedFetch([
      { http_status: 200, content_sha256: "abc" },
      { http_status: 503, content_sha256: "" },
      { http_status: 200, content_sha256: "abc" },
    ]);
    const result = await probeWaybackStable("https://web.archive.org/x", {
      probes: 3, delayMs: 0, fetchFn, sleep: noSleep,
    });
    expect(result.stable).toBe(false);
    expect(calls).toHaveLength(2);
  });

  it("onProbe callback fires per attempt", async () => {
    const { fetchFn } = scriptedFetch([
      { http_status: 200, content_sha256: "abc" },
      { http_status: 200, content_sha256: "abc" },
    ]);
    const seen: Array<[number, number, string]> = [];
    await probeWaybackStable("https://web.archive.org/x", {
      probes: 2,
      delayMs: 0,
      fetchFn,
      sleep: noSleep,
      onProbe: (i, n, r) => seen.push([i, n, r.content_sha256]),
    });
    expect(seen).toEqual([[1, 2, "abc"], [2, 2, "abc"]]);
  });
});
