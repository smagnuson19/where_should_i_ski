"use client";

import { useMemo } from "react";
import { SnotelData } from "@/components/snotel/use-snotel-data";
import { computeStationRangeStats, summarizeRegions } from "@/lib/snotel/range-analysis";
import { seasonalCycleForRange, stormSummaryForRange } from "@/lib/snotel/range-seasonal-storms";
import { countPhaseWinters } from "@/lib/snotel/year-range";

/** Every number on the SNOTEL view, recomputed for the selected water years and elevation band. */
export function useRangeAnalysis(
  data: SnotelData | null,
  start: number,
  end: number,
  elevBand: string,
  selectedRegion: string
) {
  const regionIds = useMemo(() => (data ? Object.keys(data.core.regions) : []), [data]);

  const stationStats = useMemo(
    () =>
      data
        ? computeStationRangeStats(data.stations, data.histories, data.core.ensoByWaterYear, { start, end })
        : new Map(),
    [data, start, end]
  );

  const summaries = useMemo(
    () =>
      data
        ? summarizeRegions(regionIds, elevBand, data.stations, stationStats, data.core.ensoByWaterYear, {
            start,
            end,
          })
        : {},
    [data, regionIds, elevBand, stationStats, start, end]
  );

  const phaseCounts = useMemo(
    () =>
      data
        ? countPhaseWinters(data.core.ensoByWaterYear, { start, end })
        : { el_nino: 0, la_nina: 0, neutral: 0, total: 0 },
    [data, start, end]
  );

  const storms = useMemo(
    () => (data ? stormSummaryForRange(data.core.benchmarkStormStations, regionIds, { start, end }) : {}),
    [data, regionIds, start, end]
  );

  const seasonal = useMemo(() => {
    if (!data?.monthly) return null;
    return seasonalCycleForRange(data.monthly, selectedRegion, elevBand, data.core.ensoByWaterYear, {
      start,
      end,
    });
  }, [data, selectedRegion, elevBand, start, end]);

  return { regionIds, stationStats, summaries, phaseCounts, storms, seasonal };
}
