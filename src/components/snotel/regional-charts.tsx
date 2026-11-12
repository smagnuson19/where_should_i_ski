"use client";

import React from "react";
import { CloudSnow, History, Layers, ThermometerSnowflake, TrendingUp } from "lucide-react";
import {
  ElevationBandInfo,
  EnsoWaterYear,
  RegionInfo,
  SeasonalMonthPoint,
  SnotelStation,
  StormSummaryMetrics,
} from "@/types/snotel";
import { RangeYearRecord, StationRangeStats, YearRange } from "@/types/snotel-range";
import { Disclosure } from "@/components/snotel/disclosure";
import { SweSeasonChart } from "@/components/snotel/swe-season-chart";
import { TempSeasonChart } from "@/components/snotel/temp-season-chart";
import { AnnualHistoryChart } from "@/components/snotel/annual-history-chart";
import { StormDaysChart } from "@/components/snotel/storm-days-chart";
import { ElevationBandTable } from "@/components/snotel/elevation-band-table";

interface RegionalChartsProps {
  regionName: string;
  regionId: string;
  seasonalCycle: SeasonalMonthPoint[];
  seasonalIsFullRecord: boolean;
  years: RangeYearRecord[];
  storms: Record<string, Record<string, StormSummaryMetrics>>;
  regions: Record<string, RegionInfo>;
  elevationBands: ElevationBandInfo[];
  stations: SnotelStation[];
  stationStats: Map<string, StationRangeStats>;
  ensoByWaterYear: Record<string, EnsoWaterYear>;
  range: YearRange;
  sweMultiplier: number;
  tempOffsetF: number;
}

export function RegionalCharts(props: RegionalChartsProps) {
  const { sweMultiplier, tempOffsetF } = props;
  const adjustedSeasonal = props.seasonalCycle.map((pt) => {
    const scale = (v: number | null) => (v !== null ? Number((v * sweMultiplier).toFixed(1)) : null);
    const shiftT = (v: number | null) => (v !== null ? Number((v + tempOffsetF).toFixed(1)) : null);
    return {
      ...pt,
      sweMedian: scale(pt.sweMedian),
      sweElNino: scale(pt.sweElNino),
      sweLaNina: scale(pt.sweLaNina),
      sweNeutral: scale(pt.sweNeutral),
      tavgMedian: shiftT(pt.tavgMedian),
      tavgElNino: shiftT(pt.tavgElNino),
      tavgLaNina: shiftT(pt.tavgLaNina),
    };
  });
  const seasonNote = props.seasonalIsFullRecord
    ? " (full record: per-year monthly data unavailable)"
    : "";

  return (
    <div className="space-y-3">
      <Disclosure
        defaultOpen
        icon={<TrendingUp className="w-4 h-4 text-sky-400" />}
        title={`How the snowpack builds and melts: ${props.regionName}`}
        summary={`Monthly snowpack (average site SWE), Oct–Sep, by ENSO phase${seasonNote}.`}
      >
        <SweSeasonChart data={adjustedSeasonal} />
      </Disclosure>

      <Disclosure
        icon={<History className="w-4 h-4 text-indigo-400" />}
        title="Winter-by-winter history"
        summary="Each bar is one winter's peak snowpack as % of median, colored by ENSO phase, with the Nov–Mar temperature line."
      >
        <AnnualHistoryChart years={props.years} tempOffsetF={tempOffsetF} />
      </Disclosure>

      <Disclosure
        icon={<ThermometerSnowflake className="w-4 h-4 text-amber-400" />}
        title="Temperature through the season"
        summary={`Average monthly air temperature at the sites vs. the 32°F freezing line${seasonNote}.`}
      >
        <TempSeasonChart data={adjustedSeasonal} />
      </Disclosure>

      <Disclosure
        icon={<CloudSnow className="w-4 h-4 text-purple-400" />}
        title="Snowfall days by region"
        summary="Days per winter with at least 2 in of new snow, from 28 benchmark sites with daily records."
      >
        <StormDaysChart storms={props.storms} regions={props.regions} />
      </Disclosure>

      <Disclosure
        icon={<Layers className="w-4 h-4 text-emerald-400" />}
        title={`Compare elevation bands: ${props.regionName}`}
        summary="Does the ENSO signal change with elevation? Winters counted per phase in parentheses."
      >
        <ElevationBandTable
          regionId={props.regionId}
          elevationBands={props.elevationBands}
          stations={props.stations}
          stationStats={props.stationStats}
          ensoByWaterYear={props.ensoByWaterYear}
          range={props.range}
          sweMultiplier={sweMultiplier}
        />
      </Disclosure>
    </div>
  );
}
