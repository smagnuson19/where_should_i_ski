"use client";

import React from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { EnsoPhase, RegionInfo } from "@/types/snotel";
import { ENSO_PHASES, PhaseRecord, RegionRangeSummary, YearRange } from "@/types/snotel-range";
import { Term } from "@/components/snotel/glossary";
import { bestAndWorst, rankRegions } from "@/lib/snotel/story";
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

function PhaseSentence({ phase, summaries, regions }: Omit<PlainSummaryProps, "phaseCounts" | "range" | "bandLabel"> & { phase: EnsoPhase }) {
  const ranked = rankRegions(summaries, regions, phase);
  const { best, worst, spread } = bestAndWorst(ranked);
  if (!best || !worst) return <p className="text-sm text-slate-300">Not enough data for this selection.</p>;
  if (spread < 10) {
    return (
      <p className="text-sm text-slate-200 leading-relaxed">
        No clear winner: every region lands between {formatPct(worst.pct)} and {formatPct(best.pct)} of typical.
      </p>
    );
  }
  return (
    <p className="text-sm text-slate-200 leading-relaxed">
      <strong className="text-white">{best.name}</strong> does best ({formatPct(best.pct)} of typical);{" "}
      <strong className="text-white">{worst.name}</strong> does worst ({formatPct(worst.pct)}).
    </p>
  );
}

export function PlainSummary({ summaries, regions, phaseCounts, range, bandLabel }: PlainSummaryProps) {
  const west = summaries.ALL?.phases;
  const thinPhases = ENSO_PHASES.filter((p) => phaseCounts[p] < LOW_CONFIDENCE_WINTERS);

  return (
    <section className="rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-slate-900/70 to-slate-900/60 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          The short version
        </h2>
        <span className="text-xs text-slate-400">
          {phaseCounts.total} winters, {winterSpan(range)} · {bandLabel}
        </span>
      </div>

      {west && (
        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
          Across all Western <Term k="snotel">SNOTEL</Term> sites, a typical El Niño winter peaks at{" "}
          <strong className="text-orange-300">{formatPct(west.el_nino.pctOfMedian)}</strong> of normal snowpack, La Niña at{" "}
          <strong className="text-sky-300">{formatPct(west.la_nina.pctOfMedian)}</strong> and Neutral at{" "}
          <strong className="text-slate-100">{formatPct(west.neutral.pctOfMedian)}</strong> (
          <Term k="pctMedian">% of median</Term> <Term k="peakSwe">peak SWE</Term>). The real story is regional:
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ENSO_PHASES.map((p) => (
          <div key={p} className={`rounded-lg border border-slate-800 border-l-4 ${BORDER[p]} bg-slate-950/50 p-3 space-y-1`}>
            <div className={`text-xs font-semibold ${PHASE_STYLE[p].text} flex items-center gap-1.5`}>
              {PHASE_LABEL[p]} winters ({phaseCounts[p]})
              {phaseCounts[p] < LOW_CONFIDENCE_WINTERS && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300">
                  <AlertTriangle className="w-3 h-3" /> low confidence
                </span>
              )}
            </div>
            <PhaseSentence phase={p} summaries={summaries} regions={regions} />
          </div>
        ))}
      </div>

      {thinPhases.length > 0 && (
        <p className="text-xs text-amber-300 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Only {thinPhases.map((p) => `${phaseCounts[p]} ${PHASE_LABEL[p]}`).join(" and ")} winters fall in these years.
            Treat those results as <Term k="lowConfidence">low confidence</Term>, or widen the year range.
          </span>
        </p>
      )}
    </section>
  );
}
