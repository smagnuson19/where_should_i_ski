"use client";

import React from "react";
import {
  AnnualRegionRecord,
  RegionInfo,
  SeasonalMonthPoint,
  StormSummaryMetrics,
} from "@/types/snotel";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CloudSnow, ThermometerSnowflake, TrendingUp } from "lucide-react";

interface RegionalChartsProps {
  seasonalCycle: SeasonalMonthPoint[];
  annualSeries: AnnualRegionRecord[];
  stormByRegion: Record<string, Record<string, StormSummaryMetrics>>;
  regions: Record<string, RegionInfo>;
  selectedRegion: string;
  sweMultiplier: number;
  tempOffsetF: number;
}

export function RegionalCharts({
  seasonalCycle,
  annualSeries,
  stormByRegion,
  regions,
  selectedRegion,
  sweMultiplier,
  tempOffsetF,
}: RegionalChartsProps) {
  const adjustedSeasonal = seasonalCycle.map((pt) => {
    const scale = (v: number | null) =>
      v !== null ? Number((v * sweMultiplier).toFixed(1)) : null;
    const shiftT = (v: number | null) =>
      v !== null ? Number((v + tempOffsetF).toFixed(1)) : null;
    return {
      ...pt,
      sweMedian: scale(pt.sweMedian),
      sweElNino: scale(pt.sweElNino),
      sweLaNina: scale(pt.sweLaNina),
      sweNeutral: scale(pt.sweNeutral),
      tavgMedian: shiftT(pt.tavgMedian),
      tavgElNino: shiftT(pt.tavgElNino),
      tavgLaNina: shiftT(pt.tavgLaNina),
    };
  });

  const adjustedAnnual = annualSeries.map((r) => {
    const val =
      r.pctOfMedian !== null ? Number(r.pctOfMedian.toFixed(1)) : null;
    return {
      ...r,
      elNinoPct: r.phase === "el_nino" ? val : null,
      laNinaPct: r.phase === "la_nina" ? val : null,
      neutralPct: r.phase === "neutral" ? val : null,
      adjWinterTavg:
        r.winterTavg !== null
          ? Number((r.winterTavg + tempOffsetF).toFixed(1))
          : null,
    };
  });

  const stormCompareData = Object.keys(regions).map((rId) => {
    const st = stormByRegion[rId] || {};
    return {
      region: regions[rId].shortName,
      elNino2in: st.el_nino?.events2in ?? 0,
      laNina2in: st.la_nina?.events2in ?? 0,
      median2in: st.all?.events2in ?? 0,
      elNino6in: st.el_nino?.events6in ?? 0,
      laNina6in: st.la_nina?.events6in ?? 0,
      elNinoFreeze: st.el_nino?.subfreezingDays ?? 0,
      laNinaFreeze: st.la_nina?.subfreezingDays ?? 0,
    };
  });

  const activeStorm = stormByRegion[selectedRegion] || stormByRegion["ALL"] || {};

  return (
    <div className="space-y-4">
      {/* Row 1: Seasonal SWE Curve + Seasonal Temperature Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span>Seasonal SWE Trajectory: El Niño vs. La Niña vs. Historical Median</span>
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Water-Year monthly snowpack accumulation & melt (Oct–Sep) scaled for selected elevation band and orographic gradient.
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={adjustedSeasonal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} unit='"' />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area
                  type="monotone"
                  dataKey="sweMedian"
                  name="Historical Median SWE"
                  fill="#475569"
                  fillOpacity={0.2}
                  stroke="#e2e8f0"
                  strokeWidth={2.2}
                  strokeDasharray="5 3"
                />
                <Line type="monotone" dataKey="sweElNino" name="El Niño SWE" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="sweLaNina" name="La Niña SWE" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="sweNeutral" name="Neutral SWE" stroke="#a855f7" strokeWidth={1.6} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-xs font-semibold text-white flex items-center gap-1.5 mb-1">
            <ThermometerSnowflake className="w-4 h-4 text-amber-400" />
            <span>Seasonal Temperature Regime (°F) & 32°F Rain/Snow Threshold</span>
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">
            Monthly mean temperature across ENSO phases with lapse-rate adjustment ({tempOffsetF >= 0 ? "+" : ""}{tempOffsetF.toFixed(1)}°F).
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={adjustedSeasonal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} unit="°F" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <ReferenceLine y={32} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "32°F Freeze Line", fill: "#f87171", fontSize: 10 }} />
                <Line type="monotone" dataKey="tavgMedian" name="Median Temp (°F)" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="4 3" />
                <Line type="monotone" dataKey="tavgElNino" name="El Niño Temp (°F)" stroke="#f97316" strokeWidth={2.2} />
                <Line type="monotone" dataKey="tavgLaNina" name="La Niña Temp (°F)" stroke="#38bdf8" strokeWidth={2.2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Multi-Decadal Water Year Timeline (1930-2026) & Daily Snowfall Storm Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-xs font-semibold text-white mb-1">
            Historical Water-Year Snowpack (% of Site Median SWE, 1930–2026) & Winter Temp
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">
            97-year SNOTEL & snow course record colored by NOAA ONI phase against the 100% historical median benchmark.
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={adjustedAnnual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="waterYear" stroke="#94a3b8" fontSize={11} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} unit="%" />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} unit="°F" />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <ReferenceLine yAxisId="left" y={100} stroke="#e2e8f0" strokeDasharray="4 3" />
                <Bar yAxisId="left" dataKey="elNinoPct" name="El Niño (% Median)" stackId="a" fill="#f97316" />
                <Bar yAxisId="left" dataKey="laNinaPct" name="La Niña (% Median)" stackId="a" fill="#38bdf8" />
                <Bar yAxisId="left" dataKey="neutralPct" name="Neutral (% Median)" stackId="a" fill="#a855f7" />
                <Line yAxisId="right" type="monotone" dataKey="adjWinterTavg" name="Nov–Mar Temp (°F)" stroke="#10b981" strokeWidth={1.6} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-xs font-semibold text-white flex items-center gap-1.5 mb-1">
            <CloudSnow className="w-4 h-4 text-purple-400" />
            <span>Daily Snowfall Events (≥2&quot; & ≥6&quot;/24h) & Sub-Freezing Days</span>
          </h3>
          <p className="text-[11px] text-slate-400 mb-2">
            Storm days/year across regional SNOTEL daily telemetry (EN = {activeStorm.el_nino?.events2in ?? "–"}d vs LN = {activeStorm.la_nina?.events2in ?? "–"}d ≥2&quot;).
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stormCompareData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="region" type="category" stroke="#cbd5e1" fontSize={10} width={110} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="elNino2in" name="El Niño ≥2&quot; Snow Days" fill="#f97316" radius={[0, 3, 3, 0]} />
                <Bar dataKey="laNina2in" name="La Niña ≥2&quot; Snow Days" fill="#38bdf8" radius={[0, 3, 3, 0]} />
                <Bar dataKey="median2in" name="All-Yr Median ≥2&quot; Days" fill="#94a3b8" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
