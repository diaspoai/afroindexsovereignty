/**
 * tools/research/init-country.ts
 *
 * Bootstrap a real country end-to-end:
 *   1. Append a Country record to data/countries.json
 *   2. Create empty data/scores/<ISO3>.json
 *   3. Print a per-indicator checklist of what to source next, ordered
 *      by leverage (step-function institutional indicators first — they
 *      carry deep history, easiest to land per A8.4)
 *
 * Usage:
 *   npm run research:init-country -- \
 *     --iso3 BFA --zone UEMOA --currency XOF \
 *     --name-fr "Burkina Faso" --name-en "Burkina Faso" \
 *     [--independence-year 1960] [--footnote-fr "..."] [--footnote-en "..."]
 *     [--dry-run]
 *
 * Refuses to overwrite an existing country.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadCountries, loadIndicators, DATA } from "../../scripts/lib/io.ts";
import { parseArgs, die, ok } from "./lib/cli.ts";
import type { Country } from "../../scripts/lib/types.ts";

interface Args {
  iso3: string;
  zone: string;
  currency: string;
  "name-fr": string;
  "name-en": string;
  "independence-year"?: string;
  "footnote-fr"?: string;
  "footnote-en"?: string;
  "dry-run"?: boolean;
}

const args = parseArgs<Args>({
  usage:
    "Usage: npm run research:init-country -- --iso3 <ISO3> --zone UEMOA|CEMAC " +
    "--currency XOF|XAF --name-fr <FR> --name-en <EN> " +
    "[--independence-year 1960] [--footnote-fr ...] [--footnote-en ...] [--dry-run]",
  schema: {
    "iso3":              { type: "string", required: true },
    "zone":              { type: "string", required: true },
    "currency":          { type: "string", required: true },
    "name-fr":           { type: "string", required: true },
    "name-en":           { type: "string", required: true },
    "independence-year": { type: "string" },
    "footnote-fr":       { type: "string" },
    "footnote-en":       { type: "string" },
    "dry-run":           { type: "boolean" },
  },
});

const VALID_ISO3 = ["BEN","BFA","CIV","MLI","NER","SEN","TGO","CMR","CAF","TCD","COG","GAB"];
if (!VALID_ISO3.includes(args.iso3)) {
  die(`--iso3 must be one of the 12 CFA-zone states: ${VALID_ISO3.join(", ")} (got ${args.iso3})`);
}
if (!["UEMOA", "CEMAC"].includes(args.zone)) die(`--zone must be UEMOA or CEMAC (got ${args.zone})`);
if (!["XOF", "XAF"].includes(args.currency)) die(`--currency must be XOF or XAF (got ${args.currency})`);
if ((args.zone === "UEMOA") !== (args.currency === "XOF")) {
  die(`zone/currency mismatch: UEMOA pairs with XOF, CEMAC pairs with XAF`);
}

const independence = parseInt(args["independence-year"] ?? "1960", 10);
if (!Number.isFinite(independence) || independence < 1900 || independence > 2030) {
  die(`--independence-year must be 1900-2030, got "${args["independence-year"]}"`);
}

const existing = loadCountries();
if (existing.find((c) => c.iso3 === args.iso3)) {
  die(`country ${args.iso3} already exists in data/countries.json — refuse to overwrite`);
}

const country: Country = {
  iso3: args.iso3 as Country["iso3"],
  zone: args.zone as Country["zone"],
  currency: args.currency as Country["currency"],
  name_fr: args["name-fr"],
  name_en: args["name-en"],
  independence_year: independence,
  ...(args["footnote-fr"] ? { independence_footnote_fr: args["footnote-fr"] } : {}),
  ...(args["footnote-en"] ? { independence_footnote_en: args["footnote-en"] } : {}),
};

ok("init-country: composed record:");
ok(JSON.stringify(country, null, 2));

if (args["dry-run"]) {
  ok("\n--dry-run — nothing written.\n");
} else {
  const next = [...existing, country];
  writeFileSync(join(DATA, "countries.json"), JSON.stringify(next, null, 2) + "\n", "utf-8");
  ok(`\ninit-country: wrote data/countries.json (${next.length} countries)`);

  const scoresPath = join(DATA, "scores", `${args.iso3}.json`);
  if (!existsSync(scoresPath)) {
    writeFileSync(scoresPath, "[]\n", "utf-8");
    ok(`init-country: wrote data/scores/${args.iso3}.json (empty)`);
  } else {
    ok(`init-country: data/scores/${args.iso3}.json already exists — left alone`);
  }
}

// Per-indicator sourcing checklist, ordered by leverage
const indicators = loadIndicators();
const stepFirst = [...indicators].sort((a, b) => {
  const ar = a.history_mode === "step_function" ? 0 : 1;
  const br = b.history_mode === "step_function" ? 0 : 1;
  if (ar !== br) return ar - br;
  return a.id.localeCompare(b.id);
});

ok("\n──────── sourcing checklist for " + args.iso3 + " ────────");
ok("Order: step-function (deep history) first, then annual_series.\n");
for (const ind of stepFirst) {
  const minYear = Math.max(independence, ind.earliest_sourced_year);
  const tag = ind.history_mode === "step_function" ? "STEP" : "ANNUAL";
  const w = ind.type === "INTERP" ? "INTERP" : "HARD";
  ok(`  [${tag}] ${ind.id}  ${ind.name_en.padEnd(40)}  ${w}  from ${minYear}  · ${ind.source_class}`);
}

ok("\nNext steps:");
ok(`  1. npm run validate                                  # confirm country accepts`);
ok(`  2. (per indicator) npm run research:add-score -- ...  # build each Score`);
ok(`  3. (per score)     npm run research:capture -- ...    # capture evidence receipt`);
ok(`  4. npm run normalize -- --write && npm run test       # full local gate`);
ok(`  5. git add data evidence && commit + PR`);
ok("\nWhen ready to ship real-mode validation: flip data/methodology.json `mode` to \"real\".");
