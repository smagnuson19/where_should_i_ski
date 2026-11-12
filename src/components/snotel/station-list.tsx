"use client";

import React from "react";
import { MapPin, Search } from "lucide-react";
import { EnsoPhase, SnotelStation } from "@/types/snotel";
import { StationRangeStats } from "@/types/snotel-range";
import { Input } from "@/components/ui/input";
import { formatPct, pctColor } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL } from "@/lib/snotel/year-range";

const MAX_LISTED = 90;

interface StationListProps {
  stations: SnotelStation[];
  stationStats: Map<string, StationRangeStats>;
  phase: EnsoPhase;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  scopeLabel: string;
  onOpenStation: (station: SnotelStation) => void;
}

export function StationList(props: StationListProps) {
  const { stations, stationStats, phase } = props;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-sky-400" />
          SNOTEL sites: {props.scopeLabel} ({stations.length})
        </h2>
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <Input
            value={props.searchQuery}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder="Search by site name, state (CO, WA...), county or ID"
            className="pl-8 h-8 bg-slate-950 border-slate-800 text-xs"
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Click a site for its full history. Percentages are {PHASE_LABEL[phase]} winters vs. that site&apos;s typical winter in
        the selected years.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-80 overflow-y-auto pr-1">
        {stations.slice(0, MAX_LISTED).map((st) => {
          const s = stationStats.get(st.triplet);
          const pct = s?.phasePct[phase] ?? null;
          return (
            <button
              key={st.triplet}
              type="button"
              onClick={() => props.onOpenStation(st)}
              className="text-left rounded-lg border border-slate-800/90 bg-slate-950/70 hover:bg-slate-800/80 hover:border-sky-500/50 p-2.5 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-white truncate">{st.name}</span>
                <span className="text-xs font-mono font-semibold flex items-center gap-1.5 text-white">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pctColor(pct) }} />
                  {formatPct(pct)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {st.state} · {st.elevation.toLocaleString()} ft · typical peak {s?.medianPeakSwe ?? "–"} in SWE
              </div>
            </button>
          );
        })}
      </div>
      {stations.length > MAX_LISTED && (
        <p className="text-[11px] text-slate-500">
          Showing the first {MAX_LISTED} of {stations.length}. Search or pick a region to narrow the list.
        </p>
      )}
    </section>
  );
}
