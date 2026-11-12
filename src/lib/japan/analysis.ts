import { EnsoPhase } from "@/types/snotel";
import { ENSO_PHASES, PhaseRecord, YearRange } from "@/types/snotel-range";
import { JmaEnsoDataset, MonthlySnow } from "@/types/japan-enso";
import { RankedRegion } from "@/lib/snotel/story";
import { isNum, mean, median, round } from "@/lib/snotel/stats";
import { inRange, LOW_CONFIDENCE_WINTERS } from "@/lib/snotel/year-range";
import { FROM_JMA_PHASE, JAPAN_REGIONS } from "@/lib/japan/regions";

export const SNOW_MONTHS: (keyof MonthlySnow)[] = ["Nov", "Dec", "Jan", "Feb", "Mar"];

export interface JapanWinter {
  endYear: number;
  label: string;
  phase: EnsoPhase;
  snowfallCm: number;
  pctOfTypical: number | null;
  tempDjfC: number;
}

export interface JapanPhaseSignal {
  pctOfTypical: number | null;
  winters: number;
  lowConfidence: boolean;
  medianCm: number | null;
  tempDjfC: number | null;
  snowDays3cm: number | null;
  bigSnowDays20cm: number | null;
  biggestDayCm: number | null;
  monthlyCm: Record<keyof MonthlySnow, number | null>;
}

export interface JapanRegionSummary {
  regionId: string;
  stationCount: number;
  typicalCm: number | null;
  tempDjfC: number | null;
  bigSnowDays20cm: number | null;
  allWintersMonthlyCm: Record<keyof MonthlySnow, number | null>;
  phases: PhaseRecord<JapanPhaseSignal>;
  winters: JapanWinter[];
}

export interface JapanAnalysis {
  summaries: Record<string, JapanRegionSummary>;
  /** Median across the eight regions of each winter's % of typical, then the median over each phase's winters. */
  nationalPct: PhaseRecord<number | null>;
  phaseCounts: PhaseRecord<number> & { total: number };
}

type WinterEntry = JmaEnsoDataset["historical_winters"][number]["regions"][string];

function monthlyMeans(entries: WinterEntry[]): Record<keyof MonthlySnow, number | null> {
  return Object.fromEntries(
    SNOW_MONTHS.map((m) => [m, round(mean(entries.map((e) => e.monthly_snow_cm[m]).filter(isNum)))])
  ) as Record<keyof MonthlySnow, number | null>;
}

/**
 * Same method as the US view: each winter's season snowfall is compared with the region's median
 * winter in the selected years, and a phase's value is the median over that phase's winters.
 */
export function analyzeJapan(dataset: JmaEnsoDataset, range: YearRange): JapanAnalysis {
  const winters = dataset.historical_winters.filter((w) => inRange(w.winter_end_year, range));
  const phaseCounts = { el_nino: 0, la_nina: 0, neutral: 0, total: winters.length };
  for (const w of winters) phaseCounts[FROM_JMA_PHASE[w.enso_phase]] += 1;

  const summaries: Record<string, JapanRegionSummary> = {};
  for (const info of JAPAN_REGIONS) {
    const region = dataset.regions.find((r) => r.region_id === info.id);
    const rows = winters.flatMap((w) => {
      const entry = w.regions[info.id];
      return entry && isNum(entry.snowfall_cm) ? [{ w, entry }] : [];
    });
    const typicalCm = median(rows.map((r) => r.entry.snowfall_cm));
    const regionWinters: JapanWinter[] = rows.map(({ w, entry }) => ({
      endYear: w.winter_end_year,
      label: w.winter_label,
      phase: FROM_JMA_PHASE[w.enso_phase],
      snowfallCm: entry.snowfall_cm,
      pctOfTypical: typicalCm ? round((entry.snowfall_cm / typicalCm) * 100, 0) : null,
      tempDjfC: entry.temp_djf_c,
    }));

    const phases = {} as PhaseRecord<JapanPhaseSignal>;
    for (const phase of ENSO_PHASES) {
      const entries = rows.filter((r) => FROM_JMA_PHASE[r.w.enso_phase] === phase).map((r) => r.entry);
      const medianCm = median(entries.map((e) => e.snowfall_cm));
      phases[phase] = {
        pctOfTypical: typicalCm && medianCm !== null ? round((medianCm / typicalCm) * 100, 0) : null,
        winters: entries.length,
        lowConfidence: entries.length < LOW_CONFIDENCE_WINTERS,
        medianCm: round(medianCm, 0),
        tempDjfC: round(mean(entries.map((e) => e.temp_djf_c).filter(isNum))),
        snowDays3cm: round(mean(entries.map((e) => e.days_ge_3cm).filter(isNum))),
        bigSnowDays20cm: round(mean(entries.map((e) => e.days_ge_20cm).filter(isNum))),
        biggestDayCm: round(median(entries.map((e) => e.max_1d_snow_cm).filter(isNum)), 0),
        monthlyCm: monthlyMeans(entries),
      };
    }

    summaries[info.id] = {
      regionId: info.id,
      stationCount: region?.station_ids.length ?? 0,
      typicalCm: round(typicalCm, 0),
      tempDjfC: round(mean(rows.map((r) => r.entry.temp_djf_c).filter(isNum))),
      bigSnowDays20cm: round(mean(rows.map((r) => r.entry.days_ge_20cm).filter(isNum))),
      allWintersMonthlyCm: monthlyMeans(rows.map((r) => r.entry)),
      phases,
      winters: regionWinters,
    };
  }

  const nationalByWinter = winters.map((w) => ({
    phase: FROM_JMA_PHASE[w.enso_phase],
    pct: median(
      JAPAN_REGIONS.map(
        (r) => summaries[r.id].winters.find((x) => x.endYear === w.winter_end_year)?.pctOfTypical
      ).filter(isNum)
    ),
  }));
  const nationalPct = Object.fromEntries(
    ENSO_PHASES.map((p) => [
      p,
      round(median(nationalByWinter.filter((x) => x.phase === p).map((x) => x.pct).filter(isNum)), 0),
    ])
  ) as PhaseRecord<number | null>;

  return { summaries, nationalPct, phaseCounts };
}

export function rankJapanRegions(summaries: Record<string, JapanRegionSummary>, phase: EnsoPhase): RankedRegion[] {
  return JAPAN_REGIONS.map((r) => {
    const signal = summaries[r.id]?.phases[phase];
    return {
      regionId: r.id,
      name: r.shortName,
      pct: signal?.pctOfTypical ?? null,
      winters: signal?.winters ?? 0,
      lowConfidence: signal?.lowConfidence ?? true,
    };
  }).sort((a, b) => (b.pct ?? -Infinity) - (a.pct ?? -Infinity));
}
