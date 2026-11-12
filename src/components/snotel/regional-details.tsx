"use client";

import React from "react";
import { Mountain } from "lucide-react";
import { SeasonalMonthPoint, SnotelCoreData, SnotelStation, StormSummaryMetrics } from "@/types/snotel";
import { RegionRangeSummary, StationRangeStats, YearRange } from "@/types/snotel-range";
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
    <section id={REGION_DETAILS_ID} className="space-y-4 scroll-mt-20 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
            Region Deep Dive: {regionName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {winterSpan(props.range)} · {props.bandLabel}. Choose a region below or click any region on the map.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {[["ALL", "All regions"] as const, ...Object.values(core.regions).map((r) => [r.id, r.shortName] as const)].map(
          ([id, label]) => {
            const active = selectedRegion === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => props.onSelectRegion(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  active
                    ? "bg-sky-500/20 text-sky-200 border-sky-500/50 shadow-xs"
                    : "bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          }
        )}
      </div>

      <KpiCards
        summary={props.summaries[selectedRegion]}
        storm={props.storms[selectedRegion]}
        sweMultiplier={sweMultiplier}
        tempOffsetF={tempOffsetF}
      />

      <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2.5">
          <span className="text-slate-200 font-semibold flex items-center gap-1.5">
            <Mountain className="w-4 h-4 text-sky-400" />
            Elevation Sensitivity Simulator (Orographic Rule of Thumb)
          </span>
          <span className="font-mono text-xs font-semibold text-sky-300 bg-slate-950/80 border border-slate-800 px-2.5 py-0.5 rounded-md">
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
        <p className="text-[11px] text-slate-400 mt-2">
          Adjusts the snowpack and temperature curves below by ~8% more SWE and ~3.5°F colder air per 1,000 ft of
          elevation gain.
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
