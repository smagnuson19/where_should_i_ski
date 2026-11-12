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

const CARD = "rounded-xl border border-slate-800 bg-slate-900/60 p-3";
const fmt = (v: number | null | undefined, digits = 1) => (v === null || v === undefined ? "–" : v.toFixed(digits));

export function KpiCards({ summary, storm, sweMultiplier, tempOffsetF }: KpiCardsProps) {
  if (!summary) return null;
  const temp = (v: number | null) => (v === null ? null : v + tempOffsetF);
  const tempGap =
    summary.phases.el_nino.winterTavg !== null && summary.phases.la_nina.winterTavg !== null
      ? summary.phases.el_nino.winterTavg - summary.phases.la_nina.winterTavg
      : null;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className={CARD}>
        <div className="text-[11px] text-slate-400">
          Typical <Term k="peakSwe">peak SWE</Term>
        </div>
        <div className="text-xl font-bold text-white mt-0.5">
          {summary.typicalPeakSwe !== null ? `${(summary.typicalPeakSwe * sweMultiplier).toFixed(1)} in` : "–"}
        </div>
        <div className="text-[11px] text-slate-400">Median site · {summary.siteCount} sites</div>
      </div>

      <div className={CARD}>
        <div className="text-[11px] text-slate-400">
          Peak snowpack by phase (<Term k="pctMedian">% of median</Term>)
        </div>
        <div className="grid grid-cols-3 gap-1 mt-1">
          {ENSO_PHASES.map((p) => (
            <div key={p}>
              <div className={`text-[10px] ${PHASE_STYLE[p].text}`}>{PHASE_LABEL[p]}</div>
              <div className="text-base font-bold text-white flex items-center gap-1">
                {formatPct(summary.phases[p].pctOfMedian)}
                {summary.phases[p].lowConfidence && <AlertTriangle className="w-3 h-3 text-amber-400" aria-label="low confidence" />}
              </div>
              <div className="text-[10px] text-slate-500">{summary.phases[p].winters} winters</div>
            </div>
          ))}
        </div>
      </div>

      <div className={CARD}>
        <div className="text-[11px] text-slate-400">Winter temperature (Nov–Mar mean)</div>
        <div className="text-xl font-bold text-emerald-300 mt-0.5">{fmt(temp(summary.winterTavg))}°F</div>
        <div className="text-[11px] text-slate-400">
          {tempGap === null
            ? "Not enough temperature data"
            : `El Niño runs ${Math.abs(tempGap).toFixed(1)}°F ${tempGap >= 0 ? "warmer" : "colder"} than La Niña`}
        </div>
      </div>

      <div className={CARD}>
        <div className="text-[11px] text-slate-400">Snowfall days per winter (≥2 in / ≥6 in)</div>
        <div className="text-xl font-bold text-purple-300 mt-0.5">
          {fmt(storm?.all?.events2in)} / {fmt(storm?.all?.events6in)} days
        </div>
        <div className="text-[11px] text-slate-400">
          El Niño {fmt(storm?.el_nino?.events2in)} · La Niña {fmt(storm?.la_nina?.events2in)} days ≥2 in ·{" "}
          {storm?.all?.sampleStationYears ?? 0} site-winters
        </div>
      </div>
    </section>
  );
}
