"use client";

import React from "react";
import { AlertTriangle, MapPin, MousePointerClick } from "lucide-react";
import { EnsoPhase, RegionInfo, SnotelStation } from "@/types/snotel";
import { ENSO_PHASES, RegionRangeSummary, StationRangeStats } from "@/types/snotel-range";
import { StateSiteBreakdown } from "@/lib/snotel/us-map";
import { formatPct, pctMeaning } from "@/lib/snotel/enso-scale";
import { LOW_CONFIDENCE_WINTERS, PHASE_LABEL, PHASE_STYLE } from "@/lib/snotel/year-range";

export const HOVER_CARD_BASE =
  "w-72 rounded-lg border border-slate-300/90 bg-slate-50/95 p-3 shadow-xl backdrop-blur-md text-xs text-slate-800 pointer-events-none";
const CARD = `absolute top-3 right-3 ${HOVER_CARD_BASE}`;

export function PhaseRow({ values }: { values: Record<EnsoPhase, { pct: number | null; winters: number }> }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 mt-2 text-center">
      {ENSO_PHASES.map((p) => (
        <div key={p} className="bg-slate-100/70 rounded p-1.5">
          <div className={`text-[10px] ${PHASE_STYLE[p].text}`}>{PHASE_LABEL[p]}</div>
          <div className="font-semibold text-slate-950 text-sm">{formatPct(values[p].pct)}</div>
          <div className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5">
            {values[p].winters} winters
            {values[p].winters < LOW_CONFIDENCE_WINTERS && <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RegionHoverCard({
  stateName,
  breakdown,
  region,
  summary,
  phase,
}: {
  stateName: string;
  breakdown: StateSiteBreakdown;
  region: RegionInfo;
  summary: RegionRangeSummary | undefined;
  phase: EnsoPhase;
}) {
  const signal = summary?.phases[phase];
  const splits = Object.entries(breakdown.byRegion).filter(([, n]) => n > 0);
  return (
    <div className={CARD}>
      <div className="font-semibold text-slate-950 text-sm">{region.shortName}</div>
      <div className="text-[11px] text-slate-600">
        {stateName}: {breakdown.siteCount} sites
        {splits.length > 1 ? ` (split across ${splits.length} regions)` : ""}
      </div>
      <p className="mt-2 leading-relaxed">
        In {PHASE_LABEL[phase]} winters the region peaks at{" "}
        <strong className="text-slate-950">{formatPct(signal?.pctOfMedian)}</strong> of typical snowpack:{" "}
        {pctMeaning(signal?.pctOfMedian).toLowerCase()}.
      </p>
      {summary && (
        <PhaseRow
          values={{
            el_nino: { pct: summary.phases.el_nino.pctOfMedian, winters: summary.phases.el_nino.winters },
            la_nina: { pct: summary.phases.la_nina.pctOfMedian, winters: summary.phases.la_nina.winters },
            neutral: { pct: summary.phases.neutral.pctOfMedian, winters: summary.phases.neutral.winters },
          }}
        />
      )}
      <div className="mt-2 text-[11px] text-pine-600 flex items-center gap-1">
        <MousePointerClick className="w-3 h-3" /> Click to zoom in and compare sites across {stateName}
      </div>
    </div>
  );
}

export function StationHoverCard({ station, stats }: { station: SnotelStation; stats: StationRangeStats | undefined }) {
  return (
    <div className={CARD}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-slate-950 text-sm leading-tight flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-pine-600 shrink-0" />
          {station.name}
        </div>
        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-pine-700 font-mono text-[10px]">
          {station.elevation.toLocaleString()} ft
        </span>
      </div>
      <div className="text-[11px] text-slate-600 mt-0.5">
        {station.state} · typical peak SWE {stats?.medianPeakSwe ?? "–"} in · {stats?.winters ?? 0} winters in range
      </div>
      {stats && (
        <PhaseRow
          values={{
            el_nino: { pct: stats.phasePct.el_nino, winters: stats.phaseWinters.el_nino },
            la_nina: { pct: stats.phasePct.la_nina, winters: stats.phaseWinters.la_nina },
            neutral: { pct: stats.phasePct.neutral, winters: stats.phaseWinters.neutral },
          }}
        />
      )}
      <div className="mt-2 text-[11px] text-pine-600 flex items-center gap-1">
        <MousePointerClick className="w-3 h-3" /> Click the dot for this site&apos;s full history
      </div>
    </div>
  );
}

export function ResortHoverCard({
  name,
  state,
  typicalSnow,
  unit,
  sourceLabel,
  phaseValues,
  className,
}: {
  name: string;
  state: string;
  typicalSnow: number | null | undefined;
  unit: "in" | "cm";
  sourceLabel: string;
  phaseValues: Record<EnsoPhase, { pct: number | null; winters: number }>;
  className?: string;
}) {
  return (
    <div className={className ?? CARD}>
      <div className="font-semibold text-slate-950 text-sm leading-tight">{name}</div>
      <div className="text-[11px] text-slate-600 mt-0.5">
        {state}
        {typicalSnow != null ? ` · typical season ${typicalSnow} ${unit}` : ""} · {sourceLabel}
      </div>
      <PhaseRow values={phaseValues} />
      <div className="mt-2 text-[11px] text-pine-600 flex items-center gap-1">
        <MousePointerClick className="w-3 h-3" /> Click for this resort&apos;s snowfall history
      </div>
    </div>
  );
}
