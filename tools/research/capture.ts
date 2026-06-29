/**
 * tools/research/capture.ts
 *
 * For one (score_ref, source_url) pair:
 *   1. Re-fetch the source via scripts/lib/fetcher.freshFetch
 *   2. Submit the URL to Wayback (POST https://web.archive.org/save/<url>)
 *   3. If submit fails, fall back to the latest existing Wayback snapshot
 *   4. Write evidence/<sha>/<ISO3>-<indicator>-<year>.json (or event-<id>.json)
 *
 * The receipt is what eval 06 (real mode) re-verifies. Without this tool,
 * a researcher has to hand-build receipts and remember the exact format —
 * error-prone. This is the canonical path.
 *
 * Usage:
 *   npm run research:capture -- \
 *     --score-ref BFA/A2/2024 \
 *     --url https://comtrade.un.org/...
 *
 * Optional:
 *   --sha-dir <sha>      override git HEAD short-sha
 *   --excerpt "<text>"   verbatim source excerpt supporting the raw_value
 *   --dry-run            print what would be written, don't write
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { freshFetch } from "../../scripts/lib/fetcher.ts";
import { REPO_ROOT } from "../../scripts/lib/io.ts";
import { parseArgs, gitShortSha, die, ok } from "./lib/cli.ts";

interface Args {
  "score-ref": string;
  url: string;
  "sha-dir"?: string;
  excerpt?: string;
  "dry-run"?: boolean;
}

const args = parseArgs<Args>({
  usage: "Usage: npm run research:capture -- --score-ref <ref> --url <url> [--excerpt <text>] [--sha-dir <sha>] [--dry-run]",
  schema: {
    "score-ref": { type: "string", required: true },
    "url":       { type: "string", required: true },
    "sha-dir":   { type: "string" },
    "excerpt":   { type: "string" },
    "dry-run":   { type: "boolean" },
  },
});

// score_ref pattern: ISO3/IND/YEAR OR event/<slug>
const SCORE_RE = /^([A-Z]{3})\/([AB][1-6])\/(\d{4})$/;
const EVENT_RE = /^event\/([a-z0-9][a-z0-9\-]{1,80})$/;

let filename: string;
const m1 = args["score-ref"].match(SCORE_RE);
const m2 = args["score-ref"].match(EVENT_RE);
if (m1) {
  filename = `${m1[1]}-${m1[2]}-${m1[3]}.json`;
} else if (m2) {
  filename = `event-${m2[1]}.json`;
} else {
  die(`--score-ref must match "<ISO3>/<IND>/<YEAR>" or "event/<id>", got "${args["score-ref"]}"`);
}

const sha = args["sha-dir"] ?? gitShortSha();
const dir = join(REPO_ROOT, "evidence", sha);
const outPath = join(dir, filename);

ok(`capture: fetching ${args.url}`);
const fresh = await freshFetch(args.url);
if (fresh.fetch_error || fresh.http_status < 200 || fresh.http_status >= 400) {
  die(`source re-fetch failed (status ${fresh.http_status}): ${fresh.fetch_error ?? "non-2xx"}`);
}
ok(`capture: HTTP ${fresh.http_status} · sha256 ${fresh.content_sha256.slice(0, 12)}…`);

const waybackUrl = await submitWayback(args.url);
ok(`capture: wayback ${waybackUrl}`);

const receipt = {
  score_ref: args["score-ref"],
  source_url: args.url,
  fetched_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  http_status: fresh.http_status,
  content_sha256: fresh.content_sha256,
  ...(args.excerpt ? { content_excerpt: args.excerpt } : {}),
  wayback_url: waybackUrl,
};

if (args["dry-run"]) {
  ok("\n--dry-run — would write:");
  ok(`  path: ${outPath.replace(REPO_ROOT + "/", "")}`);
  ok(`  body:\n${JSON.stringify(receipt, null, 2)}`);
  process.exit(0);
}

if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
if (existsSync(outPath)) {
  die(`receipt already exists at ${outPath.replace(REPO_ROOT + "/", "")}; re-fetch with a different --sha-dir if intentional`);
}
writeFileSync(outPath, JSON.stringify(receipt, null, 2) + "\n", "utf-8");
ok(`\ncapture: wrote ${outPath.replace(REPO_ROOT + "/", "")}`);

/**
 * Try to save a new snapshot. On failure (rate limit, blocked, etc.),
 * fall back to the most recent existing Wayback snapshot. If no snapshot
 * exists at all, FAIL — the researcher must intervene (manually submit
 * via web.archive.org/save/<url> in a browser).
 */
async function submitWayback(url: string): Promise<string> {
  const saveUrl = `https://web.archive.org/save/${url}`;
  try {
    const res = await fetch(saveUrl, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "IAFS-research/1.0 (+https://github.com/diaspoai/afroindexsovereignty)" },
    });
    // Wayback redirects (302) to the snapshot URL on success.
    const loc = res.headers.get("location");
    if (res.status >= 200 && res.status < 400 && loc) {
      return loc.startsWith("http") ? loc : `https://web.archive.org${loc}`;
    }
    // Some Wayback variants return a JSON body with the snapshot URL.
    if (res.headers.get("content-link")) {
      return new URL(res.headers.get("content-link")!.split(";")[0]!.replace(/[<>]/g, "")).toString();
    }
  } catch (err) {
    console.warn(`capture: wayback save failed — ${(err as Error).message}; falling back to latest existing snapshot`);
  }

  // Fallback: query for the most recent existing snapshot
  try {
    const availUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const res = await fetch(availUrl);
    const body = await res.json() as { archived_snapshots?: { closest?: { available: boolean; url: string } } };
    const closest = body.archived_snapshots?.closest;
    if (closest?.available && closest.url) return closest.url;
  } catch (err) {
    die(`wayback fallback also failed — ${(err as Error).message}. Submit the URL manually at web.archive.org/save/<url> then re-run with --wayback-url <snapshot>.`);
  }
  die("no Wayback snapshot exists for this URL. Submit it manually at web.archive.org/save/<url> first.");
}
