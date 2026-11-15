/** Stable colors for model series across charts. */
export const MODEL_COLORS: Record<string, string> = {
  best_match: "#64748b",
  ecmwf_ifs: "#0284c7",
  ecmwf_aifs025_single: "#7c3aed",
  gfs_seamless: "#ea580c",
  ncep_hrrr_conus: "#e11d48",
  ncep_nbm_conus: "#0d9488",
  gem_seamless: "#65a30d",
  icon_seamless: "#ca8a04",
  ukmo_global_deterministic_10km: "#db2777",
};

export function modelColor(id: string): string {
  return MODEL_COLORS[id] ?? "#8b8774";
}
