"use client";

import React, { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHART_TOOLTIP_STYLE } from "@/components/snotel/swe-season-chart";
import { useStationBacktest } from "@/components/backtest/use-backtest-data";
import { modelColor } from "@/components/backtest/model-colors";
import { BacktestLead, BacktestModelMeta, BacktestStationMeta } from "@/types/backtest";

const DEFAULT_MODELS = ["ecmwf_ifs", "gfs_seamless", "ncep_hrrr_conus", "best_match"];

type SnowMode = "snowfall" | "water";

export function StationDrilldown({
  stations,
  models,
  winter,
  lead,
  mode = "snowfall",
}: {
  stations: BacktestStationMeta[];
  models: BacktestModelMeta[];
  winter: number;
  lead: BacktestLead;
  mode?: SnowMode;
}) {
  const [triplet, setTriplet] = useState<string | null>(stations[0]?.triplet ?? null);
  const { data, loading, failed } = useStationBacktest(triplet);
  const byId = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);

  const stationItems = useMemo(
    () =>
      stations.map((s) => ({
        value: s.triplet,
        label: `${s.nearResort} · ${s.name}`,
      })),
    [stations]
  );

  const activeModels = useMemo(
    () =>
      DEFAULT_MODELS.filter((id) => {
        const meta = byId.get(id);
        if (!meta) return false;
        if (!meta.leads.includes(lead)) return false;
        const snowLeads = meta.snowLeads ?? meta.leads;
        return snowLeads.includes(lead);
      }),
    [byId, lead]
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    const winterPayload = data.winters[String(winter)];
    if (!winterPayload) return [];

    const leadKey = String(lead);
    let obsCum = 0;
    const cumByModel: Record<string, number> = Object.fromEntries(activeModels.map((id) => [id, 0]));

    return winterPayload.dates.map((date, i) => {
      const obsDaily =
        mode === "snowfall" ? winterPayload.obs.snwdGain[i] : winterPayload.obs.sweGain[i];
      if (obsDaily != null) obsCum += obsDaily;
      const point: Record<string, string | number | null> = {
        date,
        label: date.slice(5),
        obsDaily,
        obsCum: Number(obsCum.toFixed(2)),
      };
      for (const id of activeModels) {
        const series = winterPayload.models[id]?.[leadKey];
        const g =
          mode === "snowfall" ? (series?.snowIn?.[i] ?? null) : (series?.sweGain?.[i] ?? null);
        if (g != null) cumByModel[id] += g;
        point[`cum_${id}`] = Number(cumByModel[id].toFixed(2));
      }
      return point;
    });
  }, [data, winter, lead, byId, activeModels, mode]);

  const title =
    mode === "snowfall"
      ? "Daily new snow at one mountain"
      : "Daily water added to the snowpack";
  const subtitle =
    mode === "snowfall"
      ? "Bars = measured stake depth gain · lines = season total new snow (observed vs models)"
      : "Bars = measured pillow water gain · lines = season total water (observed vs models)";

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-200/60 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">{title}</div>
          <div className="text-xs text-slate-600 mt-0.5">{subtitle}</div>
        </div>
        <Select
          items={stationItems.map((s) => ({ value: s.value, label: s.label }))}
          value={triplet ?? undefined}
          onValueChange={(v) => setTriplet(v ? String(v) : null)}
        >
          <SelectTrigger className="w-72 max-w-full h-9 bg-slate-100 border-slate-200 text-xs rounded-lg">
            <SelectValue placeholder="Pick a station" />
          </SelectTrigger>
          <SelectContent className="bg-slate-50 border-slate-300 text-slate-900 max-h-72">
            {stationItems.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="px-4 sm:px-5 py-4">
        {loading && (
          <div className="h-72 flex items-center justify-center gap-2 text-sm text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin text-pine-600" />
            Loading station series…
          </div>
        )}
        {failed && (
          <div className="h-72 flex items-center justify-center text-sm text-slate-500">
            Station file not found. Run the ingest script first.
          </div>
        )}
        {!loading && !failed && chartData.length > 0 && (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3d9c3" />
                <XAxis
                  dataKey="label"
                  stroke="#6f6d5c"
                  fontSize={10}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis yAxisId="cum" stroke="#6f6d5c" fontSize={11} width={44} unit='"' />
                <YAxis
                  yAxisId="daily"
                  orientation="right"
                  stroke="#8b8774"
                  fontSize={11}
                  width={36}
                  unit='"'
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { date?: string } | undefined;
                    return p?.date ?? "";
                  }}
                  formatter={(v, name) => {
                    const n = String(name);
                    const label =
                      n === "obsCum"
                        ? "Observed (season total)"
                        : n === "obsDaily"
                          ? mode === "snowfall"
                            ? "Observed (daily snow)"
                            : "Observed (daily water)"
                          : byId.get(n.replace(/^cum_/, ""))?.label ?? n;
                    return [`${Number(v).toFixed(2)} in`, label];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px" }}
                  formatter={(value) => {
                    const n = String(value);
                    if (n === "obsCum") return "Observed (season total)";
                    if (n === "obsDaily")
                      return mode === "snowfall" ? "Observed (daily snow)" : "Observed (daily water)";
                    return byId.get(n.replace(/^cum_/, ""))?.label ?? n;
                  }}
                />
                <Bar
                  yAxisId="daily"
                  dataKey="obsDaily"
                  name="obsDaily"
                  fill="#8b8774"
                  fillOpacity={0.55}
                  maxBarSize={4}
                />
                <Line
                  yAxisId="cum"
                  type="monotone"
                  dataKey="obsCum"
                  name="obsCum"
                  stroke="#1c2a21"
                  strokeWidth={2.4}
                  dot={false}
                />
                {activeModels.map((id) => (
                  <Line
                    key={id}
                    yAxisId="cum"
                    type="monotone"
                    dataKey={`cum_${id}`}
                    name={`cum_${id}`}
                    stroke={modelColor(id)}
                    strokeWidth={1.7}
                    dot={false}
                    strokeDasharray={id === "best_match" ? "4 3" : undefined}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        {!loading && !failed && chartData.length === 0 && data && (
          <div className="h-72 flex items-center justify-center text-sm text-slate-500">
            No series for winter {winter - 1}–{String(winter).slice(2)} at this station.
          </div>
        )}
      </div>
    </div>
  );
}
