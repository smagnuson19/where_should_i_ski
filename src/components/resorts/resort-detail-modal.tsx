"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EnsoPhase } from "@/types/snotel";
import { ResortSnowfallStats, SkiResort } from "@/types/resorts";
import { ENSO_PHASES } from "@/types/snotel-range";
import { formatPct, pctColor } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL, PHASE_STYLE } from "@/lib/snotel/year-range";
import { ExternalLink, Mountain } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PHASE_BAR: Record<EnsoPhase, string> = {
  el_nino: "#ea580c",
  la_nina: "#0284c7",
  neutral: "#8b8774",
};

interface ResortDetailModalProps {
  resort: SkiResort | null;
  stats: ResortSnowfallStats | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: "in" | "cm";
  regionName?: string | null;
}

export function ResortDetailModal(props: ResortDetailModalProps) {
  const { resort, stats, unit } = props;
  const chartData = useMemo(() => {
    if (!stats) return [];
    return stats.years.map((y) => ({
      year: y.year,
      label: y.label,
      snow: y.snow,
      pct: y.pctOfTypical,
      phase: y.phase,
    }));
  }, [stats]);

  if (!resort) return null;

  const elevFt = (m: number) => Math.round(m * 3.28084).toLocaleString();

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-100 border-slate-200 text-slate-900">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-slate-950">
            <Mountain className="w-5 h-5 text-pine-600" />
            {resort.name}
            {resort.nameJa && <span className="text-slate-600 font-normal text-sm">{resort.nameJa}</span>}
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-xs">
            {resort.state}
            {props.regionName ? ` · ${props.regionName}` : ""} · season snowfall vs. ENSO
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary" className="bg-slate-200 text-slate-800">
            Base {unit === "in" ? `${elevFt(resort.baseM)} ft` : `${resort.baseM} m`}
          </Badge>
          <Badge variant="secondary" className="bg-slate-200 text-slate-800">
            Summit {unit === "in" ? `${elevFt(resort.summitM)} ft` : `${resort.summitM} m`}
          </Badge>
          <Badge variant="secondary" className="bg-slate-200 text-slate-800">
            Vertical {unit === "in" ? `${elevFt(resort.verticalM)} ft` : `${resort.verticalM} m`}
          </Badge>
          <Badge variant="secondary" className="bg-slate-200 text-slate-800">
            {resort.liftCount} lifts
          </Badge>
          {stats && (
            <Badge variant="secondary" className="bg-sky-50 text-sky-800 border border-sky-200">
              Typical season {stats.typicalSnow ?? "—"} {unit}
            </Badge>
          )}
          {stats && (
            <Badge variant="secondary" className="bg-slate-200 text-slate-700">
              {stats.sourceLabel}
            </Badge>
          )}
          {resort.website && (
            <a
              href={resort.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-pine-600 hover:underline"
            >
              Website <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {stats && stats.match !== "none" ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {ENSO_PHASES.map((p) => {
                const signal = stats.phases[p];
                return (
                  <div key={p} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-center">
                    <div className={`text-[11px] font-semibold ${PHASE_STYLE[p].text}`}>{PHASE_LABEL[p]}</div>
                    <div className="text-xl font-mono font-bold text-slate-950 mt-1 flex items-center justify-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rotate-45"
                        style={{ backgroundColor: pctColor(signal.pctOfTypical) }}
                      />
                      {formatPct(signal.pctOfTypical)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {signal.winters} winters
                      {signal.medianSnow != null ? ` · med ${signal.medianSnow} ${unit}` : ""}
                      {signal.lowConfidence ? " · low confidence" : ""}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-950">Season snowfall by winter</h3>
              <p className="text-[11px] text-slate-500">
                Bars are season snowfall ({unit}). Color marks the ENSO phase. Regions on the map use snowpack (SWE);
                this chart uses snowfall.
              </p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3d9c3" />
                    <XAxis dataKey="year" tick={{ fill: "#6f6d5c", fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "#6f6d5c", fontSize: 10 }} unit={` ${unit}`} width={48} />
                    <Tooltip
                      contentStyle={{ background: "#fbf8f0", border: "1px solid #d4c7aa", fontSize: 12 }}
                      formatter={(value, _name, item) => {
                        const v = typeof value === "number" ? value : Number(value);
                        const pct = (item?.payload as { pct?: number | null })?.pct;
                        return [`${v} ${unit}${pct != null ? ` (${formatPct(pct)})` : ""}`, "Snowfall"];
                      }}
                      labelFormatter={(label, payload) => {
                        const row = payload?.[0]?.payload as { label?: string; phase?: EnsoPhase } | undefined;
                        return `${row?.label ?? label}${row?.phase ? ` · ${PHASE_LABEL[row.phase]}` : ""}`;
                      }}
                    />
                    <Bar dataKey="snow" radius={[2, 2, 0, 0]}>
                      {chartData.map((d) => (
                        <Cell key={d.year} fill={PHASE_BAR[d.phase as EnsoPhase]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            No nearby snowfall station with a long enough record. The resort is listed from OpenSkiData but has no ENSO
            snowfall signal yet.
          </p>
        )}

        {resort.stations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-950">Source stations</h3>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {resort.stations.map((s) => (
                <li key={s.id} className="rounded-md border border-slate-200 bg-slate-50/60 px-2.5 py-2">
                  <div className="font-medium text-slate-950">{s.name}</div>
                  <div className="text-slate-500 mt-0.5">
                    {s.source === "ghcn"
                      ? "NOAA GHCN measured snowfall"
                      : s.source === "snotel_depth"
                        ? "Estimated from SNOTEL snow-depth gains"
                        : "JMA AMeDAS measured snowfall"}
                    {" · "}
                    {s.distanceKm} km away · station {s.elevGapM >= 0 ? "+" : ""}
                    {s.elevGapM} m vs. base
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
