import { EnsoPhase, EnsoWaterYear } from "@/types/snotel";
import { ENSO_PHASES, PhaseRecord, YearRange } from "@/types/snotel-range";
import {
  ResortMatch,
  ResortSnowfallStats,
  ResortYearRecord,
  SkiResort,
  SnowfallHistoryFile,
  SnowfallStationStats,
  SnowfallSource,
} from "@/types/resorts";
import { isNum, mean, median, round } from "@/lib/snotel/stats";
import { inRange, LOW_CONFIDENCE_WINTERS } from "@/lib/snotel/year-range";

const MIN_BASELINE = 1.0;

function phaseRecord<T>(make: () => T): PhaseRecord<T> {
  return { el_nino: make(), la_nina: make(), neutral: make() };
}

export function sourceLabel(sources: SnowfallSource[]): string {
  if (sources.includes("ghcn")) return "measured snowfall";
  if (sources.includes("amedas")) return "measured snowfall";
  if (sources.includes("snotel_depth")) return "estimated from snow depth";
  return "no nearby station";
}

/**
 * Shared helper: given per-year % of typical for a set of members, build phase signals.
 * Same rule regions and resorts use — median across members per year, then median per phase.
 */
export function summarizePctByPhase(
  years: { year: number; phase: EnsoPhase; pcts: number[] }[]
): PhaseRecord<{ pctOfTypical: number | null; winters: number; lowConfidence: boolean }> {
  const phases = phaseRecord(() => ({
    pctOfTypical: null as number | null,
    winters: 0,
    lowConfidence: true,
  }));
  for (const phase of ENSO_PHASES) {
    const phaseYears = years.filter((y) => y.phase === phase);
    const pcts = phaseYears
      .map((y) => median(y.pcts.filter((p) => p > 0 && p < 400)))
      .filter(isNum);
    phases[phase] = {
      pctOfTypical: round(median(pcts), 0),
      winters: pcts.length,
      lowConfidence: pcts.length < LOW_CONFIDENCE_WINTERS,
    };
  }
  return phases;
}

