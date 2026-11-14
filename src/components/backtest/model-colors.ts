/** Stable colors for model series across charts. */
export const MODEL_COLORS: Record<string, string> = {
  best_match: "#e2e8f0",
  ecmwf_ifs: "#38bdf8",
  ecmwf_aifs025_single: "#a78bfa",
  gfs_seamless: "#f97316",
  ncep_hrrr_conus: "#f43f5e",
  ncep_nbm_conus: "#14b8a6",
  gem_seamless: "#84cc16",
  icon_seamless: "#eab308",
  ukmo_global_deterministic_10km: "#fb7185",
};

export function modelColor(id: string): string {
  return MODEL_COLORS[id] ?? "#94a3b8";
}
