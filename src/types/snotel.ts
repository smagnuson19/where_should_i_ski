export type EnsoPhase = "el_nino" | "la_nina" | "neutral";

export interface RegionInfo {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
}

export interface ElevationBandInfo {
  id: string;
  label: string;
  min: number;
  max: number;
}

export interface EnsoWaterYear {
  waterYear: number;
  label: string;
  oniWinterMean: number;
  oniPeak: number;
  phase: EnsoPhase;
  strength: string;
  seasons: Record<string, number>;
}

export interface SeasonalMonthPoint {
  month: number;
  monthLabel: string;
  sweMedian: number | null;
  sweElNino: number | null;
  sweLaNina: number | null;
  sweNeutral: number | null;
  sweP25: number | null;
  sweP75: number | null;
  snwdMedian: number | null;
  snwdElNino: number | null;
  snwdLaNina: number | null;
  tavgMedian: number | null;
  tavgElNino: number | null;
  tavgLaNina: number | null;
}

export interface AnnualRegionRecord {
  waterYear: number;
  label: string;
  phase: EnsoPhase;
  strength: string;
  oni: number;
  oniPeak: number;
  stationCount: number;
  meanPeakSwe: number | null;
  medianPeakSwe: number | null;
  pctOfMedian: number | null;
  meanPeakSnwd: number | null;
  winterTavg: number | null;
  winterTmin: number | null;
  cumSnwdGain: number | null;
  majorPulseMonths: number | null;
}

export interface RegionalBandAggregate {
  seasonalCycle: SeasonalMonthPoint[];
  annualSeries: AnnualRegionRecord[];
}

export interface StormSummaryMetrics {
  sampleStationYears: number;
  events2in: number | null;
  events6in: number | null;
  events12in: number | null;
  sweEvents05in: number | null;
  sweEvents1in: number | null;
  max24hSnow: number | null;
  max24hSwe: number | null;
  totalDailySnowIn: number | null;
  subfreezingDays: number | null;
  extremeColdDays: number | null;
  avgStormTempF: number | null;
  avgWinterTempF: number | null;
}

export interface BenchmarkStormWaterYear {
  wy: number;
  phase: EnsoPhase;
  oni: number;
  events2in: number;
  events6in: number;
  events12in: number;
  sweEvents05in: number;
  sweEvents1in: number;
  max24hSnow: number;
  max24hSwe: number;
  totalDailySnowIn: number;
  subfreezingDays: number;
  extremeColdDays: number;
  avgStormTempF: number | null;
  avgWinterTempF: number | null;
}

export interface BenchmarkStormStation {
  triplet: string;
  name: string;
  state: string;
  region: string;
  elevation: number;
  elevBand: string;
  waterYears: BenchmarkStormWaterYear[];
}

export interface SnotelCoreData {
  generatedAt: string;
  source: string;
  totalStations: number;
  earliestWaterYear: number;
  latestWaterYear: number;
  regions: Record<string, RegionInfo>;
  elevationBands: ElevationBandInfo[];
  ensoByWaterYear: Record<string, EnsoWaterYear>;
  regionalAggregates: Record<string, Record<string, RegionalBandAggregate>>;
  stormSummaryByRegion: Record<string, Record<string, StormSummaryMetrics>>;
  benchmarkStormStations: BenchmarkStormStation[];
}

export interface StationMonthPoint {
  sweMedian: number | null;
  sweElNino: number | null;
  sweLaNina: number | null;
  sweNeutral: number | null;
  snwdMedian: number | null;
  snwdElNino: number | null;
  snwdLaNina: number | null;
  tavgMedian: number | null;
  tavgElNino: number | null;
  tavgLaNina: number | null;
}

export interface SnotelStation {
  triplet: string;
  id: string;
  name: string;
  state: string;
  network: string;
  county: string;
  huc: string;
  huc2: string;
  elevation: number;
  elevBand: string;
  lat: number;
  lon: number;
  beginDate: string;
  endDate: string;
  region: string;
  earliestYear: number;
  latestYear: number;
  yearsCount: number;
  medianPeakSwe: number;
  elNinoPeakSwe: number;
  laNinaPeakSwe: number;
  neutralPeakSwe: number;
  elNinoPctMedian: number;
  laNinaPctMedian: number;
  ensoSignalSpread: number;
  medianPeakSnwd: number | null;
  elNinoPeakSnwd: number | null;
  laNinaPeakSnwd: number | null;
  winterTavg: number | null;
  elNinoWinterTavg: number | null;
  laNinaWinterTavg: number | null;
  monthlyCurves: Record<string, StationMonthPoint>;
}

export interface StationHistoriesFile {
  columns: string[];
  histories: Record<string, (number | null)[][]>;
}
