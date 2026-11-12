"use client";

import React from "react";
import { AlertTriangle, Lightbulb, Wind } from "lucide-react";
import { EnsoPhase } from "@/types/snotel";
import { RankedRegion, HINGE_NOTE, PHASE_WHY, skierTip } from "@/lib/snotel/story";
import { formatPct, pctColor } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL, PHASE_STYLE } from "@/lib/snotel/year-range";

interface MapTakeawaysProps {
  phase: EnsoPhase;
  ranked: RankedRegion[];
  selectedRegion: string;
  onSelectRegion: (regionId: string) => void;
}

/** Bars are drawn on a 50%–150% axis with 100% (a typical winter) in the middle. */
function barGeometry(pct: number) {
  const clamped = Math.max(50, Math.min(150, pct));
  const left = clamped >= 100 ? 50 : ((clamped - 50) / 100) * 100;
  const width = Math.abs(clamped - 100);
  return { left: `${left}%`, width: `${width}%` };
}

export function MapTakeaways({ phase, ranked, selectedRegion, onSelectRegion }: MapTakeawaysProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4 h-full">
      <div>
        <h3 className={`text-sm font-bold ${PHASE_STYLE[phase].text}`}>{PHASE_LABEL[phase]} winters: who wins?</h3>
        <p className="text-xs text-slate-400 mt-0.5">Regions ranked by typical peak snowpack. Click one to see its charts.</p>
      </div>

      <ul className="space-y-1">
        {ranked.map((r) => (
          <li key={r.regionId}>
            <button
              type="button"
              onClick={() => onSelectRegion(r.regionId)}
              className={`w-full text-left rounded-md px-2 py-1.5 transition border ${
                selectedRegion === r.regionId ? "border-sky-500/60 bg-sky-500/10" : "border-transparent hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-medium flex items-center gap-1">
                  {r.name}
                  {r.pct !== null && r.lowConfidence && (
                    <AlertTriangle className="w-3 h-3 text-amber-400" aria-label="low confidence" />
                  )}
                </span>
                <span className="font-mono font-semibold text-white">{formatPct(r.pct)}</span>
              </div>
              <div className="relative h-1.5 mt-1 rounded bg-slate-800">
                <div className="absolute inset-y-0 left-1/2 w-px bg-slate-500" />
                {r.pct !== null && (
                  <div className="absolute inset-y-0 rounded" style={{ ...barGeometry(r.pct), backgroundColor: pctColor(r.pct) }} />
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 space-y-1">
        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-300" /> Takeaway
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{skierTip(phase, ranked)}</p>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5 text-sky-400" /> Why
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{PHASE_WHY[phase]}</p>
        {phase !== "neutral" && <p className="text-xs text-slate-500 leading-relaxed">{HINGE_NOTE}</p>}
      </div>
    </div>
  );
}
