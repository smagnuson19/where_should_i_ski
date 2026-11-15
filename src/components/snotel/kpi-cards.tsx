"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { StormSummaryMetrics } from "@/types/snotel";
import { ENSO_PHASES, RegionRangeSummary } from "@/types/snotel-range";
import { Term } from "@/components/snotel/glossary";
import { formatPct } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL, PHASE_STYLE } from "@/lib/snotel/year-range";

interface KpiCardsProps {
  summary: RegionRangeSummary | undefined;
  storm: Record<string, StormSummaryMetrics> | undefined;
  sweMultiplier: number;
  tempOffsetF: number;
}

const CARD = "rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-1.5";
const fmt = (v: number | null | undefined, digits = 1) => (v === null || v === undefined ? "–" : v.toFixed(digits));

export function KpiCards({ summary, storm, sweMultiplier, tempOffsetF }: KpiCardsProps) {
  if (!summary) return null;
  const temp = (v: number | null) => (v === null ? null : v + tempOffsetF);
  const tempGap =
    summary.phases.el_nino.winterTavg !== null && summary.phases.la_nina.winterTavg !== null
      ? summary.phases.el_nino.winterTavg - summary.phases.la_nina.winterTavg
      : null;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className={CARD}>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          Typical <Term k="peakSwe">Peak SWE</Term>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-slate-950">
          {summary.typicalPeakSwe !== null ? `${(summary.typicalPeakSwe * sweMultiplier).toFixed(1)} in` : "–"}
        </div>
        <div className="text-xs text-slate-600">
          Median station · <span className="font-mono text-slate-700">{summary.siteCount}</span> sites
        </div>
      </div>

      <div className={CARD}>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          Peak Snowpack (<Term k="pctMedian">% of Median</Term>)
        </div>
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          {ENSO_PHASES.map((p) => (
            <div key={p} className="rounded-lg bg-slate-100/60 border border-slate-200/70 px-2 py-1">
              <div className={`text-[10px] font-semibold ${PHASE_STYLE[p].text}`}>{PHASE_LABEL[p]}</div>
              <div className="text-sm sm:text-base font-bold font-mono text-slate-950 flex items-center gap-1">
                {formatPct(summary.phases[p].pctOfMedian)}
                {summary.phases[p].lowConfidence && (
                  <AlertTriangle className="w-3 h-3 text-amber-600" aria-label="low confidence" />
                )}
              </div>
              <div className="text-[10px] font-mono text-slate-600">n={summary.phases[p].winters}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={CARD}>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          Winter Temp (Nov–Mar Mean)
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-emerald-700">
          {fmt(temp(summary.winterTavg))}°F
        </div>
        <div className="text-xs text-slate-600">
          {tempGap === null
            ? "Not enough temperature data"
            : `El Niño runs ${Math.abs(tempGap).toFixed(1)}°F ${tempGap >= 0 ? "warmer" : "colder"} than La Niña`}
        </div>
      </div>

      <div className={CARD}>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          Snowfall Days (≥2 in / ≥6 in)
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-sky-700">
          {fmt(storm?.all?.events2in)} <span className="text-slate-500 font-normal">/</span> {fmt(storm?.all?.events6in)}{" "}
          <span className="text-sm font-sans font-medium text-slate-700">days</span>
        </div>
        <div className="text-xs text-slate-600">
          EN <span className="font-mono text-slate-800">{fmt(storm?.el_nino?.events2in)}</span> · LN{" "}
          <span className="font-mono text-slate-800">{fmt(storm?.la_nina?.events2in)}</span> days ≥2 in
        </div>
      </div>
    </section>
  );
}
