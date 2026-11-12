import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature, merge, mesh } from "topojson-client";
import type { GeometryCollection, MultiPolygon, Polygon, Topology } from "topojson-specification";
import statesTopology from "us-atlas/states-10m.json";
import { SnotelStation } from "@/types/snotel";

export const MAP_WIDTH = 975;
export const MAP_HEIGHT = 610;

/** States need at least this many SNOTEL sites before they are shaded as part of a region. */
const MIN_SITES_TO_SHADE_STATE = 5;

const POSTAL_TO_FIPS: Record<string, string> = {
  AK: "02", AZ: "04", CA: "06", CO: "08", ID: "16", MT: "30", NE: "31",
  NV: "32", NM: "35", ND: "38", OR: "41", SD: "46", TX: "48", UT: "49",
  WA: "53", WY: "56",
};
const FIPS_TO_POSTAL = Object.fromEntries(
  Object.entries(POSTAL_TO_FIPS).map(([postal, fips]) => [fips, postal])
);

type StatesTopology = Topology<{
  states: GeometryCollection<{ name: string }>;
  nation: GeometryCollection;
}>;

const topology = statesTopology as unknown as StatesTopology;
const projection = geoAlbersUsa().scale(1300).translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
const pathGen = geoPath(projection);

export interface StateShape {
  fips: string;
  name: string;
  postal: string | null;
  d: string;
}

export const STATE_SHAPES: StateShape[] = feature(topology, topology.objects.states).features.map(
  (f) => ({
    fips: String(f.id),
    name: f.properties?.name ?? "",
    postal: FIPS_TO_POSTAL[String(f.id)] ?? null,
    d: pathGen(f) ?? "",
  })
);

export const STATE_BORDERS_PATH =
  pathGen(mesh(topology, topology.objects.states, (a, b) => a !== b)) ?? "";
export const NATION_OUTLINE_PATH = pathGen(feature(topology, topology.objects.nation)) ?? "";

export function projectLonLat(lon: number, lat: number): [number, number] | null {
  return projection([lon, lat]);
}

export interface StateSiteBreakdown {
  postal: string;
  regionId: string;
  siteCount: number;
  byRegion: Record<string, number>;
}

/** Each state with enough SNOTEL sites is shaded with the region that holds most of its sites. */
export function assignStatesToRegions(stations: SnotelStation[]): Record<string, StateSiteBreakdown> {
  const counts: Record<string, Record<string, number>> = {};
  for (const st of stations) {
    counts[st.state] = counts[st.state] || {};
    counts[st.state][st.region] = (counts[st.state][st.region] || 0) + 1;
  }
  const out: Record<string, StateSiteBreakdown> = {};
  for (const [postal, byRegion] of Object.entries(counts)) {
    const siteCount = Object.values(byRegion).reduce((a, b) => a + b, 0);
    if (siteCount < MIN_SITES_TO_SHADE_STATE) continue;
    const [regionId] = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0];
    out[postal] = { postal, regionId, siteCount, byRegion };
  }
  return out;
}

export interface RegionOutline {
  regionId: string;
  d: string;
  labelAt: [number, number];
}

export function buildRegionOutlines(
  assignments: Record<string, StateSiteBreakdown>
): RegionOutline[] {
  const statesByRegion: Record<string, Set<string>> = {};
  for (const a of Object.values(assignments)) {
    const fips = POSTAL_TO_FIPS[a.postal];
    if (!fips) continue;
    statesByRegion[a.regionId] = statesByRegion[a.regionId] || new Set();
    statesByRegion[a.regionId].add(fips);
  }
  return Object.entries(statesByRegion).map(([regionId, fipsSet]) => {
    const geoms = topology.objects.states.geometries.filter((g) => fipsSet.has(String(g.id))) as (
      | Polygon
      | MultiPolygon
    )[];
    const shape = merge(topology, geoms);
    const [x, y] = pathGen.centroid(shape);
    return { regionId, d: pathGen(shape) ?? "", labelAt: [x, y] };
  });
}
