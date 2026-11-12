export type EnsoPhase = "El Niño" | "La Niña" | "Neutral";

export interface DistStats {
  n: number;
  median: number;
  mean: number;
  std: number;
  q25: number;
  q75: number;
  iqr: number;
  min: number;
  max: number;
  range: number;
}

export interface MonthlySnow {
  Nov: number;
  Dec: number;
  Jan: number;
  Feb: number;
  Mar: number;
}

export interface FrequencyIntensity {
  days_ge_3cm_mean: number;
  days_ge_5cm_mean: number;
  days_ge_10cm_mean: number;
  days_ge_20cm_mean: number;
  days_ge_50cm_mean: number;
  days_depth_ge_1cm_mean: number;
  max_depth_mean_cm: number;
  max_1d_snow_cm: DistStats;
  snow_per_ge3cm_day_cm: number;
  max_1d_share_of_winter_pct: number;
}

export interface RegionPhaseStats {
  snowfall_cm: DistStats;
  pct_of_normal: DistStats;
  pct_of_72yr_mean: DistStats;
  pct_of_72yr_median: DistStats;
  temp_djf_c: DistStats;
  temp_djf_anomaly_c: DistStats;
  temp_djf_anom_vs_72yr_c: DistStats;
  temp_djf_detrended_anom_c: DistStats;
  temp_ndjfm_c: DistStats;
  temp_ndjfm_anomaly_c: DistStats;
  monthly_snow_mean_cm: MonthlySnow;
  monthly_snow_median_cm: MonthlySnow;
  monthly_snow_pct_of_normal: MonthlySnow;
  frequency_intensity: FrequencyIntensity;
}

export interface ModernEraPhaseStats {
  n: number;
  snowfall_cm: DistStats;
  pct_of_normal_1991_2020: DistStats;
  temp_djf_c: DistStats;
  temp_djf_anomaly_c: DistStats;
  days_ge_3cm_mean: number;
  days_ge_20cm_mean: number;
  max_1d_snow_mean_cm: number;
  max_1d_snow_median_cm: number;
}

export interface RegionData {
  region_id: string;
  name_en: string;
  name_ja: string;
  macro_region: string;
  coast: string;
  station_ids: string[];
  normals_1991_2020: {
    snowfall_cm: number;
    temp_djf_c: number;
    temp_ndjfm_c: number;
    monthly_snow_cm: MonthlySnow;
  };
  enso_comparison: {
    el_nino_minus_la_nina_median_cm: number;
    el_nino_minus_la_nina_median_pct_norm: number;
    el_nino_minus_la_nina_mean_cm: number;
    el_nino_minus_la_nina_mean_pct_norm: number;
    el_nino_vs_la_nina_median_ratio: number;
    outperforming_phase: EnsoPhase;
    temp_djf_el_nino_minus_la_nina_c: number;
  };
  phases: Record<EnsoPhase, RegionPhaseStats>;
  baselines_1954_2025: {
    snowfall_mean_cm: number;
    snowfall_median_cm: number;
    temp_djf_mean_c: number;
    temp_djf_trend_c_per_decade: number;
  };
  modern_era_1991_2025: Record<EnsoPhase, ModernEraPhaseStats>;
}

export interface StationData {
  station_id: string;
  name_en: string;
  name_ja: string;
  region_id: string;
  lat: number;
  lon: number;
  elevation_m: number;
  normals_1991_2020: {
    snow_1991_2020_cm: number;
    temp_djf_1991_2020_c: number;
    temp_ndjfm_1991_2020_c: number;
    monthly_snow_1991_2020_cm: MonthlySnow;
  };
  enso_Comparison: {
    el_nino_minus_la_nina_median_cm: number;
    el_nino_minus_la_nina_median_pct_norm: number;
    el_nino_minus_la_nina_mean_cm: number;
    el_nino_vs_la_nina_median_ratio: number;
    outperforming_phase: EnsoPhase;
  };
  phases: Record<
    EnsoPhase,
    {
      snowfall_cm: DistStats;
      pct_of_normal: DistStats;
      temp_djf_c: DistStats;
      temp_djf_anomaly_c: DistStats;
      monthly_snow_mean_cm: MonthlySnow;
      monthly_snow_median_cm: MonthlySnow;
      frequency_intensity: FrequencyIntensity;
    }
  >;
}

export interface HistoricalWinterRegionEntry {
  snowfall_cm: number;
  pct_of_normal: number;
  pct_of_72yr_mean: number;
  pct_of_72yr_median: number;
  temp_djf_c: number;
  temp_djf_anomaly_c: number;
  temp_djf_anom_vs_72yr_c: number;
  temp_djf_detrended_anom_c: number;
  days_ge_3cm: number;
  days_ge_10cm: number;
  days_ge_20cm: number;
  days_ge_50cm: number;
  max_1d_snow_cm: number;
  monthly_snow_cm: MonthlySnow;
}

export interface HistoricalWinter {
  winter_end_year: number;
  winter_label: string;
  enso_phase: EnsoPhase;
  enso_event_period: string;
  nino3_djf_mean_deviation_c: number;
  regions: Record<string, HistoricalWinterRegionEntry>;
}

export interface JmaEnsoDataset {
  metadata: {
    title: string;
    sources: string[];
    analysis_period: string;
    climatological_normal_base: string;
    enso_definition: string;
  };
  regions: RegionData[];
  stations: StationData[];
  historical_winters: HistoricalWinter[];
}
