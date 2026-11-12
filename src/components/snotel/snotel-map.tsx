"use client";

import React, { useMemo, useState } from "react";
import { SnotelStation, RegionInfo } from "@/types/snotel";
import { MapPin, Mountain, Compass, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SnotelMapProps {
  stations: SnotelStation[];
  regions: Record<string, RegionInfo>;
  selectedRegion: string;
  selectedStation: SnotelStation | null;
  onSelectStation: (station: SnotelStation) => void;
  colorMode: "enso_spread" | "el_nino_pct" | "la_nina_pct" | "elevation" | "median_swe";
}

function getColorForMode(
  st: SnotelStation,
  mode: SnotelMapProps["colorMode"]
): string {
  if (mode === "enso_spread") {
    // elNinoPctMedian - laNinaPctMedian: positive = El Niño favored (warm orange/red), negative = La Niña favored (cyan/blue)
    const diff = st.ensoSignalSpread;
    if (diff >= 25) return "#ef4444"; // strong El Niño positive
    if (diff >= 10) return "#f97316"; // moderate El Niño
    if (diff > -10) return "#a855f7"; // balanced / transitional
    if (diff > -25) return "#38bdf8"; // moderate La Niña
    return "#0284c7"; // strong La Niña positive
  }
  if (mode === "el_nino_pct") {
    const p = st.elNinoPctMedian;
    if (p >= 120) return "#2563eb";
    if (p >= 105) return "#38bdf8";
    if (p >= 95) return "#94a3b8";
    if (p >= 80) return "#fb923c";
    return "#dc2626";
  }
  if (mode === "la_nina_pct") {
    const p = st.laNinaPctMedian;
    if (p >= 120) return "#0284c7";
    if (p >= 105) return "#38bdf8";
    if (p >= 95) return "#94a3b8";
    if (p >= 80) return "#fb923c";
    return "#dc2626";
  }
  if (mode === "elevation") {
    const e = st.elevation;
    if (e >= 10000) return "#c084fc";
    if (e >= 8500) return "#6366f1";
    if (e >= 6500) return "#0ea5e9";
    if (e >= 4500) return "#10b981";
    return "#eab308";
  }
  // median_swe
  const swe = st.medianPeakSwe;
  if (swe >= 35) return "#1d4ed8";
  if (swe >= 22) return "#0284c7";
  if (swe >= 14) return "#06b6d4";
  if (swe >= 8) return "#10b981";
  return "#f59e0b";
}

// Convert lat/lon into SVG coordinates for Western US + Alaska inset
function projectStation(lat: number, lon: number, region: string) {
  // Alaska Inset in bottom-left box (x: 15..195, y: 315..450)
  if (region === "ALASKA" || lat > 52 || lon < -130) {
    // Alaska lat ~ 54..69, lon ~ -166..-130
    const normX = Math.max(0, Math.min(1, (lon - -168) / (-130 - -168)));
    const normY = Math.max(0, Math.min(1, (69.5 - lat) / (69.5 - 54)));
    return {
      x: 20 + normX * 170,
      y: 315 + normY * 125,
      isAlaska: true,
    };
  }
  // Western Conterminous US: lon -125..-102, lat 31..49.5
  const normX = Math.max(0, Math.min(1, (lon - -125.5) / (-102.5 - -125.5)));
  const normY = Math.max(0, Math.min(1, (49.5 - lat) / (49.5 - 31.0)));
  return {
    x: 195 + normX * 575,
    y: 25 + normY * 415,
    isAlaska: false,
  };
}

export function SnotelInteractiveMap({
  stations,
  regions,
  selectedRegion,
  selectedStation,
  onSelectStation,
  colorMode,
}: SnotelMapProps) {
  const [hovered, setHovered] = useState<SnotelStation | null>(null);
  const [zoom, setZoom] = useState(1);

  const projected = useMemo(() => {
    return stations.map((st) => {
      const pt = projectStation(st.lat, st.lon, st.region);
      return {
        station: st,
        x: pt.x,
        y: pt.y,
        color: getColorForMode(st, colorMode),
      };
    });
  }, [stations, colorMode]);

  const activeTooltipStation = hovered || selectedStation;

  return (
    <div className="relative w-full rounded-xl border border-slate-800 bg-slate-950/90 overflow-hidden select-none">
      {/* Top Map Controls & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/60 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Compass className="w-4 h-4 text-sky-400" />
          <span>
            Showing <strong className="text-white">{stations.length}</strong> SNOTEL Snow Monitoring Sites
            {selectedRegion !== "ALL" && regions[selectedRegion]
              ? ` in ${regions[selectedRegion].shortName}`
              : " across Western North America & Alaska"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.3).toFixed(1))))}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.3).toFixed(1))))}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          {zoom > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
              onClick={() => setZoom(1)}
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main SVG Canvas */}
      <div className="relative w-full aspect-[16/10] max-h-[470px] overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        <svg
          viewBox="0 0 800 460"
          className="w-full h-full transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
        >
          {/* Lat/Lon Reference Grid for Western US */}
          <g stroke="#1e293b" strokeWidth="0.75" strokeDasharray="3 3">
            {[240, 340, 440, 540, 640, 740].map((gx) => (
              <line key={`vx-${gx}`} x1={gx} y1={20} x2={gx} y2={440} />
            ))}
            {[60, 140, 220, 300, 380].map((gy) => (
              <line key={`hy-${gy}`} x1={195} y1={gy} x2={780} y2={gy} />
            ))}
          </g>

          {/* ENSO Dipole Transition Line (~40°N-42°N Latitude) */}
          <line
            x1={195}
            y1={215}
            x2={775}
            y2={215}
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="6 4"
          />
          <text x={770} y={209} textAnchor="end" fill="#64748b" fontSize="9.5" fontWeight="500">
            ~41°N ENSO Dipole Pivot Zone (North: La Niña Wet / South: El Niño Wet)
          </text>

          {/* Regional Watermark Labels */}
          <g fill="#334155" fontSize="11" fontWeight="700" className="pointer-events-none">
            <text x={255} y={70}>PNW & CASCADES</text>
            <text x={410} y={85}>NORTHERN ROCKIES</text>
            <text x={245} y={255}>SIERRA NEVADA</text>
            <text x={375} y={245}>GREAT BASIN & WASATCH</text>
            <text x={555} y={230}>CENTRAL ROCKIES</text>
            <text x={520} y={375}>SOUTHWEST & RIO GRANDE</text>
          </g>

          {/* Alaska Inset Box */}
          <rect
            x={12}
            y={305}
            width={185}
            height={142}
            rx={8}
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="1.2"
          />
          <text x={22} y={322} fill="#64748b" fontSize="10" fontWeight="700">
            ALASKA SNOTEL (HUC 19)
          </text>

          {/* Plot All SNOTEL Station Points */}
          {projected.map(({ station, x, y, color }) => {
            const isSelected = selectedStation?.triplet === station.triplet;
            const isHovered = hovered?.triplet === station.triplet;
            const radius = isSelected ? 6.5 : isHovered ? 5.5 : 3.2;

            return (
              <g
                key={station.triplet}
                className="cursor-pointer"
                onClick={() => onSelectStation(station)}
                onMouseEnter={() => setHovered(station)}
                onMouseLeave={() => setHovered(null)}
              >
                {(isSelected || isHovered) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 4}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    opacity={0.85}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={color}
                  fillOpacity={isSelected || isHovered ? 1 : 0.82}
                  stroke={isSelected ? "#ffffff" : "#020617"}
                  strokeWidth={isSelected ? 1.8 : 0.6}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Station Quick-Inspect Card */}
        {activeTooltipStation && (
          <div className="absolute top-3 right-3 w-72 rounded-lg border border-slate-700/90 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md text-xs text-slate-200 pointer-events-none">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-white text-sm leading-tight flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{activeTooltipStation.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {activeTooltipStation.triplet} • {activeTooltipStation.state} ({activeTooltipStation.county} Co.)
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px]">
                {activeTooltipStation.elevation.toLocaleString()} ft
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-slate-800 text-center">
              <div className="bg-slate-950/70 rounded p-1.5">
                <div className="text-[10px] text-slate-400">Median SWE</div>
                <div className="font-semibold text-white text-xs">
                  {activeTooltipStation.medianPeakSwe}&quot;
                </div>
              </div>
              <div className="bg-slate-950/70 rounded p-1.5">
                <div className="text-[10px] text-orange-400">El Niño</div>
                <div className="font-semibold text-orange-300 text-xs">
                  {activeTooltipStation.elNinoPeakSwe}&quot; ({activeTooltipStation.elNinoPctMedian}%)
                </div>
              </div>
              <div className="bg-slate-950/70 rounded p-1.5">
                <div className="text-[10px] text-sky-400">La Niña</div>
                <div className="font-semibold text-sky-300 text-xs">
                  {activeTooltipStation.laNinaPeakSwe}&quot; ({activeTooltipStation.laNinaPctMedian}%)
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
              <span>
                Record: {activeTooltipStation.earliestYear}–{activeTooltipStation.latestYear} ({activeTooltipStation.yearsCount} WYs)
              </span>
              <span className="text-sky-400 font-medium">Click dot for full history</span>
            </div>
          </div>
        )}
      </div>

      {/* Color Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-slate-800/80 bg-slate-900/50 text-[11px] text-slate-300">
        {colorMode === "enso_spread" && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-medium">ENSO Snowpack Preference (El Niño % − La Niña %):</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> La Niña Strong (&gt;+25% LN)</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> La Niña Favored (+10 to +25%)</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" /> Transitional (±10%)</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" /> El Niño Favored (+10 to +25%)</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> El Niño Strong (&gt;+25% EN)</span>
          </div>
        )}
        {(colorMode === "el_nino_pct" || colorMode === "la_nina_pct") && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-medium">
              {colorMode === "el_nino_pct" ? "El Niño" : "La Niña"} % of Site Historical Median SWE:
            </span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" /> &lt;80% (Drought/Deficit)</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#fb923c]" /> 80–95%</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" /> 95–105% (Near Median)</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> 105–120%</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" /> &gt;120% (Abundant Snowpack)</span>
          </div>
        )}
        {colorMode === "elevation" && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-medium">Site Elevation Band (ft ASL):</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" /> &lt;4,500 ft</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> 4,500–6,500 ft</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" /> 6,500–8,500 ft</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" /> 8,500–10,000 ft</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#c084fc]" /> &gt;10,000 ft (Alpine)</span>
          </div>
        )}
        {colorMode === "median_swe" && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-medium">Historical Median Peak SWE:</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> &lt;8 in</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> 8–14 in</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" /> 14–22 in</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> 22–35 in</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#1d4ed8]" /> &gt;35 in</span>
          </div>
        )}
        <div className="text-slate-400 flex items-center gap-1">
          <Mountain className="w-3.5 h-3.5 text-slate-400" />
          <span>Click any SNOTEL site marker to launch its historical popup</span>
        </div>
      </div>
    </div>
  );
}
