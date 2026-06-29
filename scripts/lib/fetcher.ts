/**
 * Network I/O for the anti-fabrication eval.
 *
 * Two narrow primitives:
 *   - freshFetch(url): re-fetch a source URL and compute sha256 of the body
 *   - waybackProbe(url): HEAD-probe a Wayback snapshot URL
 *
 * Both wrap node:fetch with a timeout and never throw — they always
 * resolve to a structured result (success or error) so the caller can
 * verify/aggregate without try/catch chains.
 */
import { createHash } from "node:crypto";
import type { FetchedSource, WaybackProbe } from "./anti-fabrication-verify.ts";

const DEFAULT_TIMEOUT_MS = 15_000;

export async function freshFetch(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<FetchedSource> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Some sources (UN Comtrade, Worldbank etc.) return different bodies
        // to default UA strings; identify as the project, ask for the page form.
        "user-agent": "IAFS-anti-fabrication-eval/1.0 (+https://github.com/diaspoai/afroindexsovereignty)",
        accept: "*/*",
      },
    });
    const body = new Uint8Array(await res.arrayBuffer());
    const hash = createHash("sha256").update(body).digest("hex");
    return { source_url: url, http_status: res.status, content_sha256: hash };
  } catch (err) {
    return {
      source_url: url,
      http_status: 0,
      content_sha256: "",
      fetch_error: (err as Error).message,
    };
  } finally {
    clearTimeout(t);
  }
}

export async function waybackProbe(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<WaybackProbe> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // HEAD first (fast); some Wayback responses only support GET, fall back.
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    }
    return { wayback_url: url, http_status: res.status };
  } catch (err) {
    return { wayback_url: url, http_status: 0, probe_error: (err as Error).message };
  } finally {
    clearTimeout(t);
  }
}
