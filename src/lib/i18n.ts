import fr from "../i18n/fr.json";
import en from "../i18n/en.json";

export type Locale = "fr" | "en";
const dictionaries = { fr, en } as const;

export function t(locale: Locale, key: string): string {
  const dict = dictionaries[locale] as Record<string, unknown>;
  const parts = key.split(".");
  let v: unknown = dict;
  for (const p of parts) {
    if (v && typeof v === "object" && p in (v as Record<string, unknown>)) {
      v = (v as Record<string, unknown>)[p];
    } else { return key; }
  }
  return typeof v === "string" ? v : key;
}

export function otherLocale(l: Locale): Locale { return l === "fr" ? "en" : "fr"; }

export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === "fr") return clean === "/" ? "/" : clean;
  return `/en${clean === "/" ? "" : clean}`;
}
