import { GLOSSARY } from "@/lib/snotel/glossary";

export type JapanGlossaryKey =
  | "jma"
  | "enso"
  | "pctTypical"
  | "seasonSnowfall"
  | "seaOfJapanSide"
  | "pacificSide"
  | "monsoon"
  | "lowConfidence";

export const JAPAN_GLOSSARY: Record<JapanGlossaryKey, { term: string; definition: string }> = {
  jma: {
    term: "JMA",
    definition:
      "Japan Meteorological Agency, the national weather service. Its long-record weather stations measure daily new snowfall and air temperature.",
  },
  enso: {
    term: "ENSO",
    definition:
      "El Niño–Southern Oscillation: the swing between warmer (El Niño) and cooler (La Niña) surface water in the tropical Pacific. JMA classifies a winter as El Niño or La Niña when the eastern tropical Pacific (its NINO.3 index) runs at least 0.5 °C warmer or cooler than normal for six months or more.",
  },
  pctTypical: {
    term: "% of typical",
    definition:
      "A winter's total snowfall compared with the middle (median) winter in the same region over the selected years. 100% is a typical winter; 120% means 20% more snow than typical.",
  },
  seasonSnowfall: {
    term: "Season snowfall",
    definition:
      "The total of each day's new snow over a whole winter, before it settles or melts, in centimeters. A region's value is the average of its stations.",
  },
  seaOfJapanSide: {
    term: "Sea of Japan side",
    definition:
      "The northwest-facing side of Japan's mountain spine. Cold winter winds pick up moisture crossing the Sea of Japan and drop it here, which is why most of Japan's deep-snow ski areas sit on this side.",
  },
  pacificSide: {
    term: "Pacific side",
    definition:
      "The southeast-facing side of the mountains. It is usually dry and sunny in winter; its big snowfalls come mostly from low-pressure systems passing along the south coast.",
  },
  monsoon: {
    term: "Winter monsoon",
    definition:
      "The cold northwest wind that blows from Siberia toward Japan through most of the winter. A stronger monsoon means more frequent, colder snowstorms on the Sea of Japan side.",
  },
  lowConfidence: GLOSSARY.lowConfidence,
};
