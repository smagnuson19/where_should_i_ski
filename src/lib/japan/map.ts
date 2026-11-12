import { geoConicConformal, geoPath } from "d3-geo";
import { feature, merge, mesh } from "topojson-client";
import type { GeometryCollection, MultiPolygon, Polygon, Topology } from "topojson-specification";
import areasTopology from "@/data/japan-forecast-areas.topo.json";

export const MAP_WIDTH = 760;

/** Region each JMA forecast area belongs to: whole prefectures first, then areas that split a prefecture. */
const PREFECTURE_REGION: Record<string, string> = {
  "03": "tohoku_pac", "04": "tohoku_pac", "05": "tohoku_soj", "06": "tohoku_soj", "07": "tohoku_pac",
  "08": "central_highlands_kanto", "09": "central_highlands_kanto", "10": "central_highlands_kanto",
  "11": "central_highlands_kanto", "12": "central_highlands_kanto", "13": "central_highlands_kanto",
  "14": "central_highlands_kanto", "19": "central_highlands_kanto", "20": "central_highlands_kanto",
  "15": "hokuriku", "16": "hokuriku", "17": "hokuriku", "18": "hokuriku",
  "31": "sanin_west_soj", "32": "sanin_west_soj",
};

const AREA_REGION: Record<string, string> = {
  // Hokkaido subprefectures
  "011000": "hokkaido_soj", "012010": "hokkaido_soj", "012020": "hokkaido_soj", "016010": "hokkaido_soj",
  "016020": "hokkaido_soj", "016030": "hokkaido_soj", "017020": "hokkaido_soj",
  "013010": "hokkaido_okhotsk", "013020": "hokkaido_okhotsk", "013030": "hokkaido_okhotsk",
  "014010": "hokkaido_pac", "014020": "hokkaido_pac", "014030": "hokkaido_pac", "015010": "hokkaido_pac",
  "015020": "hokkaido_pac", "017010": "hokkaido_pac",
  // Aomori: Tsugaru faces the Sea of Japan; Shimokita and Sanpachi-Kamikita face the Pacific
  "020010": "tohoku_soj", "020020": "tohoku_pac", "020030": "tohoku_pac",
  // Fukushima's Aizu basin, where the Wakamatsu station sits
  "070030": "tohoku_soj",
  // Gifu's Hida highlands (Takayama)
  "210020": "central_highlands_kanto",
  // Northern Kyoto (Maizuru) and northern Hyogo (Toyooka)
  "260020": "sanin_west_soj", "280020": "sanin_west_soj",
};

export const PREFECTURE_NAMES: Record<string, string> = {
  "01": "Hokkaido", "02": "Aomori", "03": "Iwate", "04": "Miyagi", "05": "Akita", "06": "Yamagata",
  "07": "Fukushima", "08": "Ibaraki", "09": "Tochigi", "10": "Gunma", "11": "Saitama", "12": "Chiba",
  "13": "Tokyo", "14": "Kanagawa", "15": "Niigata", "16": "Toyama", "17": "Ishikawa", "18": "Fukui",
  "19": "Yamanashi", "20": "Nagano", "21": "Gifu", "26": "Kyoto", "28": "Hyogo", "31": "Tottori",
  "32": "Shimane",
};

function regionForArea(code: string): string | null {
  return AREA_REGION[code] ?? PREFECTURE_REGION[code.slice(0, 2)] ?? null;
}

type AreasTopology = Topology<{ areas: GeometryCollection<{ code: string }> }>;

const topology = areasTopology as unknown as AreasTopology;
const geometries = topology.objects.areas.geometries;

function areaCode(geometry: { properties?: object | null }): string {
  return String((geometry.properties as { code?: string } | null | undefined)?.code ?? "");
}

/** Frames Honshu north of Shikoku through Hokkaido, with sea room on both coasts for region badges. */
const FRAME = {
  type: "MultiPoint" as const,
  coordinates: [
    [130.6, 33.35],
    [146.3, 33.35],
    [130.6, 45.7],
    [146.3, 45.7],
  ],
};
const projection = geoConicConformal().parallels([34, 44]).rotate([-138, 0]).fitWidth(MAP_WIDTH, FRAME);
const pathGen = geoPath(projection);

export const MAP_HEIGHT = Math.round(pathGen.bounds(FRAME)[1][1]);

export interface AreaShape {
  code: string;
  prefecture: string;
  regionId: string | null;
  d: string;
}

export const AREA_SHAPES: AreaShape[] = feature(topology, topology.objects.areas).features.map((f) => {
  const code = areaCode(f);
  return { code, prefecture: code.slice(0, 2), regionId: regionForArea(code), d: pathGen(f) ?? "" };
});

export const PREFECTURE_BORDERS_PATH =
  pathGen(
    mesh(topology, topology.objects.areas, (a, b) => a !== b && areaCode(a).slice(0, 2) !== areaCode(b).slice(0, 2))
  ) ?? "";

export const COASTLINE_PATH = pathGen(mesh(topology, topology.objects.areas, (a, b) => a === b)) ?? "";

export interface JapanRegionOutline {
  regionId: string;
  d: string;
}

export const REGION_OUTLINES: JapanRegionOutline[] = [...new Set(AREA_SHAPES.map((a) => a.regionId))]
  .filter((id): id is string => id !== null)
  .map((regionId) => {
    const geoms = geometries.filter((g) => regionForArea(areaCode(g)) === regionId) as (
      | Polygon
      | MultiPolygon
    )[];
    return { regionId, d: pathGen(merge(topology, geoms)) ?? "" };
  });

export function projectLonLat(lon: number, lat: number): [number, number] | null {
  return projection([lon, lat]);
}
