"use client";

import React from "react";
import { Mountain } from "lucide-react";
import { SeasonalMonthPoint, SnotelCoreData, SnotelStation, StormSummaryMetrics } from "@/types/snotel";
import { RegionRangeSummary, StationRangeStats, YearRange } from "@/types/snotel-range";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { KpiCards } from "@/components/snotel/kpi-cards";
import { RegionalCharts } from "@/components/snotel/regional-charts";
import { winterSpan } from "@/lib/snotel/year-range";

export const REGION_DETAILS_ID = "region-details";

interface RegionalDetailsProps {
  core: SnotelCoreData;
  stations: SnotelStation[];
  stationStats: Map<string, StationRangeStats>;
  summaries: Record<string, RegionRangeSummary>;
  storms: Record<string, Record<string, StormSummaryMetrics>>;
  seasonal: SeasonalMonthPoint[] | null;
  range: YearRange;
  elevBand: string;
  bandLabel: string;
  selectedRegion: string;
  onSelectRegion: (regionId: string) => void;
  elevOffsetFt: number;
  onElevOffsetChange: (ft: number) => void;
}

export function RegionalDetails(props: RegionalDetailsProps) {
  const { core, selectedRegion, elevOffsetFt } = props;
  const sweMultiplier = Math.max(0.35, 1 + (elevOffsetFt / 1000) * 0.08);
  const tempOffsetF = -(elevOffsetFt / 1000) * 3.5;
  const regionName = selectedRegion === "ALL" ? "All Western regions" : core.regions[selectedRegion]?.name ?? selectedRegion;
  const fallbackSeasonal =
    core.regionalAggregates[selectedRegion]?.[props.elevBand]?.seasonalCycle ??
    core.regionalAggregates[selectedRegion]?.ALL?.seasonalCycle ??
    core.regionalAggregates.ALL.ALL.seasonalCycle;

  return (
    <section id={REGION_DETAILS_ID} className="space-y-3 scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
        <div>
          <h2 className="text-base font-bold text-white">Region details: {regionName}</h2>
          <p className="text-xs text-slate-400">
            {winterSpan(props.range)} · {props.bandLabel}. Pick a region here or click one on the map.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {[["ALL", "All regions"] as const, ...Object.values(core.regions).map((r) => [r.id, r.shortName] as const)].map(
          ([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={selectedRegion === id ? "default" : "outline"}
              className="h-7 text-xs px-2.5"
              onClick={() => props.onSelectRegion(id)}
            >
              {label}
            </Button>
          )
        )}
      </div>

      <KpiCards
        summary={props.summaries[selectedRegion]}
        storm={props.storms[selectedRegion]}
        sweMultiplier={sweMultiplier}
        tempOffsetF={tempOffsetF}
      />

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Mountain className="w-3.5 h-3.5 text-sky-400" />
            What if you skied higher or lower? (rough rule of thumb)
          </span>
          <span className="font-mono text-sky-300">
            {elevOffsetFt >= 0 ? `+${elevOffsetFt}` : elevOffsetFt} ft → snowpack ×{sweMultiplier.toFixed(2)},{" "}
            {tempOffsetF >= 0 ? "+" : ""}
            {tempOffsetF.toFixed(1)}°F
          </span>
        </div>
        <Slider
          aria-label="Elevation shift in feet"
          value={[elevOffsetFt]}
          min={-3000}
          max={3000}
          step={250}
          onValueChange={(v) => props.onElevOffsetChange(Array.isArray(v) ? v[0] : v)}
        />
        <p className="text-[11px] text-slate-500 mt-2">
          Scales the snowpack and temperature numbers below by about 8% more SWE and 3.5°F colder per 1,000 ft.
        </p>
      </div>

      <RegionalCharts
        regionName={regionName}
        regionId={selectedRegion}
        seasonalCycle={props.seasonal ?? fallbackSeasonal}
        seasonalIsFullRecord={!props.seasonal}
        years={props.summaries[selectedRegion]?.years ?? []}
        storms={props.storms}
        regions={core.regions}
        elevationBands={core.elevationBands}
        stations={props.stations}
        stationStats={props.stationStats}
        ensoByWaterYear={core.ensoByWaterYear}
        range={props.range}
        sweMultiplier={sweMultiplier}
        tempOffsetF={tempOffsetF}
      />
    </section>
  );
}
