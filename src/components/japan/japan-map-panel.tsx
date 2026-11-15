"use client";

import React, { useMemo } from "react";
import { MapPin, Mountain } from "lucide-react";
import { TrailMark } from "@/components/trail/trail-mark";
import { EnsoPhase } from "@/types/snotel";
import { StationData } from "@/types/japan-enso";
import { ResortSnowfallStats, SkiResort } from "@/types/resorts";
import { Switch } from "@/components/ui/switch";
import { JapanEnsoMap } from "@/components/japan/japan-enso-map";
import { MapTakeaways } from "@/components/snotel/map-takeaways";
import { LegendSwatch, PctScale } from "@/components/snotel/map-legend";
import { GlossaryTerm } from "@/components/snotel/glossary";
import { JapanRegionSummary, rankJapanRegions } from "@/lib/japan/analysis";
import { JAPAN_GLOSSARY } from "@/lib/japan/glossary";
import { JAPAN_PHASE_WHY, JAPAN_SPINE_NOTE } from "@/lib/japan/story";
import { OUTSIDE_NETWORK_COLOR } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL } from "@/lib/snotel/year-range";

interface JapanMapPanelProps {
  summaries: Record<string, JapanRegionSummary>;
  stations: StationData[];
  phase: EnsoPhase;
  selectedRegion: string;
  onSelectRegion: (regionId: string) => void;
  showStations: boolean;
  onShowStationsChange: (show: boolean) => void;
  resorts?: SkiResort[];
  showResorts?: boolean;
  onShowResortsChange?: (show: boolean) => void;
  resortStats?: Map<string, ResortSnowfallStats>;
  onOpenResort?: (resort: SkiResort) => void;
}

export function JapanMapPanel(props: JapanMapPanelProps) {
  const { summaries, phase } = props;
  const ranked = useMemo(() => rankJapanRegions(summaries, phase), [summaries, phase]);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-8 rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold text-slate-950 flex items-center gap-2">
            <TrailMark level="intermediate" />
            Regional Snowfall Map — {PHASE_LABEL[phase]} Winters
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-100/70 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-300 transition">
              <MapPin className="w-3.5 h-3.5 text-pine-600" />
              Show JMA stations
              {props.showStations && <span className="font-mono text-slate-600">({props.stations.length})</span>}
              <Switch checked={props.showStations} onCheckedChange={(v) => props.onShowStationsChange(Boolean(v))} />
            </label>
            {props.onShowResortsChange && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-100/70 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-300 transition">
                <Mountain className="w-3.5 h-3.5 text-pine-600" />
                Show ski resorts
                {props.showResorts && props.resorts && (
                  <span className="font-mono text-slate-600">({props.resorts.length})</span>
                )}
                <Switch
                  checked={Boolean(props.showResorts)}
                  onCheckedChange={(v) => props.onShowResortsChange?.(Boolean(v))}
                />
              </label>
            )}
          </div>
        </div>

        <JapanEnsoMap
          summaries={summaries}
          phase={phase}
          selectedRegion={props.selectedRegion}
          onSelectRegion={props.onSelectRegion}
          stations={props.showStations ? props.stations : null}
          resorts={props.showResorts ? props.resorts ?? null : null}
          resortStats={props.resortStats}
          onOpenResort={props.onOpenResort}
        />

        <div className="space-y-2.5 pt-1 text-xs text-slate-700">
          <div className="text-slate-600 leading-relaxed">
            Shading shows median <GlossaryTerm entry={JAPAN_GLOSSARY.seasonSnowfall}>season snowfall</GlossaryTerm> in{" "}
            <strong className="font-semibold text-slate-800">{PHASE_LABEL[phase]}</strong> winters as{" "}
            <GlossaryTerm entry={JAPAN_GLOSSARY.pctTypical} /> (<span className="font-mono text-slate-800">100%</span> =
            typical winter).
            {props.showStations ? " White dots are the weather stations behind each region." : ""}
            {props.showResorts ? " Diamonds are ski resorts colored by nearby AMeDAS season snowfall." : ""}
          </div>
          <PctScale />
          <div className="flex flex-wrap gap-4 text-[11px] text-slate-600">
            <LegendSwatch color={OUTSIDE_NETWORK_COLOR}>Outside the eight regions</LegendSwatch>
            {props.showResorts && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rotate-45 border border-slate-500 bg-pine-600" />
                Ski resort
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-4">
        <MapTakeaways
          phase={phase}
          ranked={ranked}
          selectedRegion={props.selectedRegion}
          onSelectRegion={props.onSelectRegion}
          subtitle="Ranked by median season snowfall vs. typical (100%). Select any region to see its details."
          whyTitle="Why the Winter Monsoon Shifts"
          why={JAPAN_PHASE_WHY[phase]}
          note={JAPAN_SPINE_NOTE}
        />
      </div>
    </section>
  );
}
