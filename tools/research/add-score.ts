/**
 * tools/research/add-score.ts
 *
 * Compose a Score record from CLI args, computing normalized_score from
 * the published anchor (no hand-math), and append it to
 * data/scores/<ISO3>.json. Prints what was added and the next-step
 * commands the researcher should run.
 *
 * Usage:
 *   npm run research:add-score -- \
 *     --country BFA --indicator A2 --year 2024 \
 *     --raw-value 14.5 \
 *     --source-url https://comtrade.un.org/... \
 *     --source-date 2025-06-15 \
 *     [--tag FACT] [--note-fr "..."] [--note-en "..."] [--review-log-id ...] \
 *     [--event-ref ...] [--dry-run]
 *
 * For step indicators (A1, A4, A5, B1) use --year as the effective_year;
 * the tool emits kind=step automatically.
 *
 * The tool refuses to overwrite an existing (country, indicator, year)
 * record — researcher must delete it manually if intentional.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadCountries, loadIndicators, DATA } from "../../scripts/lib/io.ts";
import { normalizeRaw } from "../../scripts/lib/normalize-core.ts";
import type { Indicator, Score, Tag } from "../../scripts/lib/types.ts";
import { parseArgs, die, ok } from "./lib/cli.ts";

interface Args {
  country: string;
  indicator: string;
  year: string;
  "raw-value": string;
  "source-url": string;
  "source-date": string;
  tag?: string;
  "note-fr"?: string;
  "note-en"?: string;
  "review-log-id"?: string;
  "event-ref"?: string;
  "dry-run"?: boolean;
}

const args = parseArgs<Args>({
  usage:
    "Usage: npm run research:add-score -- --country <ISO3> --indicator <A1-B5> --year <YYYY> " +
    "--raw-value <num|string> --source-url <url> --source-date <YYYY-MM-DD> " +
    "[--tag FACT|INTERPRETATION|CONTESTED] [--note-fr ...] [--note-en ...] " +
    "[--review-log-id ...] [--event-ref ...] [--dry-run]",
  schema: {
    "country":       { type: "string", required: true },
    "indicator":     { type: "string", required: true },
    "year":          { type: "string", required: true },
    "raw-value":     { type: "string", required: true },
    "source-url":    { type: "string", required: true },
    "source-date":   { type: "string", required: true },
    "tag":           { type: "string" },
    "note-fr":       { type: "string" },
    "note-en":       { type: "string" },
    "review-log-id": { type: "string" },
    "event-ref":     { type: "string" },
    "dry-run":       { type: "boolean" },
  },
});

const country = loadCountries().find((c) => c.iso3 === args.country)
  ?? die(`unknown country "${args.country}". Add it first via research:init-country.`);

const indicator = loadIndicators().find((i: Indicator) => i.id === args.indicator)
  ?? die(`unknown indicator "${args.indicator}" — expected one of A1–A6 / B1–B5`);

const year = parseInt(args.year, 10);
if (!Number.isFinite(year) || year < 1900 || year > 2100) die(`--year must be 1900-2100, got "${args.year}"`);

const minYear = Math.max(country.independence_year, indicator.earliest_sourced_year);
if (year < minYear) {
  die(`year ${year} < max(independence ${country.independence_year}, earliest_sourced ${indicator.earliest_sourced_year}) — bumping the floor would violate A8.1`);
}

const tag = (args.tag ?? "FACT") as Tag;
if (!["FACT", "INTERPRETATION", "CONTESTED"].includes(tag)) {
  die(`--tag must be FACT | INTERPRETATION | CONTESTED, got "${tag}"`);
}

if (indicator.type === "INTERP" && !args["review-log-id"]) {
  die(`indicator ${indicator.id} is INTERP — --review-log-id is required`);
}

// Parse raw value: number for linear/interp_rubric, string for ordinal
const rawNum = Number(args["raw-value"]);
const rawValue: number | string = indicator.anchor.kind === "ordinal"
  ? args["raw-value"]
  : Number.isFinite(rawNum) ? rawNum : die(`--raw-value must be numeric for indicator ${indicator.id} (anchor kind ${indicator.anchor.kind})`);

let normalized: number;
try {
  normalized = normalizeRaw(rawValue, indicator.anchor);
} catch (err) {
  die(`anchor computation failed: ${(err as Error).message}`);
}
const normalizedRounded = Math.round(normalized * 100) / 100;

if (!/^\d{4}-\d{2}-\d{2}$/.test(args["source-date"])) {
  die(`--source-date must be YYYY-MM-DD, got "${args["source-date"]}"`);
}

const kind = indicator.history_mode === "step_function" ? "step" : "annual";
const record: Score = (kind === "annual"
  ? {
      kind: "annual",
      country: country.iso3,
      indicator_id: indicator.id,
      axis: indicator.axis,
      year,
      raw_value: rawValue,
      normalized_score: normalizedRounded,
      type: indicator.type,
      tag,
      source_url: args["source-url"],
      source_date: args["source-date"],
    }
  : {
      kind: "step",
      country: country.iso3,
      indicator_id: indicator.id,
      axis: indicator.axis,
      effective_year: year,
      raw_value: rawValue,
      normalized_score: normalizedRounded,
      type: indicator.type,
      tag,
      source_url: args["source-url"],
      source_date: args["source-date"],
    }) as Score;

if (args["note-fr"]) (record as Record<string, unknown>).note_fr = args["note-fr"];
if (args["note-en"]) (record as Record<string, unknown>).note_en = args["note-en"];
if (args["review-log-id"]) (record as Record<string, unknown>).review_log_id = args["review-log-id"];
if (args["event-ref"]) (record as Record<string, unknown>).event_ref = args["event-ref"];

const scoresPath = join(DATA, "scores", `${country.iso3}.json`);
const existing: Score[] = existsSync(scoresPath)
  ? JSON.parse(readFileSync(scoresPath, "utf-8"))
  : [];

// Refuse overlap on (country, indicator, year)
const dup = existing.find((s) => {
  const sYear = s.kind === "annual" ? s.year : s.effective_year;
  return s.indicator_id === indicator.id && sYear === year;
});
if (dup) {
  die(`a ${indicator.id} record for ${country.iso3} year ${year} already exists; remove it first if intentional`);
}

// Insert sorted by (indicator_id, year)
const next = [...existing, record].sort((a, b) => {
  if (a.indicator_id !== b.indicator_id) return a.indicator_id.localeCompare(b.indicator_id);
  const ay = a.kind === "annual" ? a.year : a.effective_year;
  const by = b.kind === "annual" ? b.year : b.effective_year;
  return ay - by;
});

ok("add-score: composed record:");
ok(JSON.stringify(record, null, 2));
ok(`add-score: normalized_score = ${normalizedRounded} (from raw ${JSON.stringify(rawValue)} via ${indicator.anchor.kind} anchor)`);
ok(`add-score: score_ref for capture → ${country.iso3}/${indicator.id}/${year}`);

if (args["dry-run"]) {
  ok("\n--dry-run — nothing written.");
  process.exit(0);
}

writeFileSync(scoresPath, JSON.stringify(next, null, 2) + "\n", "utf-8");
ok(`\nadd-score: wrote data/scores/${country.iso3}.json (${next.length} records)`);
ok("\nNext steps:");
ok(`  1. npm run research:capture -- --score-ref ${country.iso3}/${indicator.id}/${year} --url ${args["source-url"]}`);
ok("  2. npm run validate");
ok("  3. npm run normalize -- --write");
ok("  4. git add data/scores evidence && commit + PR");
