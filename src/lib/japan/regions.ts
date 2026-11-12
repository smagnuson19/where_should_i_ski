import { EnsoPhase } from "@/types/snotel";
import { EnsoPhase as JmaEnsoPhase } from "@/types/japan-enso";

export const FROM_JMA_PHASE: Record<JmaEnsoPhase, EnsoPhase> = {
  "El Niño": "el_nino",
  "La Niña": "la_nina",
  Neutral: "neutral",
};

export const TO_JMA_PHASE: Record<EnsoPhase, JmaEnsoPhase> = {
  el_nino: "El Niño",
  la_nina: "La Niña",
  neutral: "Neutral",
};

export interface JapanRegionInfo {
  id: string;
  name: string;
  shortName: string;
  /** Well-known towns and ski areas, so readers can place the region. */
  places: string;
  /** Map badge position (lon, lat), out over the sea beside the region. */
  labelAt: [number, number];
  /** Point on land the badge's leader line points to (lon, lat). */
  anchorAt: [number, number];
}

/** Ordered north to south, the order used for region chips and tables. */
export const JAPAN_REGIONS: JapanRegionInfo[] = [
  {
    id: "hokkaido_soj",
    name: "Hokkaido – Sea of Japan side",
    shortName: "Hokkaido (Sea of Japan)",
    places: "Niseko, Rusutsu, Kiroro, Sapporo, Furano, Asahikawa",
    labelAt: [138.6, 43.7],
    anchorAt: [141.6, 43.4],
  },
  {
    id: "hokkaido_okhotsk",
    name: "Hokkaido – Okhotsk side",
    shortName: "Hokkaido (Okhotsk)",
    places: "Abashiri, Kitami, Monbetsu",
    labelAt: [143.4, 45.35],
    anchorAt: [143.6, 44.0],
  },
  {
    id: "hokkaido_pac",
    name: "Hokkaido – Pacific side",
    shortName: "Hokkaido (Pacific)",
    places: "Sahoro, Obihiro, Kushiro, Hakodate",
    labelAt: [144.4, 41.75],
    anchorAt: [143.2, 42.8],
  },
  {
    id: "tohoku_soj",
    name: "Tohoku – Sea of Japan side",
    shortName: "Tohoku (Sea of Japan)",
    places: "Hakkoda, Tazawako, Zao Onsen, Gassan, Aizu",
    labelAt: [137.5, 40.3],
    anchorAt: [140.2, 39.6],
  },
  {
    id: "tohoku_pac",
    name: "Tohoku – Pacific side",
    shortName: "Tohoku (Pacific)",
    places: "Appi Kogen, Shizukuishi, Morioka, Sendai",
    labelAt: [143.6, 39.3],
    anchorAt: [141.3, 39.3],
  },
  {
    id: "hokuriku",
    name: "Hokuriku",
    shortName: "Hokuriku",
    places: "Myoko, Yuzawa & Naeba, Niigata, Kanazawa",
    labelAt: [136.0, 38.35],
    anchorAt: [138.4, 37.3],
  },
  {
    id: "central_highlands_kanto",
    name: "Nagano, Kanto & Central Highlands",
    shortName: "Nagano & Kanto",
    places: "Hakuba, Nozawa Onsen, Shiga Kogen, Karuizawa, Minakami, Tokyo",
    labelAt: [141.3, 34.45],
    anchorAt: [138.9, 36.1],
  },
  {
    id: "sanin_west_soj",
    name: "San'in & northern Kinki",
    shortName: "San'in",
    places: "Daisen, Hachi Kita, Tottori, Matsue",
    labelAt: [133.4, 36.75],
    anchorAt: [133.9, 35.35],
  },
];

export const JAPAN_REGION_BY_ID: Record<string, JapanRegionInfo> = Object.fromEntries(
  JAPAN_REGIONS.map((r) => [r.id, r])
);
