import { SkiResort } from "@/types/resorts";
import { japanRegionForLonLat } from "@/lib/japan/map";

/** Fill in Japan climate region ids from forecast-area polygons. */
export function withJapanRegions(resorts: SkiResort[]): SkiResort[] {
  return resorts.map((r) => ({
    ...r,
    region: japanRegionForLonLat(r.lon, r.lat),
  }));
}
