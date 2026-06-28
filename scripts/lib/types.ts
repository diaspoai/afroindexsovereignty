export type ISO3 = string;
export type IndicatorId =
  | "A1" | "A2" | "A3" | "A4" | "A5" | "A6"
  | "B1" | "B2" | "B3" | "B4" | "B5";
export type Axis = "A" | "B";
export type ScoreType = "HARD" | "INTERP";
export type Tag = "FACT" | "INTERPRETATION" | "CONTESTED";

export interface Country {
  iso3: ISO3;
  zone: "UEMOA" | "CEMAC" | "DUMMY";
  currency: "XOF" | "XAF" | "DUMMY";
  name_fr: string;
  name_en: string;
  independence_year: number;
  independence_footnote_fr?: string;
  independence_footnote_en?: string;
}

export type AnchorLinear = {
  kind: "linear";
  raw_at_100: number;
  raw_at_0: number;
  clamp: true;
};
export type AnchorOrdinal = {
  kind: "ordinal";
  levels: { raw: string | number; score: number; label_fr: string; label_en: string }[];
};
export type AnchorInterpRubric = {
  kind: "interp_rubric";
  levels: { score: number; description_fr: string; description_en: string }[];
};
export type Anchor = AnchorLinear | AnchorOrdinal | AnchorInterpRubric;

export interface Indicator {
  id: IndicatorId;
  axis: Axis;
  name_fr: string;
  name_en: string;
  type: ScoreType;
  weight: number;
  cadence: "annual" | "event";
  history_mode: "step_function" | "annual_series";
  earliest_sourced_year: number;
  source_class: string;
  anchor: Anchor;
}

interface ScoreCommon {
  country: ISO3;
  indicator_id: IndicatorId;
  axis: Axis;
  raw_value: number | string;
  normalized_score: number;
  type: ScoreType;
  tag: Tag;
  source_url: string;
  source_date: string;
  event_ref?: string;
  note_fr?: string;
  note_en?: string;
  review_log_id?: string;
}
export interface ScoreAnnual extends ScoreCommon { kind: "annual"; year: number; }
export interface ScoreStep   extends ScoreCommon { kind: "step";   effective_year: number; }
export type Score = ScoreAnnual | ScoreStep;

export interface AxisScore {
  country: ISO3;
  axis: Axis;
  year: number;
  axis_score: number | null;
  coverage: number;
  contributing_indicators: IndicatorId[];
  missing_indicators: IndicatorId[];
  below_coverage_threshold: boolean;
  is_baseline_year: boolean;
}

export interface IafsEvent {
  id: string;
  country: ISO3;
  date: string;
  axis: Axis;
  indicator_id: IndicatorId;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  direction: "+" | "-" | "0";
  source_url: string;
  source_date: string;
}

export interface Methodology {
  version: string;
  anchor_set_id: string;
  coverage_threshold: number;
  mode: "dummy" | "real";
  licenses: { data: "CC-BY-4.0"; code: "MIT" };
}

export interface TrajectoryYear {
  year: number;
  axis_a: { score: number | null; coverage: number; gap: boolean };
  axis_b: { score: number | null; coverage: number; gap: boolean };
  step_changes: {
    axis: Axis;
    indicator_id: IndicatorId;
    from: number | null;
    to: number;
    event_ref?: string;
  }[];
  is_baseline: boolean;
}
export interface Trajectory {
  country: ISO3;
  independence_year: number;
  current_year: number;
  years: TrajectoryYear[];
}

export const FORBIDDEN_FIELDS = [
  "interpolated",
  "extrapolated",
  "imputed",
  "estimated_from",
  "back_filled",
  "backfilled",
  "smoothed",
] as const;

export const FORBIDDEN_COMPOSITE_TOKENS = [
  "sovereignty_score",
  "composite_score",
  "combined_score",
  "overall_score",
  "total_score",
  "fused_score",
] as const;
