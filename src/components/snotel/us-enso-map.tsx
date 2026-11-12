"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Earth, Minus, Plus } from "lucide-react";
import { EnsoPhase, RegionInfo, SnotelStation } from "@/types/snotel";
import { RegionRangeSummary, StationRangeStats } from "@/types/snotel-range";
import {
  FULL_MAP_VIEW,
  MAP_HEIGHT,
  MAP_WIDTH,
  MapViewBox,
  NATION_OUTLINE_PATH,
  RegionOutline,
  STATE_BORDERS_PATH,
  STATE_SHAPES,
  StateSiteBreakdown,
  clampMapView,
  fitMapView,
  projectLonLat,
  zoomMapView,
} from "@/lib/snotel/us-map";
import { OUTSIDE_NETWORK_COLOR, formatPct, pctColor } from "@/lib/snotel/enso-scale";
import { LOW_CONFIDENCE_WINTERS, PHASE_LABEL } from "@/lib/snotel/year-range";
import { RegionHoverCard, StationHoverCard } from "@/components/snotel/map-hover-card";

interface UsEnsoMapProps {
  regions: Record<string, RegionInfo>;
  summaries: Record<string, RegionRangeSummary>;
  stateAssignments: Record<string, StateSiteBreakdown>;
  outlines: RegionOutline[];
  phase: EnsoPhase;
  selectedRegion: string;
  focusedPostal: string | null;
  onFocusPostal: (postal: string | null) => void;
  sites: SnotelStation[];
  showSites: boolean;
  stationStats: Map<string, StationRangeStats>;
  activeStation: SnotelStation | null;
  onOpenStation: (station: SnotelStation) => void;
}

type Hover = { kind: "state"; postal: string; name: string } | { kind: "station"; station: SnotelStation } | null;

type Point = { st: SnotelStation; x: number; y: number };

interface SpreadEnd {
  station: SnotelStation;
  pct: number;
  x: number;
  y: number;
}

function mapBadgeLabel(rawName: string): { label: string; dx: number; dy: number } {
  const clean = rawName.replace(/\s*\(.*\)/, "");
  if (clean.includes("Sierra")) return { label: "Sierra Nevada", dx: -16, dy: 22 };
  if (clean.includes("Great Basin")) return { label: "Great Basin", dx: 10, dy: -12 };
  if (clean.includes("Central Rockies")) return { label: "Central Rockies", dx: 14, dy: 4 };
  if (clean.includes("Northern Rockies")) return { label: "Northern Rockies", dx: 8, dy: 2 };
  if (clean.includes("Southwest")) return { label: "Southwest", dx: 4, dy: 8 };
  if (clean.includes("Alaska")) return { label: "Alaska", dx: 10, dy: -6 };
  return { label: clean, dx: 0, dy: -4 };
}

function clientToMap(clientX: number, clientY: number, view: MapViewBox, rect: DOMRect): [number, number] {
  return [
    ((clientX - rect.left) / rect.width) * view.w + view.x,
    ((clientY - rect.top) / rect.height) * view.h + view.y,
  ];
}

