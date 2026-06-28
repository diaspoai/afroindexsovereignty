import type {
  Indicator, Score, ScoreAnnual, ScoreStep, AxisScore, Country,
  IndicatorId, Axis, Trajectory, TrajectoryYear, Methodology, Anchor,
} from "./types.ts";

/**
 * Map a raw value through an indicator's anchor to a 0-100 normalized score.
 * Pure function. Used both to recompute scores and to verify stored ones.
 */
export function normalizeRaw(raw: number | string, anchor: Anchor): number {
  switch (anchor.kind) {
    case "linear": {
      if (typeof raw !== "number") {
        throw new Error(`linear anchor requires numeric raw_value, got ${typeof raw}: ${raw}`);
      }
      const { raw_at_0, raw_at_100 } = anchor;
      const denom = raw_at_0 - raw_at_100;
      if (denom === 0) throw new Error("linear anchor has zero range");
      const score = 100 * (raw_at_0 - raw) / denom;
      return Math.max(0, Math.min(100, score));
    }
    case "ordinal": {
      const match = anchor.levels.find((l) => l.raw === raw);
      if (!match) {
        throw new Error(`ordinal raw "${raw}" not in rubric levels`);
      }
      return match.score;
    }
    case "interp_rubric": {
      if (typeof raw !== "number") {
        throw new Error(`interp_rubric raw must be numeric (a chosen level score), got ${typeof raw}`);
      }
      const match = anchor.levels.find((l) => l.score === raw);
      if (!match) {
        throw new Error(`interp_rubric raw ${raw} does not match a defined rubric level`);
      }
      return match.score;
    }
  }
}

export function getYear(s: Score): number {
  return s.kind === "annual" ? s.year : s.effective_year;
}

/**
 * Expand a country's scores into a per-year value map for each indicator.
 * - annual records cover exactly their year.
 * - step records hold from effective_year until the next step (or untilYear inclusive).
 * Result: Map<indicator_id, Map<year, Score>> — the score that applies to that year.
 */
export function expandByYear(
  scores: Score[],
  indicators: Indicator[],
  fromYear: number,
  untilYear: number,
): Map<IndicatorId, Map<number, Score>> {
  const result = new Map<IndicatorId, Map<number, Score>>();
  for (const ind of indicators) {
    result.set(ind.id, new Map());
  }
  const byIndicator = new Map<IndicatorId, Score[]>();
  for (const s of scores) {
    const list = byIndicator.get(s.indicator_id) ?? [];
    list.push(s);
    byIndicator.set(s.indicator_id, list);
  }
  for (const ind of indicators) {
    const list = (byIndicator.get(ind.id) ?? []).slice().sort((a, b) => getYear(a) - getYear(b));
    const grid = result.get(ind.id)!;
    if (ind.history_mode === "annual_series") {
      for (const s of list) {
        if (s.kind !== "annual") continue;
        if (s.year < fromYear || s.year > untilYear) continue;
        grid.set(s.year, s);
      }
    } else {
      const steps = list.filter((s): s is ScoreStep => s.kind === "step");
      for (let i = 0; i < steps.length; i++) {
        const cur = steps[i]!;
        const next = steps[i + 1];
        const start = Math.max(cur.effective_year, fromYear);
        const end = Math.min((next?.effective_year ?? untilYear + 1) - 1, untilYear);
        for (let y = start; y <= end; y++) {
          grid.set(y, cur);
        }
      }
    }
  }
  return result;
}

/**
 * Coverage-aware axis score for one (country, axis, year).
 * Weights renormalized over the available indicators in the axis for that year.
 */
