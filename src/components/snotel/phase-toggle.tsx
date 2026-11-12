"use client";

import React from "react";
import { EnsoPhase } from "@/types/snotel";
import { ENSO_PHASES } from "@/types/snotel-range";
import { PHASE_LABEL, PHASE_STYLE } from "@/lib/snotel/year-range";

interface PhaseToggleProps {
  phase: EnsoPhase;
  onPhaseChange: (phase: EnsoPhase) => void;
}

export function PhaseToggle({ phase, onPhaseChange }: PhaseToggleProps) {
  return (
    <div role="radiogroup" aria-label="ENSO phase shown on the map" className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-1 gap-1">
      {ENSO_PHASES.map((p) => {
        const active = p === phase;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPhaseChange(p)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition ${
              active ? PHASE_STYLE[p].active : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {PHASE_LABEL[p]}
          </button>
        );
      })}
    </div>
  );
}
