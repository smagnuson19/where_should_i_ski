"use client";

import React from "react";
import { EnsoPhase } from "@/types/snotel";
import { NO_DATA_COLOR, OUTSIDE_NETWORK_COLOR, PCT_BINS } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL } from "@/lib/snotel/year-range";
import { Term } from "@/components/snotel/glossary";

export function MapLegend({ phase, showSites }: { phase: EnsoPhase; showSites: boolean }) {
  return (
    <div className="space-y-2 text-[11px] text-slate-300">
      <div className="text-slate-400">
        Color = typical <Term k="peakSwe">peak snowpack</Term> in {PHASE_LABEL[phase]} winters, as{" "}
        <Term k="pctMedian">% of median</Term> (100% = a typical winter).
        {showSites ? " Dots use the same scale for each site." : ""}
      </div>
      <div className="flex flex-wrap items-stretch gap-1">
        {PCT_BINS.map((b) => (
          <div key={b.label} className="flex-1 min-w-[88px]">
            <div className="h-2.5 rounded-sm" style={{ backgroundColor: b.color }} />
            <div className="mt-1 font-semibold text-slate-200">{b.label}</div>
            <div className="text-slate-500 leading-tight">{b.meaning}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-slate-700" style={{ backgroundColor: NO_DATA_COLOR }} />
          No sites in this elevation band
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-slate-700" style={{ backgroundColor: OUTSIDE_NETWORK_COLOR }} />
          Outside the SNOTEL network
        </span>
      </div>
    </div>
  );
}
