"use client";

import React from "react";
import { Mountain, Search } from "lucide-react";
import { EnsoPhase } from "@/types/snotel";
import { ResortSnowfallStats, SkiResort } from "@/types/resorts";
import { Input } from "@/components/ui/input";
import { formatPct, pctColor } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL } from "@/lib/snotel/year-range";

const MAX_LISTED = 90;

interface ResortListProps {
  resorts: SkiResort[];
  stats: Map<string, ResortSnowfallStats>;
  phase: EnsoPhase;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  scopeLabel: string;
  unit: "in" | "cm";
  onOpenResort: (resort: SkiResort) => void;
}

export function ResortList(props: ResortListProps) {
  const { resorts, stats, phase, unit } = props;
  const sorted = [...resorts].sort((a, b) => {
    const pa = stats.get(a.id)?.phases[phase].pctOfTypical ?? -1;
    const pb = stats.get(b.id)?.phases[phase].pctOfTypical ?? -1;
    return pb - pa;
  });

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <Mountain className="w-4 h-4 text-sky-400" />
          Ski resorts: {props.scopeLabel} ({resorts.length})
        </h2>
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <Input
            value={props.searchQuery}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder="Search by resort name or state"
            className="pl-8 h-8 bg-slate-950 border-slate-800 text-xs"
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Percentages are season snowfall in {PHASE_LABEL[phase]} winters vs. that resort&apos;s typical winter — not
        snowpack (SWE).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-80 overflow-y-auto pr-1">
        {sorted.slice(0, MAX_LISTED).map((r) => {
          const s = stats.get(r.id);
          const pct = s?.phases[phase].pctOfTypical ?? null;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => props.onOpenResort(r)}
              className="text-left rounded-lg border border-slate-800/90 bg-slate-950/70 hover:bg-slate-800/80 hover:border-sky-500/50 p-2.5 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-white truncate">{r.name}</span>
                <span className="text-xs font-mono font-semibold flex items-center gap-1.5 text-white">
                  <span
                    className="w-2 h-2 rotate-45"
                    style={{ backgroundColor: r.match === "none" ? "#64748b" : pctColor(pct) }}
                  />
                  {r.match === "none" ? "—" : formatPct(pct)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {r.state} · {r.verticalM.toLocaleString()} m vert
                {s?.typicalSnow != null ? ` · typical ${s.typicalSnow} ${unit}` : ""}
                {r.match === "distant" ? " · distant station" : ""}
                {s?.sourceLabel === "estimated from snow depth" ? " · estimated" : ""}
              </div>
            </button>
          );
        })}
      </div>
      {resorts.length > MAX_LISTED && (
        <p className="text-[11px] text-slate-500">
          Showing the first {MAX_LISTED} of {resorts.length}. Search or pick a region to narrow the list.
        </p>
      )}
    </section>
  );
}
