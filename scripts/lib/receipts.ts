import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./io.ts";
import type { Receipt } from "./realmode-guard.ts";

/**
 * Discover every receipt under evidence/**\/*.json.
 * Skips dotfiles (e.g. .gitkeep, .cache/).
 *
 * The function returns one Receipt per file. Schema validity is enforced
 * separately by ajv against schemas/receipt.schema.json (in validate.ts).
 */
export function loadReceipts(rootDir?: string): { path: string; receipt: Receipt }[] {
  const root = rootDir ?? join(REPO_ROOT, "evidence");
  if (!existsSync(root)) return [];
  const out: { path: string; receipt: Receipt }[] = [];
  walk(root, (p) => {
    if (!p.endsWith(".json")) return;
    try {
      const raw = readFileSync(p, "utf-8");
      const receipt = JSON.parse(raw) as Receipt;
      out.push({ path: p, receipt });
    } catch {
      // schema validator will report this; don't crash here
    }
  });
  return out;
}

function walk(dir: string, fn: (p: string) => void): void {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, fn);
    else fn(p);
  }
}
