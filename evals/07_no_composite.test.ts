import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, loadAxisScoresFor, loadCountries } from "../scripts/lib/io.ts";
import { FORBIDDEN_COMPOSITE_TOKENS } from "../scripts/lib/types.ts";

/**
 * No-composite invariant.
 *
 * Three layers:
 *   (a) Source-code grep: forbidden tokens must not appear in scripts/, src/,
 *       evals/, or schemas/ (this file's literal denylist is excluded).
 *   (b) Schema-level: no record schema may contain a composite-score field.
 *       Verified by absence of forbidden tokens in schemas/*.
 *   (c) Runtime/data: no AxisScore or score record may contain a fused metric.
 *       (Already enforced by additionalProperties:false; this is defense in depth.)
 */
describe("eval 07: no-composite invariant", () => {
  const denylist = FORBIDDEN_COMPOSITE_TOKENS as readonly string[];

  it("forbidden composite tokens do not appear in scripts/, src/, evals/, schemas/", () => {
    const roots = ["scripts", "src", "evals", "schemas"];
    const exts = new Set([".ts", ".tsx", ".astro", ".mjs", ".js", ".json"]);
    const offenders: string[] = [];
    for (const r of roots) {
      const root = join(REPO_ROOT, r);
      if (!existsSync(root)) continue;
      walk(root, (file) => {
        const ext = file.substring(file.lastIndexOf("."));
        if (!exts.has(ext)) return;
        if (file.endsWith("types.ts") && file.includes("scripts/lib/")) return; // denylist itself
        if (file.endsWith("forbid-composite.sh")) return;
        if (file.includes("/07_no_composite.test.ts")) return;
        const txt = readFileSync(file, "utf-8");
        for (const tok of denylist) {
          if (txt.includes(tok)) {
            offenders.push(`${file}: ${tok}`);
          }
        }
        if (/axis_a\s*[\+\-\*\/]\s*axis_b/i.test(txt) || /axisA\s*[\+\-\*\/]\s*axisB/i.test(txt)) {
          offenders.push(`${file}: arithmetic between axisA and axisB detected`);
        }
      });
    }
    expect(offenders, `forbidden composite tokens found:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("axis_scores never carry a fused-axis field", () => {
    for (const country of loadCountries()) {
      for (const a of loadAxisScoresFor(country.iso3)) {
        for (const tok of denylist) {
          expect((a as Record<string, unknown>)[tok], `${country.iso3} year ${a.year}: ${tok} must not be present`).toBeUndefined();
        }
      }
    }
  });
});

function walk(dir: string, fn: (path: string) => void) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git" || entry === "dist" || entry === ".astro") continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, fn);
    else fn(p);
  }
}

void execSync;
