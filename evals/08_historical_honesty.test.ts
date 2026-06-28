import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  loadCountries, loadIndicators, loadMethodology, loadScoresFor,
  loadAxisScoresFor, REPO_ROOT,
} from "../scripts/lib/io.ts";
import { getYear } from "../scripts/lib/normalize-core.ts";
import { FORBIDDEN_FIELDS } from "../scripts/lib/types.ts";

/**
 * Historical-honesty eval (R9 / A4 / A8 / D9).
 *   - Year-bound enforcement: no score before max(independence_year, earliest_sourced_year).
 *   - Forbidden-field denylist (interpolated/extrapolated/imputed/...) absent from all data.
 *   - AxisScore: coverage<threshold ⇒ axis_score=null AND below_coverage_threshold=true.
 *   - First-observed year per country: trajectory baseline_year matches independence_year.
 *   - DOM rendering: built trajectory JSONs encode gaps as nulls (no smoothing).
 */
describe("eval 08: historical-honesty", () => {
  const countries = loadCountries();
  const indicators = loadIndicators();
  const methodology = loadMethodology();
  const indById = new Map(indicators.map((i) => [i.id, i]));

  it("no score predates max(country.independence_year, indicator.earliest_sourced_year)", () => {
    for (const country of countries) {
      for (const s of loadScoresFor(country.iso3)) {
        const ind = indById.get(s.indicator_id)!;
        const minYear = Math.max(country.independence_year, ind.earliest_sourced_year);
        expect(getYear(s), `${country.iso3} ${s.indicator_id}`).toBeGreaterThanOrEqual(minYear);
      }
    }
  });

  it("forbidden fields (interpolated, extrapolated, imputed, ...) never appear in any data file", () => {
    const offenders: string[] = [];
    walk(join(REPO_ROOT, "data"), (file) => {
      if (!file.endsWith(".json")) return;
      const txt = readFileSync(file, "utf-8");
      for (const f of FORBIDDEN_FIELDS) {
        const needle = `"${f}"`;
        if (txt.includes(needle)) offenders.push(`${file}: contains "${f}"`);
      }
    });
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("AxisScore: below_coverage_threshold ⇔ axis_score === null (assuming any contributing indicators)", () => {
    for (const country of countries) {
      for (const a of loadAxisScoresFor(country.iso3)) {
        if (a.below_coverage_threshold) {
          expect(a.axis_score, `${country.iso3} ${a.axis} ${a.year}: below threshold must have null score`).toBeNull();
        }
        expect(a.coverage >= 0 && a.coverage <= 1).toBe(true);
        if (a.below_coverage_threshold) {
          expect(a.coverage < methodology.coverage_threshold).toBe(true);
        }
      }
    }
  });

  it("trajectory baseline_year matches independence_year and grids start there", () => {
    const trajDir = join(REPO_ROOT, "built", "trajectory");
    if (!existsSync(trajDir)) {
      throw new Error("built/trajectory missing — run 'npm run normalize -- --write' before evals");
    }
    for (const country of countries) {
      const path = join(trajDir, `${country.iso3}.json`);
      expect(existsSync(path), `trajectory for ${country.iso3} missing`).toBe(true);
      const traj = JSON.parse(readFileSync(path, "utf-8"));
      expect(traj.independence_year).toBe(country.independence_year);
      expect(traj.years[0].year).toBe(country.independence_year);
      expect(traj.years[0].is_baseline).toBe(true);
    }
  });

  it("trajectory honors gaps: years with null axis_score have gap:true", () => {
    const trajDir = join(REPO_ROOT, "built", "trajectory");
    for (const country of countries) {
      const traj = JSON.parse(readFileSync(join(trajDir, `${country.iso3}.json`), "utf-8"));
      for (const y of traj.years) {
        if (y.axis_a.score === null) expect(y.axis_a.gap).toBe(true);
        if (y.axis_b.score === null) expect(y.axis_b.gap).toBe(true);
        if (y.axis_a.gap) expect(y.axis_a.score).toBeNull();
        if (y.axis_b.gap) expect(y.axis_b.score).toBeNull();
      }
    }
  });

  it("at least one gap year exists in dummy data (proves the gap mechanism is exercised)", () => {
    const trajDir = join(REPO_ROOT, "built", "trajectory");
    let foundGap = false;
    for (const country of countries) {
      const traj = JSON.parse(readFileSync(join(trajDir, `${country.iso3}.json`), "utf-8"));
      for (const y of traj.years) {
        if (y.axis_a.gap || y.axis_b.gap) { foundGap = true; break; }
      }
      if (foundGap) break;
    }
    expect(foundGap, "dummy data should exercise at least one gap year").toBe(true);
  });
});

function walk(dir: string, fn: (path: string) => void) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, fn);
    else fn(p);
  }
}
