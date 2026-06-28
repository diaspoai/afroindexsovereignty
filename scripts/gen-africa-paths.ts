/**
 * One-shot build step. Reads world-atlas (Natural Earth-derived TopoJSON),
 * filters to African sovereign states, projects with Equal Earth FIT TO THE
 * CFA-FRANC BOUNDING BOX (so the 12 CFA states fill the frame), and emits:
 *   - the 12 CFA-state SVG paths (highlighted)
 *   - a unified Africa silhouette (single MultiPolygon via topojson mergeArcs)
 *     — used as a quiet continental backdrop, no per-country grey lines
 *
 * Output: src/components/landing/_africa-paths.json
 * Re-run when world-atlas updates. Output is committed (small, deterministic).
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

/** The 12 CFA-franc states tracked by IAFS. */
const CFA_STATES: Record<string, { zone: "UEMOA" | "CEMAC"; currency: "XOF" | "XAF" }> = {
  BEN: { zone: "UEMOA", currency: "XOF" }, BFA: { zone: "UEMOA", currency: "XOF" },
  CIV: { zone: "UEMOA", currency: "XOF" }, MLI: { zone: "UEMOA", currency: "XOF" },
  NER: { zone: "UEMOA", currency: "XOF" }, SEN: { zone: "UEMOA", currency: "XOF" },
  TGO: { zone: "UEMOA", currency: "XOF" }, CMR: { zone: "CEMAC", currency: "XAF" },
  CAF: { zone: "CEMAC", currency: "XAF" }, TCD: { zone: "CEMAC", currency: "XAF" },
  COG: { zone: "CEMAC", currency: "XAF" }, GAB: { zone: "CEMAC", currency: "XAF" },
};

const world = worldData as unknown as {
  objects: { countries: { geometries: { id?: string; properties?: { name?: string } }[] } };
};
const fc = feature(world as never, world.objects.countries) as unknown as {
  features: { id: string; properties: { name: string }; geometry: unknown }[];
};

// All African country features, with iso3 attached.
const africaFeatures = fc.features
  .filter((f) => AFRICA_NUM_TO_ISO3[parseInt(f.id, 10)])
  .map((f) => ({
    iso3: AFRICA_NUM_TO_ISO3[parseInt(f.id, 10)]!,
    name: f.properties.name,
    geometry: f.geometry,
    rawId: parseInt(f.id, 10),
  }));

// CFA-only sub-collection — used to FIT the projection.
const cfaFeatures = africaFeatures.filter((f) => CFA_STATES[f.iso3]);
const cfaFC = {
  type: "FeatureCollection",
  features: cfaFeatures.map((f) => ({ type: "Feature", properties: {}, geometry: f.geometry as never })),
} as never;

// Wide, cinematic frame — 16:10 roughly. CFA bounding box is ~1.35:1.
const W = 1600;
const H = 1000;
const PADDING = 24;

const projection = geoEqualEarth().fitSize([W - PADDING * 2, H - PADDING * 2], cfaFC);
projection.translate([
  projection.translate()[0] + PADDING,
  projection.translate()[1] + PADDING,
]);

const path = geoPath(projection);

// Africa backdrop: render every African country as a path with the SAME fill
// and NO stroke. Adjacent polygons abut, producing a visually unified silhouette
// without per-country grey lines (which the maintainer rejected). Cheaper and
// more robust than topojson mergeArcs.
const backdropPaths: { d: string }[] = africaFeatures
  .filter((f) => !CFA_STATES[f.iso3])
  .map((f) => ({
    d: path({ type: "Feature", properties: {}, geometry: f.geometry as never } as never) ?? "",
  }))
  .filter((p) => p.d.length > 0);

interface Country {
  iso3: string;
  name: string;
  d: string;
  zone: "UEMOA" | "CEMAC";
  currency: "XOF" | "XAF";
}

const cfaCountries: Country[] = cfaFeatures.map((f) => {
  const meta = CFA_STATES[f.iso3]!;
  const d = path({ type: "Feature", properties: {}, geometry: f.geometry as never } as never) ?? "";
  return { iso3: f.iso3, name: f.name, d, zone: meta.zone, currency: meta.currency };
});

const payload = {
  viewBox: `0 0 ${W} ${H}`,
  width: W,
  height: H,
  backdropPaths,
  cfaCountries,
};

writeFileSync(OUT, JSON.stringify(payload, null, 0) + "\n", "utf-8");
console.log(`gen-africa-paths: wrote ${cfaCountries.length} CFA paths + ${backdropPaths.length} backdrop paths to ${OUT.replace(ROOT + "/", "")}`);
console.log(`  CFA states found: ${cfaCountries.map((c) => c.iso3).sort().join(", ")}`);
const missing = Object.keys(CFA_STATES).filter((iso) => !cfaCountries.find((c) => c.iso3 === iso));
if (missing.length) {
  console.error(`  WARNING: missing CFA states: ${missing.join(", ")}`);
  process.exit(1);
}
