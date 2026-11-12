import { EnsoPhase } from "@/types/snotel";

export const ENSO_PHASES: EnsoPhase[] = ["el_nino", "la_nina", "neutral"];

export type PhaseRecord<T> = Record<EnsoPhase, T>;

export interface YearRange {
  start: number;
  end: number;
}

export interface MonthlyByYearFile {
  source: string;
  months: number[];
  layout: string;
  /** series[region][elevBand][waterYear] = 12 SWE + 12 snow depth + 12 temperature values (Oct..Sep) */
  series: Record<string, Record<string, Record<string, (number | null)[]>>>;
}

/** One station's numbers recomputed for the selected water-year range. */
export interface StationRangeStats {
  triplet: string;
  winters: number;
  medianPeakSwe: number | null;
  phasePct: PhaseRecord<number | null>;
  phaseWinters: PhaseRecord<number>;
  winterTavg: number | null;
  /** waterYear -> peak SWE as % of this station's in-range median */
  pctByYear: Map<number, number>;
  tavgByYear: Map<number, number>;
}

/** One water year of a region/elevation-band aggregate within the selected range. */
export interface RangeYearRecord {
  waterYear: number;
  label: string;
  phase: EnsoPhase;
  oni: number;
  stationCount: number;
  pctOfMedian: number | null;
  winterTavg: number | null;
}

export interface PhaseSignal {
  pctOfMedian: number | null;
  winters: number;
  winterTavg: number | null;
  lowConfidence: boolean;
}

/** Region (or ALL) summary for one elevation band within the selected range. */
export interface RegionRangeSummary {
  regionId: string;
  siteCount: number;
  typicalPeakSwe: number | null;
  winterTavg: number | null;
  phases: PhaseRecord<PhaseSignal>;
  years: RangeYearRecord[];
}
