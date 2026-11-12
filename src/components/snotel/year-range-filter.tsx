"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { EnsoPhase } from "@/types/snotel";
import { ENSO_PHASES, PhaseRecord, YearRange } from "@/types/snotel-range";
import { Slider } from "@/components/ui/slider";
import {
  LOW_CONFIDENCE_WINTERS,
  PHASE_LABEL,
  PHASE_STYLE,
  winterSpan,
  yearRangePresets,
} from "@/lib/snotel/year-range";

interface YearRangeFilterProps {
  range: YearRange;
  onRangeChange: (range: YearRange) => void;
  firstYear: number;
  lastYear: number;
  phaseCounts: PhaseRecord<number> & { total: number };
}

export function YearRangeFilter({
  range,
  onRangeChange,
  firstYear,
  lastYear,
  phaseCounts,
}: YearRangeFilterProps) {
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const shown = draft ?? [range.start, range.end];
  const presets = yearRangePresets(firstYear, lastYear);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((p) => {
          const active = p.range.start === range.start && p.range.end === range.end;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onRangeChange(p.range)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                active
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-slate-300 w-10 text-right">{shown[0]}</span>
        <Slider
          aria-label="Water-year range"
          value={shown}
          min={firstYear}
          max={lastYear}
          step={1}
          minStepsBetweenValues={1}
          onValueChange={(v) => Array.isArray(v) && setDraft([v[0], v[1]])}
          onValueCommitted={(v) => {
            setDraft(null);
            if (Array.isArray(v)) onRangeChange({ start: v[0], end: v[1] });
          }}
        />
        <span className="font-mono text-xs text-slate-300 w-10">{shown[1]}</span>
      </div>

      <div className="text-[11px] text-slate-400">
        <span className="text-slate-200 font-medium">{phaseCounts.total} winters</span> ({winterSpan(range)}):{" "}
        {ENSO_PHASES.map((p: EnsoPhase, i) => (
          <span key={p}>
            <span className={PHASE_STYLE[p].text}>
              {phaseCounts[p]} {PHASE_LABEL[p]}
            </span>
            {phaseCounts[p] < LOW_CONFIDENCE_WINTERS && (
              <AlertTriangle className="inline w-3 h-3 ml-0.5 -mt-0.5 text-amber-400" aria-label="low confidence" />
            )}
            {i < ENSO_PHASES.length - 1 ? " · " : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
