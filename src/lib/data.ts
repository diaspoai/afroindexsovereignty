import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const DATA = join(ROOT, "data");
const BUILT = join(ROOT, "built");

export function readJSON<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function getCountries() { return readJSON<any[]>(join(DATA, "countries.json")); }
export function getIndicators() { return readJSON<any[]>(join(DATA, "indicators.json")); }
export function getMethodology() { return readJSON<any>(join(DATA, "methodology.json")); }
export function getEvents() { return readJSON<any[]>(join(DATA, "events.json")); }
export function getScores(iso3: string) { return readJSON<any[]>(join(DATA, "scores", `${iso3}.json`)); }
export function getTrajectory(iso3: string) {
  const p = join(BUILT, "trajectory", `${iso3}.json`);
  if (!existsSync(p)) {
    throw new Error(`Missing built/trajectory/${iso3}.json — run "npm run normalize -- --write" first.`);
  }
  return readJSON<any>(p);
}
export function listTrajectories(): string[] {
  const d = join(BUILT, "trajectory");
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
}
