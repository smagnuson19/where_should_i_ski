import { EnsoPhase, EnsoWaterYear, SnotelStation, StationHistoriesFile } from "@/types/snotel";
import {
  ENSO_PHASES,
  PhaseRecord,
  PhaseSignal,
  RangeYearRecord,
  RegionRangeSummary,
  StationRangeStats,
  YearRange,
} from "@/types/snotel-range";
import { isNum, mean, median, round } from "@/lib/snotel/stats";
import { inRange, LOW_CONFIDENCE_WINTERS } from "@/lib/snotel/year-range";

/** Sites whose typical peak SWE is under an inch have no meaningful % of median (same rule as the ingest). */
const MIN_BASELINE_SWE = 1.0;

function phaseRecord<T>(make: () => T): PhaseRecord<T> {
  return { el_nino: make(), la_nina: make(), neutral: make() };
}

export function computeStationRangeStats(
  stations: SnotelStation[],
  histories: StationHistoriesFile,
  ensoByWaterYear: Record<string, EnsoWaterYear>,
  range: YearRange
): Map<string, StationRangeStats> {
  const cWy = histories.columns.indexOf("wy");
  const cPeak = histories.columns.indexOf("peakSwe");
  const cTavg = histories.columns.indexOf("winterTavg");
  const out = new Map<string, StationRangeStats>();

  for (const st of stations) {
    const peaks: { wy: number; phase: EnsoPhase; swe: number }[] = [];
    const tavgByYear = new Map<number, number>();
    for (const row of histories.histories[st.triplet] || []) {
      const wy = row[cWy];
      if (!isNum(wy) || !inRange(wy, range)) continue;
      const enso = ensoByWaterYear[String(wy)];
      if (!enso) continue;
      const swe = row[cPeak];
      if (isNum(swe)) peaks.push({ wy, phase: enso.phase, swe });
      const t = row[cTavg];
      if (isNum(t)) tavgByYear.set(wy, t);
    }

    const positive = peaks.filter((p) => p.swe > 0).map((p) => p.swe);
    const baseline = median(positive.length ? positive : peaks.map((p) => p.swe));
    const usableBaseline = baseline !== null && baseline > MIN_BASELINE_SWE ? baseline : null;
    const pctByYear = new Map<number, number>();
    if (usableBaseline) {
      for (const p of peaks) pctByYear.set(p.wy, (p.swe / usableBaseline) * 100);
    }

    const phasePct = phaseRecord<number | null>(() => null);
    const phaseWinters = phaseRecord(() => 0);
    for (const phase of ENSO_PHASES) {
      const phasePeaks = peaks.filter((p) => p.phase === phase).map((p) => p.swe);
      const phaseMedian = median(phasePeaks);
      phaseWinters[phase] = phasePeaks.length;
      phasePct[phase] =
        usableBaseline && phaseMedian !== null ? round((phaseMedian / usableBaseline) * 100, 0) : null;
    }

    out.set(st.triplet, {
      triplet: st.triplet,
      winters: peaks.length,
      medianPeakSwe: round(baseline),
      phasePct,
      phaseWinters,
      winterTavg: round(mean([...tavgByYear.values()])),
      pctByYear,
      tavgByYear,
    });
  }
  return out;
}

/**
 * Region-wide winter index: for each water year, the median across member sites of
 * (that winter's peak SWE / the site's own median peak SWE in the selected years).
 * A phase's value is the median of that index over the phase's winters.
 */
export function summarizeRegion(
  regionId: string,
  elevBand: string,
  stations: SnotelStation[],
  stationStats: Map<string, StationRangeStats>,
  ensoByWaterYear: Record<string, EnsoWaterYear>,
  range: YearRange
): RegionRangeSummary {
  const members = stations
    .filter(
      (st) =>
        (regionId === "ALL" || st.region === regionId) &&
        (elevBand === "ALL" || st.elevBand === elevBand)
    )
    .map((st) => stationStats.get(st.triplet))
    .filter((s): s is StationRangeStats => !!s && s.winters > 0);

  const years: RangeYearRecord[] = [];
  for (let wy = range.start; wy <= range.end; wy++) {
    const enso = ensoByWaterYear[String(wy)];
    if (!enso) continue;
    const pcts: number[] = [];
    const temps: number[] = [];
    for (const s of members) {
      const p = s.pctByYear.get(wy);
      if (p !== undefined && p > 0 && p < 400) pcts.push(p);
      const t = s.tavgByYear.get(wy);
      if (t !== undefined) temps.push(t);
    }
    if (!pcts.length && !temps.length) continue;
    years.push({
      waterYear: wy,
      label: enso.label,
      phase: enso.phase,
      oni: enso.oniWinterMean,
      stationCount: pcts.length,
      pctOfMedian: round(median(pcts), 0),
      winterTavg: round(mean(temps)),
    });
  }

  const phases = phaseRecord<PhaseSignal>(() => ({
    pctOfMedian: null,
    winters: 0,
    winterTavg: null,
    lowConfidence: true,
  }));
  for (const phase of ENSO_PHASES) {
    const phaseYears = years.filter((y) => y.phase === phase);
    const pcts = phaseYears.map((y) => y.pctOfMedian).filter(isNum);
    phases[phase] = {
      pctOfMedian: round(median(pcts), 0),
      winters: pcts.length,
      winterTavg: round(mean(phaseYears.map((y) => y.winterTavg).filter(isNum))),
      lowConfidence: pcts.length < LOW_CONFIDENCE_WINTERS,
    };
  }

  return {
    regionId,
    siteCount: members.length,
    typicalPeakSwe: round(median(members.map((s) => s.medianPeakSwe).filter(isNum))),
    winterTavg: round(mean(members.map((s) => s.winterTavg).filter(isNum))),
    phases,
    years,
  };
}

export function summarizeRegions(
  regionIds: string[],
  elevBand: string,
  stations: SnotelStation[],
  stationStats: Map<string, StationRangeStats>,
  ensoByWaterYear: Record<string, EnsoWaterYear>,
  range: YearRange
): Record<string, RegionRangeSummary> {
  const out: Record<string, RegionRangeSummary> = {};
  for (const id of ["ALL", ...regionIds]) {
    out[id] = summarizeRegion(id, elevBand, stations, stationStats, ensoByWaterYear, range);
  }
  return out;
}