export function computeAxisScore(
  axis: Axis,
  year: number,
  country: Country,
  indicators: Indicator[],
  expanded: Map<IndicatorId, Map<number, Score>>,
  coverageThreshold: number,
): AxisScore {
  const axisIndicators = indicators.filter((i) => i.axis === axis);
  const totalWeight = axisIndicators.reduce((sum, i) => sum + i.weight, 0);
  const contributing: IndicatorId[] = [];
  const missing: IndicatorId[] = [];
  let weightedSum = 0;
  let availableWeight = 0;
  for (const ind of axisIndicators) {
    if (year < ind.earliest_sourced_year) {
      missing.push(ind.id);
      continue;
    }
    const s = expanded.get(ind.id)?.get(year);
    if (!s) {
      missing.push(ind.id);
      continue;
    }
    contributing.push(ind.id);
    availableWeight += ind.weight;
    weightedSum += ind.weight * s.normalized_score;
  }
  const coverage = totalWeight > 0 ? availableWeight / totalWeight : 0;
  const below = coverage < coverageThreshold;
  const axis_score =
    below || availableWeight === 0 ? null : weightedSum / availableWeight;
  return {
    country: country.iso3,
    axis,
    year,
    axis_score: axis_score === null ? null : roundTo(axis_score, 2),
    coverage: roundTo(coverage, 4),
    contributing_indicators: contributing,
    missing_indicators: missing,
    below_coverage_threshold: below,
    is_baseline_year: year === country.independence_year,
  };
}

function roundTo(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

/**
 * Build the per-country axis-score series for both axes,
 * from independence_year through currentYear inclusive.
 */
export function buildAxisScores(
  country: Country,
  indicators: Indicator[],
  scores: Score[],
  methodology: Methodology,
  currentYear: number,
): AxisScore[] {
  const expanded = expandByYear(scores, indicators, country.independence_year, currentYear);
  const out: AxisScore[] = [];
  for (let y = country.independence_year; y <= currentYear; y++) {
    out.push(computeAxisScore("A", y, country, indicators, expanded, methodology.coverage_threshold));
    out.push(computeAxisScore("B", y, country, indicators, expanded, methodology.coverage_threshold));
  }
  return out;
}

/**
 * Materialize the trajectory view consumed by the site. Years are continuous from
 * independence_year to currentYear; gaps are explicit (score: null, gap: true).
 */
export function buildTrajectory(
  country: Country,
  indicators: Indicator[],
  scores: Score[],
  axisScores: AxisScore[],
  currentYear: number,
): Trajectory {
  const byYearAxis = new Map<string, AxisScore>();
  for (const a of axisScores) byYearAxis.set(`${a.axis}:${a.year}`, a);

  const steps = scores.filter((s): s is ScoreStep => s.kind === "step");
  const stepByYearIndicator = new Map<string, ScoreStep[]>();
  for (const st of steps) {
    const k = `${st.effective_year}:${st.indicator_id}`;
    const arr = stepByYearIndicator.get(k) ?? [];
    arr.push(st);
    stepByYearIndicator.set(k, arr);
  }

  const indicatorById = new Map(indicators.map((i) => [i.id, i]));
  const years: TrajectoryYear[] = [];
  for (let y = country.independence_year; y <= currentYear; y++) {
    const a = byYearAxis.get(`A:${y}`)!;
    const b = byYearAxis.get(`B:${y}`)!;
    const step_changes: TrajectoryYear["step_changes"] = [];
    for (const ind of indicators) {
      if (ind.history_mode !== "step_function") continue;
      const here = stepByYearIndicator.get(`${y}:${ind.id}`);
      if (!here) continue;
      for (const st of here) {
        const allSteps = steps
          .filter((s) => s.indicator_id === ind.id && s.country === country.iso3)
          .sort((p, q) => p.effective_year - q.effective_year);
        const idx = allSteps.findIndex((s) => s.effective_year === st.effective_year);
        const prev = idx > 0 ? allSteps[idx - 1]!.normalized_score : null;
        step_changes.push({
          axis: ind.axis,
          indicator_id: ind.id,
          from: prev,
          to: st.normalized_score,
          ...(st.event_ref ? { event_ref: st.event_ref } : {}),
        });
      }
    }
    void indicatorById;
    years.push({
      year: y,
      axis_a: {
        score: a.axis_score,
        coverage: a.coverage,
        gap: a.axis_score === null,
      },
      axis_b: {
        score: b.axis_score,
        coverage: b.coverage,
        gap: b.axis_score === null,
      },
      step_changes,
      is_baseline: y === country.independence_year,
    });
  }
  return {
    country: country.iso3,
    independence_year: country.independence_year,
    current_year: currentYear,
    years,
  };
}
