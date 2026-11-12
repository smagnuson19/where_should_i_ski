import { EnsoPhase, EnsoWaterYear } from "@/types/snotel";
import { PhaseRecord, YearRange } from "@/types/snotel-range";

/** Phases backed by fewer winters than this are flagged as low confidence. */
export const LOW_CONFIDENCE_WINTERS = 5;

export const PHASE_LABEL: Record<EnsoPhase, string> = {
  el_nino: "El Niño",
  la_nina: "La Niña",
  neutral: "Neutral",
};

export const PHASE_STYLE: Record<EnsoPhase, { text: string; chip: string; active: string }> = {
  el_nino: {
    text: "text-orange-300",
    chip: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    active: "bg-orange-500 text-white border-orange-400",
  },
  la_nina: {
    text: "text-sky-300",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    active: "bg-sky-500 text-white border-sky-400",
  },
  neutral: {
    text: "text-slate-200",
    chip: "bg-slate-500/15 text-slate-200 border-slate-500/40",
    active: "bg-slate-500 text-white border-slate-400",
  },
};

export function yearRangePresets(first: number, last: number) {
  return [
    { id: "all", label: "All years", range: { start: first, end: last } },
    { id: "1981", label: "Since 1981", range: { start: Math.max(first, 1981), end: last } },
    { id: "1991", label: "Since 1991", range: { start: Math.max(first, 1991), end: last } },
    { id: "last20", label: "Last 20 winters", range: { start: Math.max(first, last - 19), end: last } },
  ];
}

export function inRange(wy: number, range: YearRange): boolean {
  return wy >= range.start && wy <= range.end;
}

/** Water year 1991 is the 1990–91 winter, so a range reads as "1990–91 through 2025–26". */
export function winterSpan(range: YearRange): string {
  const label = (wy: number) => `${wy - 1}–${String(wy).slice(2)}`;
  return `${label(range.start)} through ${label(range.end)}`;
}

export function countPhaseWinters(
  ensoByWaterYear: Record<string, EnsoWaterYear>,
  range: YearRange
): PhaseRecord<number> & { total: number } {
  const counts = { el_nino: 0, la_nina: 0, neutral: 0, total: 0 };
  for (const enso of Object.values(ensoByWaterYear)) {
    if (!inRange(enso.waterYear, range)) continue;
    counts[enso.phase] += 1;
    counts.total += 1;
  }
  return counts;
}
