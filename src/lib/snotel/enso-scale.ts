/** Diverging snowpack scale: browns for below-typical winters, blues for above-typical. */
export const PCT_BINS = [
  { max: 85, color: "#b45309", label: "Under 85%", meaning: "Much less snow than typical" },
  { max: 95, color: "#fbbf24", label: "85–95%", meaning: "Less snow than typical" },
  { max: 105, color: "#94a3b8", label: "95–105%", meaning: "About typical" },
  { max: 115, color: "#7dd3fc", label: "105–115%", meaning: "More snow than typical" },
  { max: Infinity, color: "#2563eb", label: "Over 115%", meaning: "Much more snow than typical" },
] as const;

export const NO_DATA_COLOR = "#1e293b";
export const OUTSIDE_NETWORK_COLOR = "#0f172a";

export function pctColor(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return NO_DATA_COLOR;
  return (PCT_BINS.find((b) => pct < b.max) ?? PCT_BINS[PCT_BINS.length - 1]).color;
}

export function pctMeaning(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return "Not enough data";
  return (PCT_BINS.find((b) => pct < b.max) ?? PCT_BINS[PCT_BINS.length - 1]).meaning;
}

export function formatPct(pct: number | null | undefined): string {
  return pct === null || pct === undefined || !Number.isFinite(pct) ? "–" : `${Math.round(pct)}%`;
}
