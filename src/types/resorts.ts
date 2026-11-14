import { EnsoPhase } from "@/types/snotel";
import { PhaseRecord, YearRange } from "@/types/snotel-range";

export type SnowfallSource = "ghcn" | "snotel_depth" | "amedas";
export type ResortMatch = "nearby" | "distant" | "none";

export interface ResortStationLink {
  id: string;
  source: SnowfallSource;
  name: string;
  distanceKm: number;
  elevGapM: number;
}

export interface SkiResort {
  id: string;
  openskimapId?: string;
  name: string;
  nameJa: string | null;
  country: "US" | "Japan";
  state: string;
  lat: number;
  lon: number;
  baseM: number;
  summitM: number;
  verticalM: number;
  liftCount: number;
  website: string | null;
  wikidataId?: string | null;
  region: string | null;
  match: ResortMatch;
  stations: ResortStationLink[];
}

export interface ResortsFile {
  generatedAt?: string;
  source: string;
  resorts: SkiResort[];
}

export interface SnowfallStationMeta {
  id: string;
  source: SnowfallSource;
  name: string;
  nameKana?: string;
  lat: number;
  lon: number;
  elevationFt?: number;
  elevationM?: number;
  precNo?: string;
  blockNo?: string;
}

/**
 * Compact histories keyed by station id.
 * US columns: wy, seasonSnowIn, max24hIn, days6in, days12in, maxDepthIn
 * Japan columns: winterEndYear, seasonSnowfallCm, max1dSnowCm, maxDepthCm, tempDjfC
 */
export interface SnowfallHistoryFile {
  generatedAt?: string;
  source: string;
  columns: string[];
  stations: SnowfallStationMeta[];
  histories: Record<string, (number | null)[][]>;
  /** Japan only: winterEndYear -> phase */
  ensoPhases?: Record<string, EnsoPhase>;
}

export interface SnowfallStationStats {
  id: string;
  winters: number;
  typicalSnow: number | null;
  phasePct: PhaseRecord<number | null>;
  phaseWinters: PhaseRecord<number>;
  /** year -> season snowfall as % of in-range median */
  pctByYear: Map<number, number>;
  snowByYear: Map<number, number>;
  max24ByYear: Map<number, number>;
  stormDaysByYear: Map<number, number>;
}

export interface ResortPhaseSignal {
  pctOfTypical: number | null;
  winters: number;
  lowConfidence: boolean;
  medianSnow: number | null;
}

export interface ResortYearRecord {
  year: number;
  label: string;
  phase: EnsoPhase;
  snow: number | null;
  pctOfTypical: number | null;
  max24h: number | null;
  stormDays: number | null;
}

export interface ResortSnowfallStats {
  resortId: string;
  winters: number;
  typicalSnow: number | null;
  unit: "in" | "cm";
  phases: PhaseRecord<ResortPhaseSignal>;
  years: ResortYearRecord[];
  match: ResortMatch;
  sourceLabel: string;
}

export type { YearRange };
