import {
  loadCountries, loadIndicators, loadMethodology, loadScoresFor,
  loadAxisScoresFor, writeAxisScores, writeTrajectory,
} from "./lib/io.ts";
import { buildAxisScores, buildTrajectory } from "./lib/normalize-core.ts";
import type { AxisScore } from "./lib/types.ts";

const args = new Set(process.argv.slice(2));
const WRITE = args.has("--write");
const CURRENT_YEAR = (() => {
  const envYear = process.env.IAFS_CURRENT_YEAR;
  if (envYear) {
    const n = parseInt(envYear, 10);
    if (Number.isFinite(n)) return n;
  }
  return new Date().getUTCFullYear();
})();

const errors: string[] = [];
function fail(msg: string) { errors.push(msg); }

const methodology = loadMethodology();
const indicators = loadIndicators();
const countries = loadCountries();

for (const country of countries) {
  const scores = loadScoresFor(country.iso3);
  const computed = buildAxisScores(country, indicators, scores, methodology, CURRENT_YEAR);
  const trajectory = buildTrajectory(country, indicators, scores, computed, CURRENT_YEAR);

  if (WRITE) {
    writeAxisScores(country.iso3, computed);
    writeTrajectory(country.iso3, trajectory);
  } else {
    writeTrajectory(country.iso3, trajectory);
    const stored = loadAxisScoresFor(country.iso3);
    const cmp = compareAxisScores(computed, stored, country.iso3);
    if (cmp) fail(cmp);
  }
}

if (errors.length) {
  console.error(`normalize: ${errors.length} error(s)`);
  for (const e of errors) console.error(`  · ${e}`);
  console.error(
    `hint: stored axis_scores drifted from recomputation. ` +
    `Run "npm run normalize -- --write" after intentional data changes, then commit.`
  );
  process.exit(1);
}
console.log(
  `normalize: OK (${countries.length} countries, current_year=${CURRENT_YEAR}, mode=${WRITE ? "write" : "verify"})`
);

function compareAxisScores(computed: AxisScore[], stored: AxisScore[], iso3: string): string | null {
  if (stored.length === 0) {
    return `axis_scores/${iso3}.json missing — run "npm run normalize -- --write"`;
  }
  if (computed.length !== stored.length) {
    return `axis_scores/${iso3}.json: length ${stored.length} vs computed ${computed.length}`;
  }
  for (let i = 0; i < computed.length; i++) {
    const c = computed[i]!;
    const s = stored[i]!;
    if (
      c.year !== s.year || c.axis !== s.axis ||
      c.axis_score !== s.axis_score ||
      Math.abs(c.coverage - s.coverage) > 1e-6 ||
      c.below_coverage_threshold !== s.below_coverage_threshold ||
      c.is_baseline_year !== s.is_baseline_year ||
      !arrEq(c.contributing_indicators, s.contributing_indicators) ||
      !arrEq(c.missing_indicators, s.missing_indicators)
    ) {
      return `axis_scores/${iso3}.json: drift at year ${c.year} axis ${c.axis} — computed=${JSON.stringify(c)} stored=${JSON.stringify(s)}`;
    }
  }
  return null;
}

function arrEq<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
