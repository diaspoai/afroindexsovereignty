/**
 * One-shot build step. Reads world-atlas (Natural Earth-derived TopoJSON),
 * filters to African sovereign states, projects with Equal Earth, and emits
 * src/components/landing/_africa-paths.json — a deterministic map of
 * { iso3 -> { d: <svg-path>, name, isCfa, zone? } }, plus an overall viewBox.
 *
 * Re-run when world-atlas is updated. Output is committed (small, deterministic).
 *
 *   npm run gen:africa
 */
import { writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json" with { type: "json" };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "components", "landing", "_africa-paths.json");

/** ISO-3166-1 numeric → alpha-3 for African sovereign states only. */
const AFRICA_NUM_TO_ISO3: Record<number, string> = {
  12: "DZA", 24: "AGO", 72: "BWA", 108: "BDI", 120: "CMR", 132: "CPV",
  140: "CAF", 148: "TCD", 174: "COM", 178: "COG", 180: "COD", 204: "BEN",
  226: "GNQ", 231: "ETH", 232: "ERI", 262: "DJI", 266: "GAB", 270: "GMB",
  288: "GHA", 324: "GIN", 384: "CIV", 404: "KEN", 426: "LSO", 430: "LBR",
  434: "LBY", 450: "MDG", 454: "MWI", 466: "MLI", 478: "MRT", 480: "MUS",
  504: "MAR", 508: "MOZ", 516: "NAM", 562: "NER", 566: "NGA", 624: "GNB",
  646: "RWA", 678: "STP", 686: "SEN", 690: "SYC", 694: "SLE", 706: "SOM",
  710: "ZAF", 716: "ZWE", 728: "SSD", 729: "SDN", 732: "ESH", 748: "SWZ",
  768: "TGO", 788: "TUN", 800: "UGA", 818: "EGY", 834: "TZA", 854: "BFA",
  894: "ZMB",
};

/** The 12 CFA-franc states tracked by IAFS, with monetary-zone metadata. */
const CFA_STATES: Record<string, { zone: "UEMOA" | "CEMAC"; currency: "XOF" | "XAF" }> = {
  BEN: { zone: "UEMOA", currency: "XOF" }, BFA: { zone: "UEMOA", currency: "XOF" },
  CIV: { zone: "UEMOA", currency: "XOF" }, MLI: { zone: "UEMOA", currency: "XOF" },
  NER: { zone: "UEMOA", currency: "XOF" }, SEN: { zone: "UEMOA", currency: "XOF" },
  TGO: { zone: "UEMOA", currency: "XOF" }, CMR: { zone: "CEMAC", currency: "XAF" },
  CAF: { zone: "CEMAC", currency: "XAF" }, TCD: { zone: "CEMAC", currency: "XAF" },
  COG: { zone: "CEMAC", currency: "XAF" }, GAB: { zone: "CEMAC", currency: "XAF" },
};

const world = worldData as unknown as { objects: { countries: { geometries: { id?: string; properties?: { name?: string } }[] } } };
const fc = feature(world as never, world.objects.countries) as unknown as {
  features: { id: string; properties: { name: string }; geometry: unknown }[];
};

const africaFeatures = fc.features
  .filter((f) => AFRICA_NUM_TO_ISO3[parseInt(f.id, 10)])
  .map((f) => ({
    iso3: AFRICA_NUM_TO_ISO3[parseInt(f.id, 10)]!,
    name: f.properties.name,
    geometry: f.geometry,
  }));

const W = 600;
const H = 700;
const projection = geoEqualEarth().fitSize(
  [W - 20, H - 20],
  { type: "FeatureCollection", features: africaFeatures.map((f) => ({ type: "Feature", properties: {}, geometry: f.geometry as never })) } as never,
);
projection.translate([projection.translate()[0] + 10, projection.translate()[1] + 10]);

const path = geoPath(projection);

interface Out {
  iso3: string;
  name: string;
  d: string;
  isCfa: boolean;
  zone?: "UEMOA" | "CEMAC";
  currency?: "XOF" | "XAF";
}

const items: Out[] = africaFeatures.map((f) => {
  const cfa = CFA_STATES[f.iso3];
  const d = path({ type: "Feature", properties: {}, geometry: f.geometry as never } as never) ?? "";
  return cfa
    ? { iso3: f.iso3, name: f.name, d, isCfa: true, zone: cfa.zone, currency: cfa.currency }
    : { iso3: f.iso3, name: f.name, d, isCfa: false };
});

// Sort: non-CFA first (drawn underneath), then CFA on top, so highlights win on overlap.
items.sort((a, b) => Number(a.isCfa) - Number(b.isCfa));

const payload = {
  viewBox: `0 0 ${W} ${H}`,
  width: W,
  height: H,
  countries: items,
};

writeFileSync(OUT, JSON.stringify(payload, null, 0) + "\n", "utf-8");
console.log(`gen-africa-paths: wrote ${items.length} country paths to ${OUT.replace(ROOT + "/", "")}`);
console.log(`  CFA states found: ${items.filter((i) => i.isCfa).map((i) => i.iso3).sort().join(", ")}`);
const missing = Object.keys(CFA_STATES).filter((iso) => !items.find((i) => i.iso3 === iso));
if (missing.length) {
  console.error(`  WARNING: missing CFA states: ${missing.join(", ")}`);
  process.exit(1);
}
