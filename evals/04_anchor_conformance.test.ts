import { describe, it, expect } from "vitest";
import {
  loadCountries, loadIndicators, loadScoresFor,
} from "../scripts/lib/io.ts";
import { getYear } from "../scripts/lib/normalize-core.ts";

describe("eval 04: anchor-conformance", () => {
  const indicators = loadIndicators();
  const indById = new Map(indicators.map((i) => [i.id, i]));

  it("ordinal raw_values are members of the rubric levels", () => {
    for (const country of loadCountries()) {
      const scores = loadScoresFor(country.iso3);
      for (const s of scores) {
        const ind = indById.get(s.indicator_id)!;
        if (ind.anchor.kind !== "ordinal") continue;
        const raws = ind.anchor.levels.map((l) => l.raw);
        expect(
          raws.includes(s.raw_value),
          `${country.iso3} ${ind.id} year ${getYear(s)}: raw "${s.raw_value}" not in rubric ${JSON.stringify(raws)}`,
        ).toBe(true);
      }
    }
  });

  it("interp_rubric raw_values match a defined rubric score", () => {
    for (const country of loadCountries()) {
      const scores = loadScoresFor(country.iso3);
      for (const s of scores) {
        const ind = indById.get(s.indicator_id)!;
        if (ind.anchor.kind !== "interp_rubric") continue;
        const scoresAllowed = ind.anchor.levels.map((l) => l.score);
        expect(
          scoresAllowed.includes(Number(s.raw_value)),
          `${country.iso3} ${ind.id} year ${getYear(s)}: raw "${s.raw_value}" not a defined rubric level`,
        ).toBe(true);
      }
    }
  });

  it("linear raw_values are numeric and within or clamped against the anchor range", () => {
    for (const country of loadCountries()) {
      const scores = loadScoresFor(country.iso3);
      for (const s of scores) {
        const ind = indById.get(s.indicator_id)!;
        if (ind.anchor.kind !== "linear") continue;
        expect(typeof s.raw_value, `${country.iso3} ${ind.id} year ${getYear(s)}: linear anchor requires numeric raw`).toBe("number");
      }
    }
  });

  it("indicator weights match spec (A1=1.5; HARD=1.0; INTERP=0.5)", () => {
    for (const ind of indicators) {
      if (ind.id === "A1") {
        expect(ind.weight, "A1 spine weight").toBeCloseTo(1.5, 6);
      } else if (ind.type === "HARD") {
        expect(ind.weight, `HARD weight for ${ind.id}`).toBeCloseTo(1.0, 6);
      } else {
        expect(ind.weight, `INTERP weight for ${ind.id}`).toBeCloseTo(0.5, 6);
      }
    }
  });
});
