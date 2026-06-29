import { describe, it, expect } from "vitest";
import { verifyReceiptAgainstFresh, type FetchedSource, type WaybackProbe } from "./anti-fabrication-verify.ts";
import type { Receipt } from "./realmode-guard.ts";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function receipt(over: Partial<Receipt> = {}): Receipt {
  return {
    score_ref: "BFA/A2/2024",
    source_url: "https://comtrade.un.org/x",
    fetched_at: "2026-06-28T00:00:00Z",
    http_status: 200,
    content_sha256: HASH_A,
    wayback_url: "https://web.archive.org/web/2026/https://comtrade.un.org/x",
    ...over,
  };
}
function fresh(over: Partial<FetchedSource> = {}): FetchedSource {
  return {
    source_url: "https://comtrade.un.org/x",
    http_status: 200,
    content_sha256: HASH_A,
    ...over,
  };
}
function wayback(over: Partial<WaybackProbe> = {}): WaybackProbe {
  return {
    wayback_url: "https://web.archive.org/web/2026/https://comtrade.un.org/x",
    http_status: 200,
    ...over,
  };
}

describe("verifyReceiptAgainstFresh", () => {
  it("returns [] when everything matches", () => {
    expect(verifyReceiptAgainstFresh({
      receipt: receipt(), fresh_fetch: fresh(), wayback_probe: wayback(),
    })).toEqual([]);
  });

  it("flags content_sha256 drift (source changed since receipt)", () => {
    const errs = verifyReceiptAgainstFresh({
      receipt: receipt({ content_sha256: HASH_A }),
      fresh_fetch: fresh({ content_sha256: HASH_B }),
      wayback_probe: wayback(),
    });
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain("content_sha256 drift");
    expect(errs[0]).toContain("BFA/A2/2024");
  });

  it("flags failed source fetch", () => {
    const errs = verifyReceiptAgainstFresh({
      receipt: receipt(),
      fresh_fetch: fresh({ http_status: 0, content_sha256: "", fetch_error: "ENOTFOUND" }),
      wayback_probe: wayback(),
    });
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain("source re-fetch failed");
    expect(errs[0]).toContain("ENOTFOUND");
  });

  it("flags non-2xx source status", () => {
    const errs = verifyReceiptAgainstFresh({
      receipt: receipt(),
      fresh_fetch: fresh({ http_status: 404, content_sha256: HASH_A }),
      wayback_probe: wayback(),
    });
    // 404 → status error fires; sha may still match the cached 404 page
    expect(errs.some((e) => e.includes("HTTP 404"))).toBe(true);
  });

  it("flags wayback probe failure", () => {
    const errs = verifyReceiptAgainstFresh({
      receipt: receipt(),
      fresh_fetch: fresh(),
      wayback_probe: wayback({ http_status: 0, probe_error: "timeout" }),
    });
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain("wayback probe failed");
  });

  it("flags wayback non-2xx", () => {
    const errs = verifyReceiptAgainstFresh({
      receipt: receipt(),
      fresh_fetch: fresh(),
      wayback_probe: wayback({ http_status: 404 }),
    });
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain("wayback_url returned HTTP 404");
  });

  it("aggregates multiple errors in one pass", () => {
    const errs = verifyReceiptAgainstFresh({
      receipt: receipt({ content_sha256: HASH_A }),
      fresh_fetch: fresh({ http_status: 500, content_sha256: HASH_B }),
      wayback_probe: wayback({ http_status: 404 }),
    });
    // 3 errors: source HTTP 500, sha drift, wayback 404
    expect(errs.length).toBe(3);
  });

  it("accepts wayback 3xx as success (HEAD-then-redirect path)", () => {
    const errs = verifyReceiptAgainstFresh({
      receipt: receipt(),
      fresh_fetch: fresh(),
      wayback_probe: wayback({ http_status: 301 }),
    });
    expect(errs).toEqual([]);
  });

  it("works for event receipts (score_ref event/<id>)", () => {
    const errs = verifyReceiptAgainstFresh({
      receipt: receipt({ score_ref: "event/bfa-severance-2026" }),
      fresh_fetch: fresh({ content_sha256: HASH_B }),
      wayback_probe: wayback(),
    });
    expect(errs[0]).toContain("event/bfa-severance-2026");
  });
});
