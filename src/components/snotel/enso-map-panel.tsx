"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Map as MapIcon, MapPin } from "lucide-react";
import { EnsoPhase, RegionInfo, SnotelStation } from "@/types/snotel";
import { RegionRangeSummary, StationRangeStats } from "@/types/snotel-range";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UsEnsoMap } from "@/components/snotel/us-enso-map";
import { MapLegend } from "@/components/snotel/map-legend";
import { MapTakeaways } from "@/components/snotel/map-takeaways";
import { STATE_SHAPES, assignStatesToRegions, buildRegionOutlines } from "@/lib/snotel/us-map";
import { HINGE_NOTE, PHASE_WHY, rankRegions } from "@/lib/snotel/story";
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
  onHighlightRegion: (regionId: string) => void;
  showSites: boolean;
  onShowSitesChange: (show: boolean) => void;
  activeStation: SnotelStation | null;
  onOpenStation: (station: SnotelStation) => void;
}

export function EnsoMapPanel(props: EnsoMapPanelProps) {
  const { regions, allStations, summaries, phase, visibleSites } = props;
  const [focusedPostal, setFocusedPostal] = useState<string | null>(null);
  const stateAssignments = useMemo(() => assignStatesToRegions(allStations), [allStations]);
  const outlines = useMemo(() => buildRegionOutlines(stateAssignments), [stateAssignments]);
  const ranked = useMemo(() => rankRegions(summaries, regions, phase), [summaries, regions, phase]);
  const stateOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const st of visibleSites) counts.set(st.state, (counts.get(st.state) ?? 0) + 1);
    return STATE_SHAPES.flatMap((shape) => {
      if (!shape.postal || !counts.has(shape.postal)) return [];
      return [{ postal: shape.postal, name: shape.name, count: counts.get(shape.postal) ?? 0 }];
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [visibleSites]);
  const stateItems = useMemo(
    () => ({
      US: "Entire United States",
      ...Object.fromEntries(stateOptions.map((s) => [s.postal, `${s.name} · ${s.count} sites`])),
    }),
    [stateOptions]
  );

  useEffect(() => {
    if (focusedPostal && !stateOptions.some((s) => s.postal === focusedPostal)) setFocusedPostal(null);
  }, [focusedPostal, stateOptions]);

  const focusState = (postal: string | null) => {
    setFocusedPostal(postal);
    if (!postal) {
      props.onHighlightRegion("ALL");
      return;
    }
    const regionId = stateAssignments[postal]?.regionId;
    if (regionId) props.onHighlightRegion(regionId);
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-8 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 sm:p-5 space-y-3.5 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-sky-400" />
            Regional Snowpack Map — {PHASE_LABEL[phase]} Winters
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select items={stateItems} value={focusedPostal ?? "US"} onValueChange={(v) => focusState(!v || v === "US" ? null : String(v))}>
              <SelectTrigger
                aria-label="Zoom to a state"
                className="w-52 bg-slate-950 border-slate-800 text-xs h-8 rounded-lg"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US" className="text-xs">
                  Entire United States
                </SelectItem>
                {stateOptions.map((s) => (
                  <SelectItem key={s.postal} value={s.postal} className="text-xs">
                    {s.name} · {s.count} sites
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg hover:border-slate-700 transition">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              Show SNOTEL stations
              {props.showSites && <span className="font-mono text-slate-400">({props.visibleSites.length})</span>}
              <Switch checked={props.showSites} onCheckedChange={(v) => props.onShowSitesChange(Boolean(v))} />
            </label>
          </div>
        </div>

        <UsEnsoMap
          regions={regions}
          summaries={summaries}
          stateAssignments={stateAssignments}
          outlines={outlines}
          phase={phase}
          selectedRegion={props.selectedRegion}
          focusedPostal={focusedPostal}
          onFocusPostal={focusState}
          sites={visibleSites}
          showSites={props.showSites}
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
          subtitle="Ranked by median peak snowpack vs. normal (100%). Select any region to inspect its charts."
          whyTitle="Why the Jet Stream Shifts"
          why={PHASE_WHY[phase]}
          note={phase !== "neutral" ? HINGE_NOTE : undefined}
        />
      </div>
    </section>
  );
}
