import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  loadCountries, loadIndicators, loadMethodology, loadEvents,
  loadScoresFor, loadAxisScoresFor, listScoreFiles, listAxisScoreFiles,
  readSchema,
} from "./lib/io.ts";
import { normalizeRaw, getYear } from "./lib/normalize-core.ts";
import { FORBIDDEN_FIELDS } from "./lib/types.ts";
import type { Indicator, Score } from "./lib/types.ts";

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

const errors: string[] = [];
function fail(msg: string) { errors.push(msg); }

function compile(schemaName: string) {
  return ajv.compile(readSchema(schemaName) as object);
}

const vCountry = compile("country.schema.json");
const vIndicator = compile("indicator.schema.json");
const vScore = compile("score.schema.json");
const vAxisScore = compile("axis_score.schema.json");
const vEvent = compile("event.schema.json");
const vMethodology = compile("methodology.schema.json");

function fmtErrors(name: string, errs: typeof vScore.errors): string {
  return `${name}: ${JSON.stringify(errs?.slice(0, 3))}`;
}

const methodology = loadMethodology();
if (!vMethodology(methodology)) fail(fmtErrors("methodology", vMethodology.errors));

const countries = loadCountries();
const seenIso = new Set<string>();
for (const c of countries) {
  if (!vCountry(c)) fail(fmtErrors(`country ${c.iso3 ?? "?"}`, vCountry.errors));
  if (seenIso.has(c.iso3)) fail(`duplicate country iso3: ${c.iso3}`);
  seenIso.add(c.iso3);
}

const indicators = loadIndicators();
const indicatorById = new Map<string, Indicator>();
for (const i of indicators) {
  if (!vIndicator(i)) fail(fmtErrors(`indicator ${i.id ?? "?"}`, vIndicator.errors));
  if (indicatorById.has(i.id)) fail(`duplicate indicator id: ${i.id}`);
  indicatorById.set(i.id, i);
}
const expectedIds = ["A1","A2","A3","A4","A5","A6","B1","B2","B3","B4","B5"] as const;
for (const id of expectedIds) {
  if (!indicatorById.has(id)) fail(`missing required indicator: ${id}`);
}

const events = loadEvents();
const seenEventIds = new Set<string>();
for (const e of events) {
  if (!vEvent(e)) fail(fmtErrors(`event ${e.id ?? "?"}`, vEvent.errors));
  if (seenEventIds.has(e.id)) fail(`duplicate event id: ${e.id}`);
  seenEventIds.add(e.id);
  const ind = indicatorById.get(e.indicator_id);
  if (ind && ind.axis !== e.axis) fail(`event ${e.id}: axis mismatches indicator ${ind.id}`);
}

function scanForbidden(obj: unknown, path: string): void {
  if (obj === null || typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (FORBIDDEN_FIELDS.includes(k as typeof FORBIDDEN_FIELDS[number])) {
      fail(`forbidden field "${k}" at ${path}`);
    }
    if (v && typeof v === "object") scanForbidden(v, `${path}.${k}`);
  }
}

for (const fileName of listScoreFiles()) {
  const iso3 = fileName.replace(/\.json$/, "");
  const country = countries.find((c) => c.iso3 === iso3);
  if (!country) { fail(`scores/${fileName} has no matching country in countries.json`); continue; }

  const scores = loadScoresFor(iso3);
  const stepsByIndicator = new Map<string, number[]>();

  for (const s of scores) {
    if (!vScore(s)) { fail(fmtErrors(`scores/${fileName} record`, vScore.errors)); continue; }
    scanForbidden(s, `scores/${fileName}:${s.indicator_id}`);

    if (s.country !== iso3) fail(`scores/${fileName}: record.country=${s.country} mismatches file`);
    const ind = indicatorById.get(s.indicator_id);
    if (!ind) { fail(`scores/${fileName}: unknown indicator ${s.indicator_id}`); continue; }
    if (s.axis !== ind.axis) fail(`scores/${fileName}: axis ${s.axis} mismatches indicator ${ind.id} axis ${ind.axis}`);
    if (s.type !== ind.type) fail(`scores/${fileName}: type ${s.type} mismatches indicator ${ind.id} type ${ind.type}`);

    const kindExpected = ind.history_mode === "step_function" ? "step" : "annual";
    if (s.kind !== kindExpected) {
      fail(`scores/${fileName}: indicator ${ind.id} requires kind=${kindExpected}, got ${s.kind}`);
    }

    const year = getYear(s);
    const minYear = Math.max(country.independence_year, ind.earliest_sourced_year);
    if (year < minYear) {
      fail(`scores/${fileName}: ${ind.id} year ${year} < max(independence ${country.independence_year}, earliest_sourced ${ind.earliest_sourced_year})`);
    }

    if (s.type === "INTERP" && !s.review_log_id) {
      fail(`scores/${fileName}: INTERP record ${ind.id} year ${year} missing review_log_id`);
    }

    try {
      const expected = normalizeRaw(s.raw_value, ind.anchor);
      if (Math.abs(expected - s.normalized_score) > 0.01) {
        fail(`scores/${fileName}: ${ind.id} year ${year} normalized_score=${s.normalized_score} but anchor gives ${expected}`);
      }
    } catch (err) {
      fail(`scores/${fileName}: ${ind.id} year ${year} anchor error: ${(err as Error).message}`);
    }

    if (s.kind === "step") {
      const arr = stepsByIndicator.get(s.indicator_id) ?? [];
      arr.push(s.effective_year);
      stepsByIndicator.set(s.indicator_id, arr);
    }
  }

  for (const [indId, years] of stepsByIndicator) {
    const sorted = [...years].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]! <= sorted[i - 1]!) {
        fail(`scores/${fileName}: ${indId} step effective_year ${sorted[i]} is not strictly after previous ${sorted[i-1]}`);
      }
    }
  }
}

for (const fileName of listAxisScoreFiles()) {
  const iso3 = fileName.replace(/\.json$/, "");
  const axisScores = loadAxisScoresFor(iso3);
  for (const a of axisScores) {
    if (!vAxisScore(a)) { fail(fmtErrors(`axis_scores/${fileName} record`, vAxisScore.errors)); continue; }
    scanForbidden(a, `axis_scores/${fileName}`);
    if (a.below_coverage_threshold && a.axis_score !== null) {
      fail(`axis_scores/${fileName}: below_coverage_threshold true but axis_score=${a.axis_score} (must be null)`);
    }
    if (!a.below_coverage_threshold && a.axis_score === null && a.contributing_indicators.length > 0) {
      fail(`axis_scores/${fileName}: axis_score null with contributing indicators and coverage above threshold`);
    }
  }
}

if (errors.length) {
  console.error(`validate: ${errors.length} error(s)`);
  for (const e of errors) console.error(`  · ${e}`);
  process.exit(1);
}
console.log(`validate: OK (${countries.length} countries, ${indicators.length} indicators, ${events.length} events, ${listScoreFiles().length} score files)`);
