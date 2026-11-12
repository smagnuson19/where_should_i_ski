"use client";

import React from "react";
import { ElevationBandInfo, EnsoPhase } from "@/types/snotel";
import { PhaseRecord, YearRange } from "@/types/snotel-range";
import { PhaseToggle } from "@/components/snotel/phase-toggle";
import { YearRangeFilter } from "@/components/snotel/year-range-filter";
import { Term } from "@/components/snotel/glossary";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ViewControlsProps {
  phase: EnsoPhase;
  onPhaseChange: (phase: EnsoPhase) => void;
  range: YearRange;
  onRangeChange: (range: YearRange) => void;
  firstYear: number;
  lastYear: number;
  phaseCounts: PhaseRecord<number> & { total: number };
  elevBand: string;
  onElevBandChange: (band: string) => void;
  elevationBands: ElevationBandInfo[];
}

export function ViewControls(props: ViewControlsProps) {
  const bandItems = Object.fromEntries(props.elevationBands.map((b) => [b.id, b.label]));

  return (
    <section className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:divide-x lg:divide-slate-800/80">
      <div className="lg:col-span-3 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Show <Term k="enso">ENSO</Term> Phase
        </div>
        <PhaseToggle phase={props.phase} onPhaseChange={props.onPhaseChange} />
      </div>

      <div className="lg:col-span-6 lg:pl-5 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Winters Included (<Term k="waterYear">Water Years</Term>)
        </div>
        <YearRangeFilter
          range={props.range}
          onRangeChange={props.onRangeChange}
          firstYear={props.firstYear}
          lastYear={props.lastYear}
          phaseCounts={props.phaseCounts}
        />
      </div>

      <div className="lg:col-span-3 lg:pl-5 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <Term k="elevBand">Elevation Band</Term>
        </div>
        <Select
          items={bandItems}
          value={props.elevBand}
          onValueChange={(v) => v && props.onElevBandChange(String(v))}
        >
          <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-xs h-9 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {props.elevationBands.map((b) => (
              <SelectItem key={b.id} value={b.id} className="text-xs">
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-slate-400 leading-snug">
          Higher stations stay colder and generally hold deeper snowpack.
        </p>
      </div>
    </section>
  );
}
