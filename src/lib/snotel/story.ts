import { EnsoPhase, RegionInfo } from "@/types/snotel";
import { RegionRangeSummary } from "@/types/snotel-range";

export interface RankedRegion {
  regionId: string;
  name: string;
  pct: number | null;
  winters: number;
  lowConfidence: boolean;
}

export function rankRegions(
  summaries: Record<string, RegionRangeSummary>,
  regions: Record<string, RegionInfo>,
  phase: EnsoPhase
): RankedRegion[] {
  return Object.keys(regions)
    .map((id) => {
      const signal = summaries[id]?.phases[phase];
      return {
        regionId: id,
        name: regions[id].shortName,
        pct: signal?.pctOfMedian ?? null,
        winters: signal?.winters ?? 0,
        lowConfidence: signal?.lowConfidence ?? true,
      };
    })
    .sort((a, b) => (b.pct ?? -Infinity) - (a.pct ?? -Infinity));
}

export function bestAndWorst(ranked: RankedRegion[]) {
  const withData = ranked.filter((r) => r.pct !== null);
  return {
    best: withData[0] ?? null,
    worst: withData.length > 1 ? withData[withData.length - 1] : null,
    spread:
      withData.length > 1 ? (withData[0].pct ?? 0) - (withData[withData.length - 1].pct ?? 0) : 0,
  };
}

/** Plain-language reason each phase tilts the odds; kept short enough to read at a glance. */
export const PHASE_WHY: Record<EnsoPhase, string> = {
  el_nino:
    "Warm water in the tropical Pacific strengthens the jet stream and pulls it south. Storms get steered into California and the Southwest, while the Pacific Northwest and Northern Rockies sit north of the storm track in milder, drier air.",
  la_nina:
    "Cooler tropical Pacific water lets the jet stream bend north. Storms aim at the Pacific Northwest and Northern Rockies with cold air that keeps snow levels low, while the Southwest sits under drier high pressure.",
  neutral:
    "With no strong push from the tropical Pacific, the storm track wanders from one winter to the next. Results stay closer to typical everywhere, so local weather luck matters more than the ENSO forecast.",
};

export const HINGE_NOTE =
  "The middle of the West (Sierra, Great Basin and Colorado) sits near the hinge between the two patterns, so its signal is weaker and can flip from one winter to the next.";

export function skierTip(phase: EnsoPhase, ranked: RankedRegion[]): string {
  const { best, worst, spread } = bestAndWorst(ranked);
  if (!best) return "Not enough data in this selection.";
  if (spread <= 10) {
    return "No single region stands out: every region stays within a few percent of its typical winter snowpack.";
  }
  const runnerUp = ranked.find((r) => r.pct !== null && r.regionId !== best.regionId && (r.pct ?? 0) >= 100);
  const bestText = runnerUp ? `${best.name} and ${runnerUp.name}` : best.name;
  const phaseWord = phase === "el_nino" ? "an El Niño" : phase === "la_nina" ? "a La Niña" : "a neutral";
  return `In ${phaseWord} winter, historical odds favor ${bestText}, while ${worst?.name ?? "the lowest-ranked region"} is the riskiest bet.`;
}
