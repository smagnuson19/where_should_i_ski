"use client";

import React from "react";
import { AlertTriangle, Lightbulb, Wind } from "lucide-react";
import { EnsoPhase } from "@/types/snotel";
import { RankedRegion, skierTip } from "@/lib/snotel/story";
import { formatPct, pctColor } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL, PHASE_STYLE } from "@/lib/snotel/year-range";

interface MapTakeawaysProps {
  phase: EnsoPhase;
  ranked: RankedRegion[];
  selectedRegion: string;
  onSelectRegion: (regionId: string) => void;
  subtitle: string;
  whyTitle: string;
  why: string;
  note?: string;
}

/** Bars are drawn on a 50%–150% axis with 100% (a typical winter) in the middle. */
function barGeometry(pct: number) {
  const clamped = Math.max(50, Math.min(150, pct));
  const left = clamped >= 100 ? 50 : ((clamped - 50) / 100) * 100;
  const width = Math.abs(clamped - 100);
  return { left: `${left}%`, width: `${width}%` };
}

export function MapTakeaways({
  phase,
  ranked,
  selectedRegion,
  onSelectRegion,
  subtitle,
  whyTitle,
  why,
  note,
}: MapTakeawaysProps) {
  return (
    <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 sm:p-5 space-y-4 h-full flex flex-col justify-between">
      <div className="space-y-3.5">
        <div>
          <h3 className={`text-sm sm:text-base font-bold tracking-tight ${PHASE_STYLE[phase].text}`}>
            {PHASE_LABEL[phase]} Winters: Regional Ranking
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <ul className="space-y-1.5">
          {ranked.map((r) => (
            <li key={r.regionId}>
              <button
                type="button"
                onClick={() => onSelectRegion(r.regionId)}
                className={`w-full text-left rounded-xl px-3 py-2 transition border ${
                  selectedRegion === r.regionId
                    ? "border-sky-500/60 bg-sky-500/15 shadow-xs"
                    : "border-slate-800/40 bg-slate-950/35 hover:bg-slate-800/60 hover:border-slate-700/80"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-100 font-medium flex items-center gap-1.5">
                    {r.name}
                    {r.pct !== null && r.lowConfidence && (
                      <AlertTriangle className="w-3 h-3 text-amber-400" aria-label="low confidence" />
                    )}
                  </span>
                  <span className="font-mono font-bold text-white">{formatPct(r.pct)}</span>
                </div>
                <div className="relative h-2 mt-1.5 rounded-full bg-slate-800/90 overflow-hidden">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-slate-400/70 z-10" />
                  {r.pct !== null && (
                    <div
                      className="absolute inset-y-0 rounded-full"
                      style={{ ...barGeometry(r.pct), backgroundColor: pctColor(r.pct) }}
                    />
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 pt-1">
        <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3.5 space-y-1">
          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-300" /> Bottom Line
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{skierTip(phase, ranked)}</p>
        </div>

        <div className="rounded-xl bg-slate-950/40 border border-slate-800/60 p-3.5 space-y-1.5">
          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-sky-400" /> {whyTitle}
          </div>
          <p className="text-xs text-slate-300/90 leading-relaxed">{why}</p>
          {note && <p className="text-[11px] text-slate-400 leading-relaxed">{note}</p>}
        </div>
      </div>
    </div>
  );
}
