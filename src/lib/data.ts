/**
 * Build-time data loader. All reads resolve at build time via Vite's static
 * JSON imports + import.meta.glob — no Node.js fs at runtime, so this works
 * under any bundler (Cloudflare Pages, Vercel, Netlify, local).
 *
 * The trajectory glob points at ../../built/trajectory which is produced by
 * `npm run build:data` (validate + normalize) before `astro build` runs.
 */
import countriesJSON from "../../data/countries.json";
import indicatorsJSON from "../../data/indicators.json";
import methodologyJSON from "../../data/methodology.json";
import eventsJSON from "../../data/events.json";

const scoreModules = import.meta.glob("../../data/scores/*.json", { eager: true }) as Record<string, { default: unknown[] }>;
const trajectoryModules = import.meta.glob("../../built/trajectory/*.json", { eager: true }) as Record<string, { default: unknown }>;

function indexByISO3<T>(modules: Record<string, { default: T }>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [path, mod] of Object.entries(modules)) {
    const match = path.match(/\/([A-Z]{3})\.json$/);
    if (match) out[match[1]!] = mod.default;
  }
  return out;
}

const SCORES = indexByISO3(scoreModules);
const TRAJECTORIES = indexByISO3(trajectoryModules);

export function getCountries(): any[] { return countriesJSON as any[]; }
export function getIndicators(): any[] { return indicatorsJSON as any[]; }
export function getMethodology(): any { return methodologyJSON; }
export function getEvents(): any[] { return eventsJSON as any[]; }

export function getScores(iso3: string): any[] {
  const v = SCORES[iso3];
  if (!v) throw new Error(`No scores file for ${iso3} — expected data/scores/${iso3}.json`);
  return v;
}

export function getTrajectory(iso3: string): any {
  const v = TRAJECTORIES[iso3];
  if (!v) {
    throw new Error(
      `No trajectory for ${iso3} — expected built/trajectory/${iso3}.json. ` +
      `Run "npm run normalize -- --write" (or "npm run build:data") first.`
    );
  }
  return v;
}

export function listTrajectories(): string[] {
  return Object.keys(TRAJECTORIES);
}
