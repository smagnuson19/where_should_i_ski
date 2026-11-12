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
const nationFeature = feature(topology, topology.objects.nation);
const projection = geoAlbersUsa().fitExtent(
  [
    [28, 18],
    [MAP_WIDTH - 28, MAP_HEIGHT - 18],
  ],
  nationFeature
);
const pathGen = geoPath(projection);

export interface StateShape {
  fips: string;
  name: string;
  postal: string | null;
  d: string;
  bounds: [[number, number], [number, number]];
}

export const STATE_SHAPES: StateShape[] = feature(topology, topology.objects.states).features.map(
  (f) => ({
    fips: String(f.id),
    name: f.properties?.name ?? "",
    postal: FIPS_TO_POSTAL[String(f.id)] ?? null,
    d: pathGen(f) ?? "",
    bounds: pathGen.bounds(f) as [[number, number], [number, number]],
  })
);

export const STATE_BORDERS_PATH =
  pathGen(mesh(topology, topology.objects.states, (a, b) => a !== b)) ?? "";
export const NATION_OUTLINE_PATH = pathGen(nationFeature) ?? "";

export function projectLonLat(lon: number, lat: number): [number, number] | null {
  return projection([lon, lat]);
}

export interface MapViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FULL_MAP_VIEW: MapViewBox = { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT };

const MAX_ZOOM = 18;

export function clampMapView(view: MapViewBox): MapViewBox {
  const minW = MAP_WIDTH / MAX_ZOOM;
  const w = Math.min(MAP_WIDTH, Math.max(minW, view.w));
  const h = w * (MAP_HEIGHT / MAP_WIDTH);
  if (w >= MAP_WIDTH - 0.5) return FULL_MAP_VIEW;
  const marginX = Math.min(w * 0.35, MAP_WIDTH * 0.5);
  const marginY = Math.min(h * 0.35, MAP_HEIGHT * 0.5);
  return {
    x: Math.min(MAP_WIDTH - marginX, Math.max(marginX - w, view.x)),
    y: Math.min(MAP_HEIGHT - marginY, Math.max(marginY - h, view.y)),
    w,
    h,
  };
}

/** `factor` > 1 zooms out. The anchor stays fixed in map coordinates. */
export function zoomMapView(view: MapViewBox, factor: number, anchorX: number, anchorY: number): MapViewBox {
  const relX = view.w === 0 ? 0.5 : (anchorX - view.x) / view.w;
  const relY = view.h === 0 ? 0.5 : (anchorY - view.y) / view.h;
  const sized = clampMapView({
    x: view.x,
    y: view.y,
    w: view.w * factor,
    h: view.h * factor,
  });
  return clampMapView({
    x: anchorX - relX * sized.w,
    y: anchorY - relY * sized.h,
    w: sized.w,
    h: sized.h,
  });
}

export function fitMapView(bounds: [[number, number], [number, number]]): MapViewBox {
  const [[x0, y0], [x1, y1]] = bounds;
  if (![x0, y0, x1, y1].every((n) => Number.isFinite(n))) return FULL_MAP_VIEW;
  const bw = Math.max(x1 - x0, 12);
  const bh = Math.max(y1 - y0, 12);
  const pad = 0.22;
  const aspect = MAP_WIDTH / MAP_HEIGHT;
  let w = bw * (1 + pad * 2);
  let h = bh * (1 + pad * 2);
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;
  return clampMapView({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h });
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
