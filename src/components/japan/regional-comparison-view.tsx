"use client";

import React, { useState } from "react";
import { RegionData } from "@/types/japan-enso";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
interface Props {
  regions: RegionData[];
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
}

export function RegionalComparisonView({ regions, selectedRegionId, onSelectRegion }: Props) {
  const [era, setEra] = useState<"full" | "modern">("full");
  const [metricMode, setMetricMode] = useState<"pct_norm" | "pct_72yr" | "cm">("pct_norm");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Regional Outperformance & Distributional Spread (Medians, Means, IQRs & Ranges)
          </h3>
          <p className="text-xs text-slate-400">
            Compare El Niño (n=19), La Niña (n=19), and Neutral (n=34) across all 8 JMA climate divisions. Click any row to focus region.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-1">
            <Button
              size="sm"
              variant={era === "full" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setEra("full")}
            >
              72-Yr Record (1953/54–2024/25)
            </Button>
            <Button
              size="sm"
              variant={era === "modern" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setEra("modern")}
            >
              Modern Era (1991–2025)
            </Button>
          </div>
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-1">
            <Button
              size="sm"
              variant={metricMode === "pct_norm" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setMetricMode("pct_norm")}
            >
              % 1991–2020 Normal
            </Button>
            <Button
              size="sm"
              variant={metricMode === "pct_72yr" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setMetricMode("pct_72yr")}
            >
              % 72-Yr Median
            </Button>
            <Button
              size="sm"
              variant={metricMode === "cm" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setMetricMode("cm")}
            >
              Absolute (cm)
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {regions.map((r) => {
          const isSelected = r.region_id === selectedRegionId;
          const enFull = r.phases["El Niño"];
          const lnFull = r.phases["La Niña"];
          const neFull = r.phases["Neutral"];

          const getStat = (phase: "El Niño" | "La Niña" | "Neutral") => {
            if (era === "modern") {
              const m = r.modern_era_1991_2025[phase];
              return metricMode === "cm" ? m.snowfall_cm : m.pct_of_normal_1991_2020;
            }
            const f = r.phases[phase];
            if (metricMode === "cm") return f.snowfall_cm;
            if (metricMode === "pct_72yr") return f.pct_of_72yr_median;
            return f.pct_of_normal;
          };

          const enS = getStat("El Niño");
          const lnS = getStat("La Niña");
          const neS = getStat("Neutral");
          const diffMed = +(enS.median - lnS.median).toFixed(1);
          const winner = diffMed >= 0 ? "El Niño" : "La Niña";
          const unit = metricMode === "cm" ? " cm" : "%";
          const scaleMax = Math.max(enS.q75, lnS.q75, neS.q75, metricMode === "cm" ? 800 : 175) * 1.1;

          return (
            <Card
              key={r.region_id}
              onClick={() => onSelectRegion(r.region_id)}
              className={`cursor-pointer transition-all border ${
                isSelected
                  ? "bg-slate-900/90 border-sky-500/70 ring-1 ring-sky-500/40"
                  : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-bold text-slate-100">{r.name_en}</CardTitle>
                      <span className="text-xs text-slate-400 font-mono">{r.name_ja}</span>
                    </div>
                    <CardDescription className="text-xs text-slate-400 mt-0.5">
                      {r.macro_region} • {r.coast} • 1991–2020 Norm:{" "}
                      <span className="text-slate-200 font-medium">{r.normals_1991_2020.snowfall_cm} cm</span> • 72-Yr Med:{" "}
                      <span className="text-slate-200 font-medium">{r.baselines_1954_2025.snowfall_median_cm} cm</span>
                    </CardDescription>
                  </div>
                  <Badge
                    className={
                      winner === "El Niño"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    }
                  >
                    {winner} ({diffMed > 0 ? `+${diffMed}` : diffMed}
                    {unit})
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2.5">
                {(
                  [
                    { label: "El Niño", stat: enS, color: "bg-amber-500", barBg: "bg-amber-500/25" },
                    { label: "La Niña", stat: lnS, color: "bg-cyan-400", barBg: "bg-cyan-400/25" },
                    { label: "Neutral", stat: neS, color: "bg-slate-400", barBg: "bg-slate-400/25" },
                  ] as const
                ).map((row) => {
                  const q25Pct = Math.min(100, Math.max(0, (row.stat.q25 / scaleMax) * 100));
                  const q75Pct = Math.min(100, Math.max(0, (row.stat.q75 / scaleMax) * 100));
                  const medPct = Math.min(100, Math.max(0, (row.stat.median / scaleMax) * 100));
                  return (
                    <div key={row.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-300 w-16">{row.label}</span>
                        <span className="text-slate-200 font-mono">
                          Med: <strong>{row.stat.median}{unit}</strong> • Mean: {row.stat.mean}{unit} • IQR: {row.stat.iqr}{unit} ({row.stat.q25}–{row.stat.q75})
                        </span>
                      </div>
                      <div className="relative h-2.5 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800/70">
                        <div
                          className={`absolute top-0 bottom-0 ${row.barBg}`}
                          style={{ left: `${q25Pct}%`, width: `${Math.max(2, q75Pct - q25Pct)}%` }}
                          title={`IQR: ${row.stat.q25} to ${row.stat.q75}${unit}`}
                        />
                        <div
                          className={`absolute top-0 bottom-0 w-1.5 rounded-full ${row.color}`}
                          style={{ left: `calc(${medPct}% - 3px)` }}
                          title={`Median: ${row.stat.median}${unit}`}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60">
                  <span>
                    Range (cm): EN {enFull.snowfall_cm.min}–{enFull.snowfall_cm.max} | LN {lnFull.snowfall_cm.min}–{lnFull.snowfall_cm.max} | NE {neFull.snowfall_cm.min}–{neFull.snowfall_cm.max}
                  </span>
                  <span className="font-mono text-slate-300">
                    EN/LN Ratio: {r.enso_comparison.el_nino_vs_la_nina_median_ratio}x
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
