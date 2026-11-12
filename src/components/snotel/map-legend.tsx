"use client";

import React from "react";
import { EnsoPhase } from "@/types/snotel";
import { NO_DATA_COLOR, OUTSIDE_NETWORK_COLOR, PCT_BINS } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL } from "@/lib/snotel/year-range";
import { Term } from "@/components/snotel/glossary";

export function PctScale() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {PCT_BINS.map((b) => (
        <div key={b.label} className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-2">
          <div className="h-2 rounded-full" style={{ backgroundColor: b.color }} />
          <div className="mt-1.5 font-mono text-[11px] font-semibold text-slate-100">{b.label}</div>
          <div className="text-[11px] text-slate-400 leading-snug">{b.meaning}</div>
        </div>
      ))}
    </div>
  );
}

export function LegendSwatch({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm border border-slate-700" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

export function MapLegend({ phase, showSites }: { phase: EnsoPhase; showSites: boolean }) {
  return (
    <div className="space-y-2.5 pt-1 text-xs text-slate-300">
      <div className="text-slate-400 leading-relaxed">
        Shading shows median <Term k="peakSwe">peak snowpack</Term> in{" "}
        <strong className="font-semibold text-slate-200">{PHASE_LABEL[phase]}</strong> winters as{" "}
        <Term k="pctMedian">% of median</Term> (<span className="font-mono text-slate-200">100%</span> = typical
        winter).
        {showSites ? " Station dots use the same scale." : ""}
      </div>
      <PctScale />
      <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
        <LegendSwatch color={NO_DATA_COLOR}>No sites in this elevation band</LegendSwatch>
        <LegendSwatch color={OUTSIDE_NETWORK_COLOR}>Outside the SNOTEL network</LegendSwatch>
      </div>
    </div>
  );
}