function colIndex(columns: string[], ...names: string[]): number {
  for (const n of names) {
    const i = columns.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
}

export function computeSnowfallStationStats(
  file: SnowfallHistoryFile,
  phaseByYear: Record<string, EnsoPhase | EnsoWaterYear>,
  range: YearRange,
  unit: "in" | "cm"
): Map<string, SnowfallStationStats> {
  const cYear = colIndex(file.columns, "wy", "winterEndYear");
  const cSnow = colIndex(file.columns, "seasonSnowIn", "seasonSnowfallCm");
  const cMax = colIndex(file.columns, "max24hIn", "max1dSnowCm");
  const cStorm = colIndex(file.columns, "days6in", "days_ge_20cm");
  // Japan has no days6in — use max1d as storm proxy isn't right; leave storm optional
  const out = new Map<string, SnowfallStationStats>();

  for (const meta of file.stations) {
    const rows = file.histories[meta.id] || [];
    const snows: { year: number; phase: EnsoPhase; snow: number; max24: number | null; storm: number | null }[] = [];

    for (const row of rows) {
      const year = row[cYear];
      if (!isNum(year) || !inRange(year, range)) continue;
      const phaseRaw = phaseByYear[String(year)];
      if (!phaseRaw) continue;
      const phase: EnsoPhase =
        typeof phaseRaw === "string" ? phaseRaw : phaseRaw.phase;
      const snow = row[cSnow];
      if (!isNum(snow) || snow < 0) continue;
      const max24 = cMax >= 0 && isNum(row[cMax]) ? row[cMax] : null;
      const storm = cStorm >= 0 && isNum(row[cStorm]) ? row[cStorm] : null;
      snows.push({ year, phase, snow, max24, storm });
    }

    const positive = snows.filter((s) => s.snow > 0).map((s) => s.snow);
    const baseline = median(positive.length ? positive : snows.map((s) => s.snow));
    const usable = baseline !== null && baseline > MIN_BASELINE ? baseline : null;

    const pctByYear = new Map<number, number>();
    const snowByYear = new Map<number, number>();
    const max24ByYear = new Map<number, number>();
    const stormDaysByYear = new Map<number, number>();
    if (usable) {
      for (const s of snows) {
        pctByYear.set(s.year, (s.snow / usable) * 100);
        snowByYear.set(s.year, s.snow);
        if (s.max24 !== null) max24ByYear.set(s.year, s.max24);
        if (s.storm !== null) stormDaysByYear.set(s.year, s.storm);
      }
    }

    const phasePct = phaseRecord<number | null>(() => null);
    const phaseWinters = phaseRecord(() => 0);
    for (const phase of ENSO_PHASES) {
      const phaseSnow = snows.filter((s) => s.phase === phase).map((s) => s.snow);
      const phaseMedian = median(phaseSnow);
      phaseWinters[phase] = phaseSnow.length;
      phasePct[phase] =
        usable && phaseMedian !== null ? round((phaseMedian / usable) * 100, 0) : null;
    }

    out.set(meta.id, {
      id: meta.id,
      winters: snows.length,
      typicalSnow: round(baseline, unit === "in" ? 0 : 0),
      phasePct,
      phaseWinters,
      pctByYear,
      snowByYear,
      max24ByYear,
      stormDaysByYear,
    });
  }
  return out;
}

export function computeResortSnowfallStats(
  resorts: SkiResort[],
  stationStats: Map<string, SnowfallStationStats>,
  phaseByYear: Record<string, EnsoPhase | EnsoWaterYear>,
  range: YearRange,
  unit: "in" | "cm"
): Map<string, ResortSnowfallStats> {
  const out = new Map<string, ResortSnowfallStats>();

  for (const resort of resorts) {
    const members = resort.stations
      .map((s) => stationStats.get(s.id))
      .filter((s): s is SnowfallStationStats => !!s && s.winters > 0);

    const sources = resort.stations.map((s) => s.source);
    const years: ResortYearRecord[] = [];

    for (let y = range.start; y <= range.end; y++) {
      const phaseRaw = phaseByYear[String(y)];
      if (!phaseRaw) continue;
      const phase: EnsoPhase = typeof phaseRaw === "string" ? phaseRaw : phaseRaw.phase;
      const label =
        typeof phaseRaw === "string"
          ? `${y - 1}–${String(y).slice(2)}`
          : phaseRaw.label;

      const pcts: number[] = [];
      const snows: number[] = [];
      const maxes: number[] = [];
      const storms: number[] = [];
      for (const m of members) {
        const p = m.pctByYear.get(y);
        if (p !== undefined && p > 0 && p < 400) pcts.push(p);
        const s = m.snowByYear.get(y);
        if (s !== undefined) snows.push(s);
        const mx = m.max24ByYear.get(y);
        if (mx !== undefined) maxes.push(mx);
        const st = m.stormDaysByYear.get(y);
        if (st !== undefined) storms.push(st);
      }
      if (!pcts.length && !snows.length) continue;
      years.push({
        year: y,
        label,
        phase,
        snow: round(median(snows), unit === "in" ? 0 : 0),
        pctOfTypical: round(median(pcts), 0),
        max24h: round(median(maxes), 1),
        stormDays: round(mean(storms), 1),
      });
    }

    const phaseSignals = summarizePctByPhase(
      years.map((y) => ({
        year: y.year,
        phase: y.phase,
        pcts: y.pctOfTypical !== null ? [y.pctOfTypical] : [],
      }))
    );

    const phases = phaseRecord<ResortSnowfallStats["phases"]["el_nino"]>(() => ({
      pctOfTypical: null,
      winters: 0,
      lowConfidence: true,
      medianSnow: null,
    }));
    for (const phase of ENSO_PHASES) {
      const phaseYears = years.filter((y) => y.phase === phase);
      const snows = phaseYears.map((y) => y.snow).filter(isNum);
      phases[phase] = {
        ...phaseSignals[phase],
        medianSnow: round(median(snows), 0),
      };
    }

    const typical = median(members.map((m) => m.typicalSnow).filter(isNum));

    out.set(resort.id, {
      resortId: resort.id,
      winters: years.length,
      typicalSnow: round(typical, 0),
      unit,
      phases,
      years,
      match: resort.match as ResortMatch,
      sourceLabel: sourceLabel(sources),
    });
  }
  return out;
}

/** Build phase-by-year map from SNOTEL core ENSO records. */
export function phaseMapFromEnso(
  ensoByWaterYear: Record<string, EnsoWaterYear>
): Record<string, EnsoWaterYear> {
  return ensoByWaterYear;
}

/** Build phase-by-year map from AMeDAS file's ensoPhases. */
export function phaseMapFromAmedas(file: SnowfallHistoryFile): Record<string, EnsoPhase> {
  return (file.ensoPhases || {}) as Record<string, EnsoPhase>;
}
