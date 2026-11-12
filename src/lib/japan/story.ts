import { EnsoPhase } from "@/types/snotel";

/** Plain-language reason each phase tilts the odds in Japan; kept short enough to read at a glance. */
export const JAPAN_PHASE_WHY: Record<EnsoPhase, string> = {
  el_nino:
    "El Niño tends to weaken the winter monsoon, so cold blasts from Siberia come less often and Japan runs milder, especially in the west. The Sea of Japan coast usually loses the most, while storms tracking along the south coast can still bring heavy snow to the Pacific side and inland mountains.",
  la_nina:
    "La Niña tends to strengthen the winter monsoon: cold northwest winds cross the warmer Sea of Japan, pick up moisture and unload it as snow on the Sea of Japan side of the mountains. The colder air also keeps low coastal areas snowing instead of raining.",
  neutral:
    "With no strong push from the tropical Pacific, the monsoon varies from one winter to the next. Results stay closer to typical everywhere, so local weather luck matters more than the ENSO forecast.",
};

export const JAPAN_SPINE_NOTE =
  "Japan's mountain spine splits each northern region into a Sea of Japan side and a Pacific side. Snow from the winter monsoon falls mostly on the Sea of Japan side, which is where most deep-powder ski areas are.";
