import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Country, Indicator, Score, AxisScore, IafsEvent, Methodology,
  ISO3, Trajectory,
} from "./types.ts";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DATA = join(REPO_ROOT, "data");
export const BUILT = join(REPO_ROOT, "built");
export const SCHEMAS = join(REPO_ROOT, "schemas");

function readJSON<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function loadCountries(): Country[] {
  return readJSON(join(DATA, "countries.json"));
}
export function loadIndicators(): Indicator[] {
  return readJSON(join(DATA, "indicators.json"));
}
export function loadMethodology(): Methodology {
  return readJSON(join(DATA, "methodology.json"));
}
export function loadEvents(): IafsEvent[] {
  return readJSON(join(DATA, "events.json"));
}
export function loadScoresFor(iso3: ISO3): Score[] {
  return readJSON(join(DATA, "scores", `${iso3}.json`));
}
export function loadAxisScoresFor(iso3: ISO3): AxisScore[] {
  const path = join(DATA, "axis_scores", `${iso3}.json`);
  if (!existsSync(path)) return [];
  return readJSON(path);
}

export function listScoreFiles(): string[] {
  return readdirSync(join(DATA, "scores")).filter((f) => f.endsWith(".json"));
}
export function listAxisScoreFiles(): string[] {
  const dir = join(DATA, "axis_scores");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json"));
}

export function writeAxisScores(iso3: ISO3, scores: AxisScore[]): void {
  const dir = join(DATA, "axis_scores");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${iso3}.json`),
    JSON.stringify(scores, null, 2) + "\n",
    "utf-8"
  );
}

export function writeTrajectory(iso3: ISO3, traj: Trajectory): void {
  const dir = join(BUILT, "trajectory");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${iso3}.json`),
    JSON.stringify(traj, null, 2) + "\n",
    "utf-8"
  );
}

export function readSchema(name: string): unknown {
  return readJSON(join(SCHEMAS, name));
}
