import { describe, it, expect } from "vitest";
import {
  loadCountries, loadIndicators, loadScoresFor,
} from "../scripts/lib/io.ts";
import { getYear } from "../scripts/lib/normalize-core.ts";

describe("eval 05: tag correctness", () => {
  const indicators = loadIndicators();
  const indById = new Map(indicators.map((i) => [i.id, i]));

  it("tag ∈ {FACT, INTERPRETATION, CONTESTED} and type matches indicator.type", () => {
    for (const country of loadCountries()) {
      for (const s of loadScoresFor(country.iso3)) {
        const ind = indById.get(s.indicator_id)!;
        expect(["FACT","INTERPRETATION","CONTESTED"]).toContain(s.tag);
        expect(s.type, `${country.iso3} ${ind.id} year ${getYear(s)}`).toBe(ind.type);
      }
    }
  });

  it("INTERP records carry review_log_id and a note", () => {
    for (const country of loadCountries()) {
      for (const s of loadScoresFor(country.iso3)) {
        if (s.type !== "INTERP") continue;
        expect(s.review_log_id, `${country.iso3} ${s.indicator_id} year ${getYear(s)} missing review_log_id`).toBeTruthy();
        const hasNote = (s.note_fr ?? s.note_en) ? true : false;
        expect(hasNote, `${country.iso3} ${s.indicator_id} year ${getYear(s)}: INTERP must carry note_fr or note_en`).toBe(true);
      }
    }
  });
});
