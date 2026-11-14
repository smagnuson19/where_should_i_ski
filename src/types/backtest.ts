export type BacktestLead = 0 | 1 | 3 | 5;
/** What the leaderboard ranks on. */
export type BacktestMetricMode = "snowfall" | "water" | "temperature";

export interface BacktestModelMeta {
  id: string;
  label: string;
  resolution: string;
  leads: number[];
  hasSnowDepth: boolean;
  notes: string;
  snowLeads?: number[];
  tempLeads?: number[];
}

export interface BacktestStationMeta {
  triplet: string;
  name: string;
  state: string;
  region: string;
  lat: number;
  lon: number;
  elevation: number;
  elevationM: number;
  nearResort: string;
  nearResortVerticalM: number;
  distanceKm: number;
}

export interface BacktestRegionMeta {
  id: string;
  label: string;
}

export interface BacktestMethodology {
  winterMonths: string;
  leads: number[];
  sweNoiseIn: number;
  sweMaxGainIn: number;
  powderThresholdSweIn?: number;
  powderThresholdSnowIn?: number;
  /** @deprecated use powderThresholdSweIn */
  powderThresholdIn?: number;
  snowNoiseIn?: number;
  minCoverage: number;
  snowfallCmToSweIn: number;
  bootstrapN: number;
  truth: string;
  day0Source: string;
  leadSource: string;
  rankingMetric: string;
  notes: string[];
}

export interface LeaderboardRow {
  winter: number;
  lead: number;
  region: string;
  modelId: string;
  rank: number | null;
  tiedForFirst: boolean;
  coverage: number;
  insufficientData?: boolean;
  nDays: number;
  nWetDays: number;
  nSnowDays?: number;
  sweMaeIn: number | null;
  sweBiasPct: number | null;
  obsSweTotalIn: number | null;
  fcstSweTotalIn: number | null;
  snowMaeIn?: number | null;
  snowBiasPct?: number | null;
  obsSnowTotalIn?: number | null;
  fcstSnowTotalIn?: number | null;
  pod: number | null;
  far: number | null;
  csi: number | null;
  snowPod?: number | null;
  snowFar?: number | null;
  snowCsi?: number | null;
  hits: number;
  misses: number;
  falseAlarms: number;
  tmaxMaeF: number | null;
  tminMaeF: number | null;
  tmaxBiasF: number | null;
  tminBiasF: number | null;
  nTempDays: number;
}

export interface PerStationMetric
  extends Omit<LeaderboardRow, "region" | "rank" | "tiedForFirst" | "coverage" | "insufficientData"> {
  triplet: string;
}

export interface LagCheck {
  triplet: string;
  model: string;
  winter: number;
  corr: Record<string, number | null>;
}

export interface BacktestSummary {
  generatedAt: string;
  methodology: BacktestMethodology;
  winters: number[];
  models: BacktestModelMeta[];
  regions: BacktestRegionMeta[];
  stations: BacktestStationMeta[];
  lagChecks: LagCheck[];
  leaderboard: LeaderboardRow[];
  perStation: PerStationMetric[];
  incomplete?: boolean;
}

export interface StationWinterModelLead {
  sweGain: (number | null)[];
  snowIn?: (number | null)[];
  tmax: (number | null)[];
  tmin: (number | null)[];
  snwd: (number | null)[] | null;
}

export interface StationWinterPayload {
  dates: string[];
  obs: {
    sweGain: (number | null)[];
    snwdGain: (number | null)[];
    tmax: (number | null)[];
    tmin: (number | null)[];
    swe: (number | null)[];
  };
  models: Record<string, Record<string, StationWinterModelLead>>;
}

export interface StationBacktestFile {
  triplet: string;
  meta: BacktestStationMeta;
  winters: Record<string, StationWinterPayload>;
}
