export type GlossaryKey =
  | "snotel"
  | "enso"
  | "oni"
  | "swe"
  | "peakSwe"
  | "pctMedian"
  | "waterYear"
  | "elevBand"
  | "lowConfidence";

export const GLOSSARY: Record<GlossaryKey, { term: string; definition: string }> = {
  snotel: {
    term: "SNOTEL",
    definition:
      "USDA NRCS automated SNOw TELemetry sites. About 950 mountain stations across the West and Alaska measure snowpack, snow depth and air temperature.",
  },
  enso: {
    term: "ENSO",
    definition:
      "El Niño–Southern Oscillation: the swing between warmer (El Niño) and cooler (La Niña) surface water in the tropical Pacific. It shifts where the winter jet stream sends storms.",
  },
  oni: {
    term: "ONI",
    definition:
      "Oceanic Niño Index: NOAA's 3-month average sea-surface temperature difference from normal in the central tropical Pacific. Winters at +0.5 °C or warmer count as El Niño, −0.5 °C or cooler as La Niña, anything between as Neutral.",
  },
  swe: {
    term: "SWE",
    definition:
      "Snow water equivalent: the inches of water you would get by melting the snowpack. As a rough guide, 1 inch of SWE is about 3–5 inches of settled snow.",
  },
  peakSwe: {
    term: "Peak SWE",
    definition: "The most water the snowpack held at any point in the winter, in inches.",
  },
  pctMedian: {
    term: "% of median",
    definition:
      "A winter's peak SWE compared with the middle (median) winter at the same sites over the selected years. 100% is a typical winter; 120% means 20% more snow than typical.",
  },
  waterYear: {
    term: "Water year",
    definition:
      "October 1 to September 30, named for the year it ends. Water year 2024 is the 2023–24 winter.",
  },
  elevBand: {
    term: "Elevation band",
    definition:
      "Sites grouped by elevation, for example 6,500–8,500 ft. Higher sites stay colder, so they usually hold more snow and react differently to warm winters.",
  },
  lowConfidence: {
    term: "Low confidence",
    definition:
      "Fewer than 5 winters of that ENSO phase fall in the selected years, so a single unusual winter can swing the result.",
  },
};
