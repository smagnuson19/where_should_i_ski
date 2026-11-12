"use client";

import React, { useMemo } from "react";
import { Map as MapIcon, MapPin } from "lucide-react";
import { EnsoPhase, RegionInfo, SnotelStation } from "@/types/snotel";
import { RegionRangeSummary, StationRangeStats } from "@/types/snotel-range";
import { Switch } from "@/components/ui/switch";
import { UsEnsoMap } from "@/components/snotel/us-enso-map";
import { MapLegend } from "@/components/snotel/map-legend";
import { MapTakeaways } from "@/components/snotel/map-takeaways";
import { assignStatesToRegions, buildRegionOutlines } from "@/lib/snotel/us-map";
import { rankRegions } from "@/lib/snotel/story";
import { PHASE_LABEL } from "@/lib/snotel/year-range";

interface EnsoMapPanelProps {
  regions: Record<string, RegionInfo>;
  allStations: SnotelStation[];
  visibleSites: SnotelStation[];
  summaries: Record<string, RegionRangeSummary>;
  stationStats: Map<string, StationRangeStats>;
  phase: EnsoPhase;
  selectedRegion: string;
  onSelectRegion: (regionId: string) => void;
  showSites: boolean;
  onShowSitesChange: (show: boolean) => void;
  activeStation: SnotelStation | null;
  onOpenStation: (station: SnotelStation) => void;
}

export function EnsoMapPanel(props: EnsoMapPanelProps) {
  const { regions, allStations, summaries, phase } = props;
  const stateAssignments = useMemo(() => assignStatesToRegions(allStations), [allStations]);
  const outlines = useMemo(() => buildRegionOutlines(stateAssignments), [stateAssignments]);
  const ranked = useMemo(() => rankRegions(summaries, regions, phase), [summaries, regions, phase]);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-8 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 sm:p-5 space-y-3.5 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-sky-400" />
            Regional Snowpack Map — {PHASE_LABEL[phase]} Winters
          </h2>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg hover:border-slate-700 transition">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            Show SNOTEL stations
            {props.showSites && <span className="font-mono text-slate-400">({props.visibleSites.length})</span>}
            <Switch checked={props.showSites} onCheckedChange={(v) => props.onShowSitesChange(Boolean(v))} />
          </label>
        </div>

        <UsEnsoMap
          regions={regions}
          summaries={summaries}
          stateAssignments={stateAssignments}
          outlines={outlines}
          phase={phase}
          selectedRegion={props.selectedRegion}
          onSelectRegion={props.onSelectRegion}
          sites={props.showSites ? props.visibleSites : null}
          stationStats={props.stationStats}
          activeStation={props.activeStation}
          onOpenStation={props.onOpenStation}
        />
        <MapLegend phase={phase} showSites={props.showSites} />
      </div>

      <div className="lg:col-span-4">
        <MapTakeaways
          phase={phase}
          ranked={ranked}
          selectedRegion={props.selectedRegion}
          onSelectRegion={props.onSelectRegion}
        />
      </div>
    </section>
  );
}
