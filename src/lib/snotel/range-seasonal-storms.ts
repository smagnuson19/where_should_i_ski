import {
  BenchmarkStormStation,
  EnsoPhase,
  EnsoWaterYear,
  SeasonalMonthPoint,
  StormSummaryMetrics,
} from "@/types/snotel";
import { ENSO_PHASES, MonthlyByYearFile, YearRange } from "@/types/snotel-range";
import { isNum, mean, median, percentile, round } from "@/lib/snotel/stats";
import { inRange } from "@/lib/snotel/year-range";

const MONTH_LABELS: Record<number, string> = {
  10: "Oct", 11: "Nov", 12: "Dec", 1: "Jan", 2: "Feb", 3: "Mar",
  4: "Apr", 5: "May", 6: "Jun", 7: "Jul", 8: "Aug", 9: "Sep",
};

/** Seasonal SWE / snow depth / temperature curves rebuilt from per-water-year monthly regional medians. */
export function seasonalCycleForRange(
  file: MonthlyByYearFile,
  regionId: string,
  elevBand: string,
  ensoByWaterYear: Record<string, EnsoWaterYear>,
  range: YearRange
): SeasonalMonthPoint[] | null {
  const byYear = file.series[regionId]?.[elevBand];
  if (!byYear) return null;
  const rows = Object.entries(byYear)
    .map(([wy, values]) => ({ phase: ensoByWaterYear[wy]?.phase, wy: Number(wy), values }))
    .filter((r) => r.phase && inRange(r.wy, range));
  if (!rows.length) return null;

  return file.months.map((month, i) => {
    const pick = (offset: number, phase?: EnsoPhase) =>
      rows
        .filter((r) => !phase || r.phase === phase)
        .map((r) => r.values[offset + i])
        .filter(isNum);
    const swe = pick(0);
    return {
      month,
      monthLabel: MONTH_LABELS[month],
      sweMedian: round(median(swe)),
      sweElNino: round(median(pick(0, "el_nino"))),
      sweLaNina: round(median(pick(0, "la_nina"))),
      sweNeutral: round(median(pick(0, "neutral"))),
      sweP25: round(percentile(swe, 0.25)),
      sweP75: round(percentile(swe, 0.75)),
      snwdMedian: round(median(pick(12)), 0),
      snwdElNino: round(median(pick(12, "el_nino")), 0),
      snwdLaNina: round(median(pick(12, "la_nina")), 0),
      tavgMedian: round(mean(pick(24))),
      tavgElNino: round(mean(pick(24, "el_nino"))),
      tavgLaNina: round(mean(pick(24, "la_nina"))),
    };
  });
}

const STORM_METRICS = [
  "events2in",
  "events6in",
  "events12in",
  "sweEvents05in",
  "sweEvents1in",
  "max24hSnow",
  "max24hSwe",
  "totalDailySnowIn",
  "subfreezingDays",
  "extremeColdDays",
  "avgStormTempF",
  "avgWinterTempF",
] as const;

/** Daily storm statistics averaged over benchmark station-winters inside the selected range. */
export function stormSummaryForRange(
  benchmarks: BenchmarkStormStation[],
  regionIds: string[],
  range: YearRange
): Record<string, Record<string, StormSummaryMetrics>> {
  const out: Record<string, Record<string, StormSummaryMetrics>> = {};
  for (const regionId of ["ALL", ...regionIds]) {
    const records = benchmarks
      .filter((b) => regionId === "ALL" || b.region === regionId)
      .flatMap((b) => b.waterYears.filter((w) => inRange(w.wy, range)));
    out[regionId] = {};
    for (const key of ["all", ...ENSO_PHASES]) {
      const subset = key === "all" ? records : records.filter((r) => r.phase === key);
      const metrics = { sampleStationYears: subset.length } as StormSummaryMetrics;
      for (const metric of STORM_METRICS) {
        metrics[metric] = round(mean(subset.map((r) => r[metric]).filter(isNum)), 2);
      }
      out[regionId][key] = metrics;
    }
  }
  return out;
}
