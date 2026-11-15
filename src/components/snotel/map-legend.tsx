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
        <div key={b.label} className="rounded-lg bg-slate-100/60 border border-slate-200/80 p-2">
          <div className="h-2 rounded-full" style={{ backgroundColor: b.color }} />
          <div className="mt-1.5 font-mono text-[11px] font-semibold text-slate-900">{b.label}</div>
          <div className="text-[11px] text-slate-600 leading-snug">{b.meaning}</div>
        </div>
      ))}
    </div>
  );
}

export function LegendSwatch({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm border border-slate-300" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

export function MapLegend({
  phase,
  showSites,
  showResorts = false,
}: {
  phase: EnsoPhase;
  showSites: boolean;
  showResorts?: boolean;
}) {
  return (
    <div className="space-y-2.5 pt-1 text-xs text-slate-700">
      <div className="text-slate-600 leading-relaxed">
        Shading shows median <Term k="peakSwe">peak snowpack</Term> in{" "}
        <strong className="font-semibold text-slate-800">{PHASE_LABEL[phase]}</strong> winters as{" "}
        <Term k="pctMedian">% of median</Term> (<span className="font-mono text-slate-800">100%</span> = typical
        winter).
        {showSites ? " Station dots use the same snowpack scale." : ""}
        {showResorts ? (
          <>
            {" "}
            Diamond markers are ski resorts colored by season <Term k="snowfall">snowfall</Term> (not SWE).
          </>
        ) : null}
      </div>
      <PctScale />
      <div className="flex flex-wrap gap-4 text-[11px] text-slate-600">
        <LegendSwatch color={NO_DATA_COLOR}>No sites in this elevation band</LegendSwatch>
        <LegendSwatch color={OUTSIDE_NETWORK_COLOR}>Outside the SNOTEL network</LegendSwatch>
        {showResorts && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 border border-slate-500 bg-pine-600" />
            Ski resort (season snowfall)
          </span>
        )}
      </div>
    </div>
  );
}
