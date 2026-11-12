"use client";

import React, { useMemo, useState } from "react";
import { MapPin, MousePointerClick } from "lucide-react";
import { EnsoPhase } from "@/types/snotel";
import { ENSO_PHASES } from "@/types/snotel-range";
import { StationData } from "@/types/japan-enso";
import { JapanRegionSummary } from "@/lib/japan/analysis";
import {
  AREA_SHAPES,
  COASTLINE_PATH,
  MAP_HEIGHT,
  MAP_WIDTH,
  PREFECTURE_BORDERS_PATH,
  PREFECTURE_NAMES,
  REGION_OUTLINES,
  projectLonLat,
} from "@/lib/japan/map";
import { JAPAN_REGIONS, JAPAN_REGION_BY_ID, TO_JMA_PHASE } from "@/lib/japan/regions";
import { OUTSIDE_NETWORK_COLOR, formatPct, pctColor, pctMeaning } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL, PHASE_STYLE } from "@/lib/snotel/year-range";
import { HOVER_CARD_BASE, PhaseRow } from "@/components/snotel/map-hover-card";

const SEA_LABELS: { text: string; at: [number, number] }[] = [
  { text: "Sea of Japan", at: [134.0, 41.6] },
  { text: "Pacific Ocean", at: [144.2, 37.0] },
];

interface JapanEnsoMapProps {
  summaries: Record<string, JapanRegionSummary>;
  phase: EnsoPhase;
  selectedRegion: string;
  onSelectRegion: (regionId: string) => void;
  stations: StationData[] | null;
}

type Hover = { kind: "region"; regionId: string; prefecture?: string } | { kind: "station"; station: StationData } | null;

function xy(lonLat: [number, number]): [number, number] {
  return projectLonLat(lonLat[0], lonLat[1]) ?? [0, 0];
}

/** The open sea on the left takes the hover card; it drops to the bottom corner for northern places so it never covers them. */
function cardClass(lonLat: [number, number]): string {
  const corner = xy(lonLat)[1] < MAP_HEIGHT / 2 ? "bottom-3 left-3" : "top-3 left-3";
  return `absolute ${corner} ${HOVER_CARD_BASE}`;
}

export function JapanEnsoMap({ summaries, phase, selectedRegion, onSelectRegion, stations }: JapanEnsoMapProps) {
  const [hover, setHover] = useState<Hover>(null);
  const regionPct = (regionId: string) => summaries[regionId]?.phases[phase].pctOfTypical ?? null;
  const hoveredRegion = hover?.kind === "region" ? hover.regionId : null;

  const points = useMemo(
    () =>
      (stations ?? []).flatMap((st) => {
        const p = projectLonLat(st.lon, st.lat);
        return p ? [{ st, x: p[0], y: p[1] }] : [];
      }),
    [stations]
  );

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-slate-950">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="w-full h-auto select-none"
        role="group"
        aria-label={`Map of Japan's eight snow regions, shaded by snowfall in ${PHASE_LABEL[phase]} winters`}
      >
        {SEA_LABELS.map((s) => {
          const [x, y] = xy(s.at);
          return (
            <text key={s.text} x={x} y={y} textAnchor="middle" fill="#334155" fontSize={13} fontStyle="italic" letterSpacing={1}>
              {s.text}
            </text>
          );
        })}

        {AREA_SHAPES.map((a) => {
          if (!a.regionId) return <path key={a.code} d={a.d} fill={OUTSIDE_NETWORK_COLOR} />;
          const regionId = a.regionId;
          return (
            <path
              key={a.code}
              d={a.d}
              fill={pctColor(regionPct(regionId))}
              fillOpacity={0.92}
              className="cursor-pointer"
              onMouseEnter={() => setHover({ kind: "region", regionId, prefecture: PREFECTURE_NAMES[a.prefecture] })}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelectRegion(regionId)}
            />
          );
        })}
        <path d={COASTLINE_PATH} fill="none" stroke="#334155" strokeWidth={0.8} pointerEvents="none" />
        <path d={PREFECTURE_BORDERS_PATH} fill="none" stroke="#020617" strokeOpacity={0.5} strokeWidth={0.6} pointerEvents="none" />
        {REGION_OUTLINES.map((o) => {
          const emphasized = o.regionId === selectedRegion || o.regionId === hoveredRegion;
          return (
            <path
              key={o.regionId}
              d={o.d}
              fill="none"
              stroke={emphasized ? "#ffffff" : "#0f172a"}
              strokeWidth={o.regionId === selectedRegion ? 2.6 : emphasized ? 1.8 : 1.4}
              pointerEvents="none"
            />
          );
        })}

        {points.map(({ st, x, y }) => {
          const active = hover?.kind === "station" && hover.station.station_id === st.station_id;
          return (
            <circle
              key={st.station_id}
              cx={x}
              cy={y}
              r={active ? 5.5 : 3.2}
              fill="#f8fafc"
              stroke="#020617"
              strokeWidth={active ? 1.8 : 1}
              className="cursor-pointer"
              onMouseEnter={() => setHover({ kind: "station", station: st })}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelectRegion(st.region_id)}
            />
          );
        })}

        {JAPAN_REGIONS.map((r) => {
          const [lx, ly] = xy(r.labelAt);
          const [ax, ay] = xy(r.anchorAt);
          return (
            <line key={`leader-${r.id}`} x1={lx} y1={ly} x2={ax} y2={ay} stroke="#e2e8f0" strokeOpacity={0.55} strokeWidth={1} pointerEvents="none" />
          );
        })}
        {JAPAN_REGIONS.map((r) => {
          const [lx, ly] = xy(r.labelAt);
          const width = Math.max(r.shortName.length * 6.3 + 34, 84);
          const isSelected = selectedRegion === r.id;
          const pct = regionPct(r.id);
          return (
            <g
              key={`badge-${r.id}`}
              transform={`translate(${lx},${ly})`}
              className="cursor-pointer outline-none"
              role="button"
              tabIndex={0}
              aria-label={`${r.name}: ${formatPct(pct)} of typical snowfall in ${PHASE_LABEL[phase]} winters. Show region details.`}
              onMouseEnter={() => setHover({ kind: "region", regionId: r.id })}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover({ kind: "region", regionId: r.id })}
              onBlur={() => setHover(null)}
              onClick={() => onSelectRegion(r.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectRegion(r.id);
                }
              }}
            >
              <rect
                x={-width / 2}
                y={-20}
                width={width}
                height={38}
                rx={8}
                fill="#020617"
                fillOpacity={0.9}
                stroke={isSelected || hoveredRegion === r.id ? "#38bdf8" : "#334155"}
                strokeWidth={isSelected ? 1.5 : 1}
              />
              <rect x={-width / 2 + 8} y={-14} width={4} height={26} rx={2} fill={pctColor(pct)} />
              <text y={-5} textAnchor="middle" fill="#cbd5e1" fontSize={10.5} fontWeight={600}>
                {r.shortName}
              </text>
              <text y={12} textAnchor="middle" fill="#ffffff" fontSize={14} fontWeight={700} style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatPct(pct)}
              </text>
            </g>
          );
        })}
      </svg>

      {hover?.kind === "region" && (
        <RegionCard regionId={hover.regionId} prefecture={hover.prefecture} summary={summaries[hover.regionId]} phase={phase} />
      )}
      {hover?.kind === "station" && <StationCard station={hover.station} />}
    </div>
  );
}

