import { describe, it, expect } from "vitest";
import {
  loadCountries, loadIndicators, loadMethodology, loadScoresFor,
  loadAxisScoresFor,
} from "../scripts/lib/io.ts";
import {
  buildAxisScores, normalizeRaw, getYear,
} from "../scripts/lib/normalize-core.ts";

const CURRENT_YEAR = parseInt(process.env.IAFS_CURRENT_YEAR ?? "2026", 10);

describe("eval 02: normalization reproducibility", () => {
  const countries = loadCountries();
  const indicators = loadIndicators();
  const methodology = loadMethodology();
  const indById = new Map(indicators.map((i) => [i.id, i]));

  it("every score's normalized_score equals normalizeRaw(raw_value, indicator.anchor)", () => {
    for (const country of countries) {
      const scores = loadScoresFor(country.iso3);
      for (const s of scores) {
        const ind = indById.get(s.indicator_id)!;
        const expected = normalizeRaw(s.raw_value, ind.anchor);
        expect(s.normalized_score, `${country.iso3} ${s.indicator_id} year ${getYear(s)}`).toBeCloseTo(expected, 2);
      }
    }
  });

  it("stored axis_scores match recomputed axis_scores byte-for-byte (modulo float precision)", () => {
    for (const country of countries) {
      const scores = loadScoresFor(country.iso3);
      const computed = buildAxisScores(country, indicators, scores, methodology, CURRENT_YEAR);
      const stored = loadAxisScoresFor(country.iso3);
      expect(stored.length, `${country.iso3} axis_scores file missing or wrong length`).toBe(computed.length);
      for (let i = 0; i < computed.length; i++) {
        const c = computed[i]!;
        const s = stored[i]!;
        expect(s.year).toBe(c.year);
        expect(s.axis).toBe(c.axis);
        expect(s.axis_score).toBe(c.axis_score);
        expect(s.coverage).toBeCloseTo(c.coverage, 6);
        expect(s.below_coverage_threshold).toBe(c.below_coverage_threshold);
        expect(s.is_baseline_year).toBe(c.is_baseline_year);
        expect(s.contributing_indicators).toEqual(c.contributing_indicators);
        expect(s.missing_indicators).toEqual(c.missing_indicators);
      }
    }
  });
});
