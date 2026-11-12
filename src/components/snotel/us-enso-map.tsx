"use client";

import React, { useMemo, useState } from "react";
import { EnsoPhase, RegionInfo, SnotelStation } from "@/types/snotel";
import { RegionRangeSummary, StationRangeStats } from "@/types/snotel-range";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  NATION_OUTLINE_PATH,
  RegionOutline,
  STATE_BORDERS_PATH,
  STATE_SHAPES,
  StateSiteBreakdown,
  projectLonLat,
} from "@/lib/snotel/us-map";
import { OUTSIDE_NETWORK_COLOR, formatPct, pctColor } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL } from "@/lib/snotel/year-range";
import { RegionHoverCard, StationHoverCard } from "@/components/snotel/map-hover-card";

interface UsEnsoMapProps {
  regions: Record<string, RegionInfo>;
  summaries: Record<string, RegionRangeSummary>;
  stateAssignments: Record<string, StateSiteBreakdown>;
  outlines: RegionOutline[];
  phase: EnsoPhase;
  selectedRegion: string;
  onSelectRegion: (regionId: string) => void;
  sites: SnotelStation[] | null;
  stationStats: Map<string, StationRangeStats>;
  activeStation: SnotelStation | null;
  onOpenStation: (station: SnotelStation) => void;
}

type Hover = { kind: "state"; postal: string; name: string } | { kind: "station"; station: SnotelStation } | null;

const shortLabel = (name: string) => name.replace(/\s*\(.*\)/, "");

export function UsEnsoMap(props: UsEnsoMapProps) {
  const { regions, summaries, stateAssignments, outlines, phase, selectedRegion, sites, stationStats } = props;
  const [hover, setHover] = useState<Hover>(null);

  const regionPct = (regionId: string) => summaries[regionId]?.phases[phase].pctOfMedian ?? null;

  const points = useMemo(
    () =>
      (sites ?? []).flatMap((st) => {
        const xy = projectLonLat(st.lon, st.lat);
        return xy ? [{ st, x: xy[0], y: xy[1] }] : [];
      }),
    [sites]
  );

  const hoveredState = hover?.kind === "state" ? stateAssignments[hover.postal] : null;

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-slate-950">
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="w-full h-auto select-none" role="group" aria-label={`US map of ${PHASE_LABEL[phase]} snowpack by region`}>
        <path d={NATION_OUTLINE_PATH} fill={OUTSIDE_NETWORK_COLOR} stroke="#334155" strokeWidth={1} />
        {STATE_SHAPES.map((s) => {
          const assignment = s.postal ? stateAssignments[s.postal] : undefined;
          if (!assignment) return <path key={s.fips} d={s.d} fill={OUTSIDE_NETWORK_COLOR} />;
          const regionId = assignment.regionId;
          const pct = regionPct(regionId);
          const dimmed = selectedRegion !== "ALL" && selectedRegion !== regionId;
          const label = `${s.name}: ${regions[regionId]?.shortName}, ${formatPct(pct)} of typical snowpack in ${PHASE_LABEL[phase]} winters. Open region charts.`;
          return (
            <path
              key={s.fips}
              d={s.d}
              fill={pctColor(pct)}
              fillOpacity={dimmed ? 0.45 : 0.92}
              stroke={hover?.kind === "state" && hover.postal === s.postal ? "#ffffff" : "none"}
              strokeWidth={1.5}
              className="cursor-pointer outline-none focus-visible:stroke-white"
              role="button"
              tabIndex={0}
              aria-label={label}
              onMouseEnter={() => setHover({ kind: "state", postal: assignment.postal, name: s.name })}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover({ kind: "state", postal: assignment.postal, name: s.name })}
              onBlur={() => setHover(null)}
              onClick={() => props.onSelectRegion(regionId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  props.onSelectRegion(regionId);
                }
              }}
            />
          );
        })}
        <path d={STATE_BORDERS_PATH} fill="none" stroke="#020617" strokeOpacity={0.55} strokeWidth={0.75} pointerEvents="none" />
        {outlines.map((o) => (
          <path
            key={o.regionId}
            d={o.d}
            fill="none"
            stroke={selectedRegion === o.regionId ? "#ffffff" : "#0f172a"}
            strokeWidth={selectedRegion === o.regionId ? 3 : 1.8}
            pointerEvents="none"
          />
        ))}

        {points.map(({ st, x, y }) => {
          const active = props.activeStation?.triplet === st.triplet || (hover?.kind === "station" && hover.station.triplet === st.triplet);
          const dimmed = selectedRegion !== "ALL" && st.region !== selectedRegion;
          return (
            <circle
              key={st.triplet}
              cx={x}
              cy={y}
              r={active ? 5.5 : 2.6}
              fill={pctColor(stationStats.get(st.triplet)?.phasePct[phase])}
              fillOpacity={dimmed ? 0.3 : 1}
              stroke={active ? "#ffffff" : "#020617"}
              strokeWidth={active ? 1.8 : 0.7}
              className="cursor-pointer"
              onMouseEnter={() => setHover({ kind: "station", station: st })}
              onMouseLeave={() => setHover(null)}
              onClick={() => props.onOpenStation(st)}
            />
          );
        })}

        {outlines.map((o) => {
          const name = shortLabel(regions[o.regionId]?.shortName ?? o.regionId);
          const width = Math.max(name.length * 6.4 + 18, 64);
          return (
            <g key={`label-${o.regionId}`} transform={`translate(${o.labelAt[0]},${o.labelAt[1]})`} pointerEvents="none">
              <rect x={-width / 2} y={-19} width={width} height={36} rx={7} fill="#020617" fillOpacity={0.78} />
              <text y={-5} textAnchor="middle" fill="#cbd5e1" fontSize={11} fontWeight={600}>{name}</text>
              <text y={12} textAnchor="middle" fill="#ffffff" fontSize={15} fontWeight={800}>{formatPct(regionPct(o.regionId))}</text>
            </g>
          );
        })}
      </svg>

      {hover?.kind === "station" && <StationHoverCard station={hover.station} stats={stationStats.get(hover.station.triplet)} />}
      {hover?.kind === "state" && hoveredState && regions[hoveredState.regionId] && (
        <RegionHoverCard
          stateName={hover.name}
          breakdown={hoveredState}
          region={regions[hoveredState.regionId]}
          summary={summaries[hoveredState.regionId]}
          phase={phase}
        />
      )}
    </div>
  );
}