export function UsEnsoMap(props: UsEnsoMapProps) {
  const {
    regions,
    summaries,
    stateAssignments,
    outlines,
    phase,
    selectedRegion,
    focusedPostal,
    sites,
    showSites,
    stationStats,
  } = props;
  const [hover, setHover] = useState<Hover>(null);
  const [view, setView] = useState<MapViewBox>(FULL_MAP_VIEW);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef(view);
  const focusedRef = useRef(focusedPostal);
  const onFocusPostalRef = useRef(props.onFocusPostal);
  const suppressClick = useRef(false);
  viewRef.current = view;
  focusedRef.current = focusedPostal;
  onFocusPostalRef.current = props.onFocusPostal;

  const applyViewRef = useRef<(next: MapViewBox, clearFocus: boolean) => void>(() => {});
  applyViewRef.current = (next, clearFocus) => {
    const v = clampMapView(next);
    viewRef.current = v;
    setView(v);
    if (clearFocus && v.w >= MAP_WIDTH - 0.5 && focusedRef.current) onFocusPostalRef.current(null);
  };

  const hadFocus = useRef(focusedPostal);
  useEffect(() => {
    if (focusedPostal) {
      const shape = STATE_SHAPES.find((s) => s.postal === focusedPostal);
      if (shape) applyViewRef.current(fitMapView(shape.bounds), false);
    } else if (hadFocus.current) {
      applyViewRef.current(FULL_MAP_VIEW, false);
    }
    hadFocus.current = focusedPostal;
  }, [focusedPostal]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const current = viewRef.current;
      const [mx, my] = clientToMap(e.clientX, e.clientY, current, rect);
      const raw = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * rect.height : e.deltaY;
      const factor = Math.min(1.6, Math.max(0.62, Math.exp(raw * 0.0016)));
      applyViewRef.current(zoomMapView(current, factor, mx, my), true);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const current = viewRef.current;
    applyViewRef.current(zoomMapView(current, factor, current.x + current.w / 2, current.y + current.h / 2), true);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const svg = e.currentTarget;
    const pointers = new Map<number, { x: number; y: number }>([[e.pointerId, { x: e.clientX, y: e.clientY }]]);
    const panOrigin = { x: e.clientX, y: e.clientY, view: viewRef.current };
    let pinch: { dist: number; view: MapViewBox; anchorX: number; anchorY: number } | null = null;
    let moved = false;

    const move = (ev: PointerEvent) => {
      if (!pointers.has(ev.pointerId)) return;
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const rect = svg.getBoundingClientRect();
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        moved = true;
        setDragging(true);
        applyViewRef.current(zoomMapView(pinch.view, pinch.dist / dist, pinch.anchorX, pinch.anchorY), false);
        return;
      }
      const dx = ev.clientX - panOrigin.x;
      const dy = ev.clientY - panOrigin.y;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true;
      setDragging(true);
      const origin = panOrigin.view;
      applyViewRef.current(
        {
          x: origin.x - (dx / rect.width) * origin.w,
          y: origin.y - (dy / rect.height) * origin.h,
          w: origin.w,
          h: origin.h,
        },
        false
      );
    };

    const addPointer = (ev: PointerEvent) => {
      if (pointers.has(ev.pointerId) || !svg.contains(ev.target as Node)) return;
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size < 2) return;
      const [a, b] = [...pointers.values()];
      const rect = svg.getBoundingClientRect();
      const current = viewRef.current;
      const [anchorX, anchorY] = clientToMap((a.x + b.x) / 2, (a.y + b.y) / 2, current, rect);
      pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        view: current,
        anchorX,
        anchorY,
      };
      moved = true;
    };

    const endGesture = (ev: PointerEvent) => {
      pointers.delete(ev.pointerId);
      if (pointers.size >= 2) return;
      pinch = null;
      if (pointers.size > 0) return;
      if (moved) {
        suppressClick.current = true;
        requestAnimationFrame(() => {
          suppressClick.current = false;
        });
      }
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", endGesture);
      window.removeEventListener("pointercancel", endGesture);
      window.removeEventListener("pointerdown", addPointer);
      if (viewRef.current.w >= MAP_WIDTH - 0.5 && focusedRef.current) onFocusPostalRef.current(null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", endGesture);
    window.addEventListener("pointercancel", endGesture);
    window.addEventListener("pointerdown", addPointer);
  };

  const regionPct = (regionId: string) => summaries[regionId]?.phases[phase].pctOfMedian ?? null;
  const k = view.w / MAP_WIDTH;
  const zoomed = view.w < MAP_WIDTH - 1;
  const drawSites = showSites || zoomed;
  const hideBadges = view.w < MAP_WIDTH * 0.72;

  const points = useMemo(
    () =>
      sites.flatMap((st) => {
        const xy = projectLonLat(st.lon, st.lat);
        return xy ? [{ st, x: xy[0], y: xy[1] }] : [];
      }),
    [sites]
  );

  const spotlight = useMemo(() => {
    if (focusedPostal) {
      const shape = STATE_SHAPES.find((s) => s.postal === focusedPostal);
      return shape?.postal ? { postal: shape.postal, name: shape.name } : null;
    }
    if (view.w > MAP_WIDTH * 0.45) return null;
    const inView = points.filter((p) => p.x >= view.x && p.x <= view.x + view.w && p.y >= view.y && p.y <= view.y + view.h);
    if (inView.length < 3) return null;
    const counts = new Map<string, number>();
    for (const p of inView) counts.set(p.st.state, (counts.get(p.st.state) ?? 0) + 1);
    const [postal, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (n < 3 || n / inView.length < 0.7) return null;
    const shape = STATE_SHAPES.find((s) => s.postal === postal);
    return shape ? { postal, name: shape.name } : null;
  }, [focusedPostal, points, view]);

  const spread = useMemo(() => {
    if (!spotlight) return null;
    const inState = points.filter((p) => p.st.state === spotlight.postal);
    let min: SpreadEnd | null = null;
    let max: SpreadEnd | null = null;
    for (const p of inState) {
      const stats = stationStats.get(p.st.triplet);
      const pct = stats?.phasePct[phase];
      const winters = stats?.phaseWinters[phase] ?? 0;
      if (pct === null || pct === undefined || !Number.isFinite(pct) || winters < LOW_CONFIDENCE_WINTERS) continue;
      const end = { station: p.st, pct, x: p.x, y: p.y };
      if (!min || pct < min.pct) min = end;
      if (!max || pct > max.pct) max = end;
    }
    return { count: inState.length, min, max };
  }, [spotlight, points, stationStats, phase]);

  const hoveredState = hover?.kind === "state" ? stateAssignments[hover.postal] : null;
  const labelIds = new Set(
    [spread?.min?.station.triplet, spread?.max?.station.triplet, hover?.kind === "station" ? hover.station.triplet : null].filter(
      (id): id is string => Boolean(id)
    )
  );
  const showCalloutLabels = zoomed && view.w < MAP_WIDTH * 0.55;

  const orderedPoints = useMemo(() => {
    const hoverId = hover?.kind === "station" ? hover.station.triplet : null;
    const activeId = props.activeStation?.triplet ?? null;
    return [...points].sort((a, b) => {
      const score = (p: Point) =>
        (p.st.triplet === activeId || p.st.triplet === hoverId ? 2 : 0) + (spotlight && p.st.state === spotlight.postal ? 1 : 0);
      return score(a) - score(b);
    });
  }, [points, hover, props.activeStation, spotlight]);

  const focusShape = (postal: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    props.onFocusPostal(postal);
    const shape = STATE_SHAPES.find((s) => s.postal === postal);
    if (shape) applyViewRef.current(fitMapView(shape.bounds), false);
  };

  const atFullMap = view.w >= MAP_WIDTH - 0.5;
  const dotR = 2.7 * Math.pow(k, 0.28);

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-slate-950">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className={`w-full h-auto select-none touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        role="group"
        aria-label={`US map of ${PHASE_LABEL[phase]} snowpack. Scroll or pinch to zoom, or click a state to compare its SNOTEL sites.`}
        onPointerDown={onPointerDown}
      >
        <path d={NATION_OUTLINE_PATH} fill={OUTSIDE_NETWORK_COLOR} stroke="#334155" strokeWidth={1 * k} />
        {STATE_SHAPES.map((s) => {
          const assignment = s.postal ? stateAssignments[s.postal] : undefined;
          if (!assignment) return <path key={s.fips} d={s.d} fill={OUTSIDE_NETWORK_COLOR} />;
          const regionId = assignment.regionId;
          const pct = regionPct(regionId);
          const isSpot = spotlight?.postal === s.postal;
          const faded = Boolean(spotlight) && !isSpot;
          const dimmed = !spotlight && selectedRegion !== "ALL" && selectedRegion !== regionId;
          const label = `${s.name}: ${regions[regionId]?.shortName}, ${formatPct(pct)} of typical snowpack in ${PHASE_LABEL[phase]} winters. Zoom in to compare SNOTEL sites.`;
          return (
            <path
              key={s.fips}
              d={s.d}
              fill={pctColor(pct)}
              fillOpacity={isSpot ? 0.48 : faded || dimmed ? 0.28 : 0.92}
              stroke={isSpot || (hover?.kind === "state" && hover.postal === s.postal) ? "#ffffff" : "none"}
              strokeWidth={1.5 * k}
              className="cursor-pointer outline-none focus-visible:stroke-white"
              role="button"
              tabIndex={0}
              aria-label={label}
              onMouseEnter={() => setHover({ kind: "state", postal: assignment.postal, name: s.name })}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover({ kind: "state", postal: assignment.postal, name: s.name })}
              onBlur={() => setHover(null)}
              onClick={() => focusShape(assignment.postal)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  focusShape(assignment.postal);
                }
              }}
            />
          );
        })}
        <path d={STATE_BORDERS_PATH} fill="none" stroke="#020617" strokeOpacity={0.55} strokeWidth={0.75 * k} pointerEvents="none" />
        {outlines.map((o) => (
          <path
            key={o.regionId}
            d={o.d}
            fill="none"
            stroke={selectedRegion === o.regionId ? "#ffffff" : "#0f172a"}
            strokeWidth={(selectedRegion === o.regionId ? 3 : 1.8) * k}
            pointerEvents="none"
          />
        ))}

        {drawSites &&
          orderedPoints.filter((p) => !spotlight || p.st.state === spotlight.postal).map(({ st, x, y }) => {
            const active =
              props.activeStation?.triplet === st.triplet || (hover?.kind === "station" && hover.station.triplet === st.triplet);
            const dimmed = spotlight ? st.state !== spotlight.postal : selectedRegion !== "ALL" && st.region !== selectedRegion;
            const r = active ? dotR * 1.75 : dotR;
            const hitR = k < 0.85 ? Math.max(r * 1.8, 14 * k) : r;
            const labeled = showCalloutLabels && labelIds.has(st.triplet);
            return (
              <g
                key={st.triplet}
                className="cursor-pointer"
                onMouseEnter={() => setHover({ kind: "station", station: st })}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  if (suppressClick.current) {
                    suppressClick.current = false;
                    return;
                  }
                  props.onOpenStation(st);
                }}
              >
                <circle cx={x} cy={y} r={hitR} fill="transparent" />
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={pctColor(stationStats.get(st.triplet)?.phasePct[phase])}
                  fillOpacity={dimmed ? 0.28 : 1}
                  stroke={active ? "#ffffff" : "#020617"}
                  strokeWidth={(active ? 1.8 : 0.7) * k}
                  pointerEvents="none"
                />
                {labeled && (
                  <text
                    x={x}
                    y={y - r - 3.2 * k}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize={12.5 * k}
                    fontWeight={700}
                    stroke="#020617"
                    strokeWidth={3 * k}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {st.name}
                  </text>
                )}
              </g>
            );
          })}

        {!hideBadges &&
          outlines.map((o) => {
            const { label: name, dx, dy } = mapBadgeLabel(regions[o.regionId]?.shortName ?? o.regionId);
            const width = Math.max(name.length * 6.3 + 20, 68);
            const isSelected = selectedRegion === o.regionId;
            return (
              <g
                key={`label-${o.regionId}`}
                transform={`translate(${o.labelAt[0] + dx},${o.labelAt[1] + dy})`}
                pointerEvents="none"
              >
                <rect
                  x={-width / 2}
                  y={-20}
                  width={width}
                  height={38}
                  rx={8}
                  fill="#020617"
                  fillOpacity={0.86}
                  stroke={isSelected ? "#38bdf8" : "#334155"}
                  strokeWidth={isSelected ? 1.5 : 1}
                />
                <text y={-5} textAnchor="middle" fill="#cbd5e1" fontSize={10.5} fontWeight={600}>
                  {name}
                </text>
                <text
                  y={12}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={14}
                  fontWeight={700}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatPct(regionPct(o.regionId))}
                </text>
              </g>
            );
          })}
      </svg>

      <div className="absolute top-3 left-3 z-10 flex flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950/92 shadow-lg">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomBy(1 / 1.6)}
          className="p-1.5 text-slate-100 hover:bg-slate-800 border-b border-slate-800"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={atFullMap}
          onClick={() => zoomBy(1.6)}
          className="p-1.5 text-slate-100 hover:bg-slate-800 border-b border-slate-800 disabled:opacity-40"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="Show the full United States"
          disabled={atFullMap && !focusedPostal}
          onClick={() => applyViewRef.current(FULL_MAP_VIEW, true)}
          className="p-1.5 text-slate-100 hover:bg-slate-800 disabled:opacity-40"
        >
          <Earth className="w-3.5 h-3.5" />
        </button>
      </div>

      {atFullMap && !spotlight && (
        <p className="absolute bottom-3 left-3 z-10 rounded-md bg-slate-950/80 px-2 py-1 text-[11px] text-slate-300 pointer-events-none">
          Scroll, pinch, or choose a state to compare SNOTEL sites
        </p>
      )}

      {spotlight && spread && (
        <div className="mt-2 rounded-lg border border-slate-700/90 bg-slate-950/80 px-3 py-2.5 text-xs text-slate-200">
          <div className="font-semibold text-white text-sm">{spotlight.name}</div>
          <p className="mt-1 leading-relaxed">
            {spread.count} SNOTEL {spread.count === 1 ? "site" : "sites"}
            {spread.min && spread.max ? (
              <>
                . Sites with at least {LOW_CONFIDENCE_WINTERS} {PHASE_LABEL[phase]} winters run from{" "}
                <strong className="text-white">{formatPct(spread.min.pct)}</strong> to{" "}
                <strong className="text-white">{formatPct(spread.max.pct)}</strong> of a typical winter.
                {spread.max.pct - spread.min.pct >= 12
                  ? ` Lowest is ${spread.min.station.name}; highest is ${spread.max.station.name}.`
                  : " Sites across the state are close to each other."}
              </>
            ) : (
              " Not enough winters in this range to compare sites."
            )}
          </p>
        </div>
      )}

      {hover?.kind === "station" && <StationHoverCard station={hover.station} stats={stationStats.get(hover.station.triplet)} />}
      {hover?.kind === "state" && !spotlight && hoveredState && regions[hoveredState.regionId] && (
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