function RegionCard({
  regionId,
  prefecture,
  summary,
  phase,
}: {
  regionId: string;
  prefecture?: string;
  summary: JapanRegionSummary | undefined;
  phase: EnsoPhase;
}) {
  const info = JAPAN_REGION_BY_ID[regionId];
  if (!info || !summary) return null;
  const pct = summary.phases[phase].pctOfTypical;
  return (
    <div className={cardClass(info.anchorAt)}>
      <div className="font-semibold text-white text-sm">{info.name}</div>
      <div className="text-[11px] text-slate-400">
        {prefecture ? `${prefecture} · ` : ""}
        {info.places}
      </div>
      <p className="mt-2 leading-relaxed">
        In {PHASE_LABEL[phase]} winters the region gets <strong className="text-white">{formatPct(pct)}</strong> of its
        typical snowfall: {pctMeaning(pct).toLowerCase()}.
      </p>
      <PhaseRow
        values={{
          el_nino: { pct: summary.phases.el_nino.pctOfTypical, winters: summary.phases.el_nino.winters },
          la_nina: { pct: summary.phases.la_nina.pctOfTypical, winters: summary.phases.la_nina.winters },
          neutral: { pct: summary.phases.neutral.pctOfTypical, winters: summary.phases.neutral.winters },
        }}
      />
      <div className="mt-2 text-[11px] text-slate-400">
        Typical winter: <span className="font-mono text-slate-200">{summary.typicalCm?.toLocaleString() ?? "–"} cm</span> ·{" "}
        {summary.stationCount} stations
      </div>
      <div className="mt-1.5 text-[11px] text-sky-400 flex items-center gap-1">
        <MousePointerClick className="w-3 h-3" /> Click to see this region&apos;s details
      </div>
    </div>
  );
}

function StationCard({ station }: { station: StationData }) {
  const region = JAPAN_REGION_BY_ID[station.region_id];
  return (
    <div className={cardClass([station.lon, station.lat])}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-white text-sm leading-tight flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          {station.name_en} <span className="font-normal text-slate-400">{station.name_ja}</span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px]">
          {Math.round(station.elevation_m).toLocaleString()} m
        </span>
      </div>
      <div className="text-[11px] text-slate-400 mt-0.5">
        {region?.shortName} · 1991–2020 average{" "}
        <span className="font-mono text-slate-200">{Math.round(station.normals_1991_2020.snow_1991_2020_cm).toLocaleString()} cm</span>
      </div>
      <div className="mt-2 text-[11px] text-slate-400">Median season snowfall, all winters since 1953–54:</div>
      <div className="grid grid-cols-3 gap-1.5 mt-1 text-center">
        {ENSO_PHASES.map((p) => (
          <div key={p} className="bg-slate-950/70 rounded p-1.5">
            <div className={`text-[10px] ${PHASE_STYLE[p].text}`}>{PHASE_LABEL[p]}</div>
            <div className="font-semibold text-white text-sm">
              {Math.round(station.phases[TO_JMA_PHASE[p]].snowfall_cm.median).toLocaleString()} cm
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-sky-400 flex items-center gap-1">
        <MousePointerClick className="w-3 h-3" /> Click to see {region?.shortName ?? "this region"}
      </div>
    </div>
  );
}
