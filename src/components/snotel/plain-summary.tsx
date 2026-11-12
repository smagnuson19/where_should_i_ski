"use client";

import React from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { EnsoPhase, RegionInfo } from "@/types/snotel";
import { ENSO_PHASES, PhaseRecord, RegionRangeSummary, YearRange } from "@/types/snotel-range";
import { Term } from "@/components/snotel/glossary";
import { bestAndWorst, rankRegions, RankedRegion } from "@/lib/snotel/story";
import { formatPct } from "@/lib/snotel/enso-scale";
import { LOW_CONFIDENCE_WINTERS, PHASE_LABEL, PHASE_STYLE, winterSpan } from "@/lib/snotel/year-range";

interface PlainSummaryProps {
  summaries: Record<string, RegionRangeSummary>;
  regions: Record<string, RegionInfo>;
  phaseCounts: PhaseRecord<number> & { total: number };
  range: YearRange;
  bandLabel: string;
}

const BORDER: Record<EnsoPhase, string> = {
  el_nino: "border-l-orange-500",
  la_nina: "border-l-sky-500",
  neutral: "border-l-slate-500",
};

function PhaseSentence({ ranked }: { ranked: RankedRegion[] }) {
  const { best, worst, spread } = bestAndWorst(ranked);
  if (!best || !worst) {
    return <p className="text-xs text-slate-400">Not enough data for this selection.</p>;
  }
  if (spread <= 10) {
    return (
      <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
        No single standout — every region stays near normal, between{" "}
        <span className="font-mono font-semibold text-white">{formatPct(worst.pct)}</span> and{" "}
        <span className="font-mono font-semibold text-white">{formatPct(best.pct)}</span> of typical.
      </p>
    );
  }
  return (
    <div className="space-y-1 text-xs sm:text-[13px] leading-snug">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-slate-400">
          Best: <strong className="font-semibold text-slate-100">{best.name}</strong>
        </span>
        <span className="font-mono font-bold text-emerald-300">{formatPct(best.pct)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-slate-400">
          Lowest: <strong className="font-medium text-slate-300">{worst.name}</strong>
        </span>
        <span className="font-mono font-semibold text-amber-300/90">{formatPct(worst.pct)}</span>
      </div>
    </div>
  );
}

/** One card per ENSO phase naming the best and worst region. */
export function PhaseCards({
  rankedByPhase,
  phaseCounts,
}: {
  rankedByPhase: PhaseRecord<RankedRegion[]>;
  phaseCounts: PhaseRecord<number>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {ENSO_PHASES.map((p) => (
        <div
          key={p}
          className={`rounded-xl border border-slate-800/90 border-l-4 ${BORDER[p]} bg-slate-950/60 p-3.5 space-y-2`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-bold tracking-tight ${PHASE_STYLE[p].text}`}>{PHASE_LABEL[p]} Winters</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
              n={phaseCounts[p]}
              {phaseCounts[p] < LOW_CONFIDENCE_WINTERS && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-sans text-amber-300">
                  <AlertTriangle className="w-3 h-3" /> low n
                </span>
              )}
            </span>
          </div>
          <PhaseSentence ranked={rankedByPhase[p]} />
        </div>
      ))}
    </div>
  );
}

export function ThinPhasesNote({ phaseCounts }: { phaseCounts: PhaseRecord<number> }) {
  const thinPhases = ENSO_PHASES.filter((p) => phaseCounts[p] < LOW_CONFIDENCE_WINTERS);
  if (!thinPhases.length) return null;
  return (
    <p className="text-xs text-amber-300 flex items-start gap-1.5">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>
        Only {thinPhases.map((p) => `${phaseCounts[p]} ${PHASE_LABEL[p]}`).join(" and ")} winters fall in these years.
        Treat those results as <Term k="lowConfidence">low confidence</Term>, or widen the year range.
      </span>
    </p>
  );
}

export function PlainSummary({ summaries, regions, phaseCounts, range, bandLabel }: PlainSummaryProps) {
  const west = summaries.ALL?.phases;
  const rankedByPhase = Object.fromEntries(
    ENSO_PHASES.map((p) => [p, rankRegions(summaries, regions, p)])
  ) as PhaseRecord<RankedRegion[]>;

  return (
    <section className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-950/35 via-slate-900/80 to-slate-900/60 p-4 sm:p-5 space-y-3.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          At a Glance: How ENSO Splits the West
        </h2>
        <span className="text-xs font-mono text-slate-400 bg-slate-950/60 border border-slate-800/80 px-2.5 py-0.5 rounded-full">
          {phaseCounts.total} winters · {winterSpan(range)} · {bandLabel}
        </span>
      </div>

      {west && (
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
          Across all Western <Term k="snotel">SNOTEL</Term> sites, median winter snowpack peaks at{" "}
          <strong className="font-mono font-semibold text-orange-300">{formatPct(west.el_nino.pctOfMedian)}</strong> of
          normal in El Niño,{" "}
          <strong className="font-mono font-semibold text-sky-300">{formatPct(west.la_nina.pctOfMedian)}</strong> in La
          Niña, and{" "}
          <strong className="font-mono font-semibold text-slate-100">{formatPct(west.neutral.pctOfMedian)}</strong> in
          Neutral winters (<Term k="pctMedian">% of median</Term> <Term k="peakSwe">peak SWE</Term>). The real divide is
          north vs. south:
        </p>
      )}

      <PhaseCards rankedByPhase={rankedByPhase} phaseCounts={phaseCounts} />
      <ThinPhasesNote phaseCounts={phaseCounts} />
    </section>
  );
}
