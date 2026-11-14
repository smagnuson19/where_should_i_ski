"use client";

import React, { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_TOOLTIP_STYLE } from "@/components/snotel/swe-season-chart";
import { modelColor } from "@/components/backtest/model-colors";
import { BacktestMetricMode, BacktestModelMeta, LeaderboardRow } from "@/types/backtest";

const LEAD_LABELS: Record<number, string> = {
  0: "Same day",
  1: "1 day before",
  3: "3 days before",
  5: "5 days before",
};

function metricOf(row: LeaderboardRow, mode: BacktestMetricMode): number | null {
  if (mode === "snowfall") return row.snowMaeIn ?? null;
  if (mode === "water") return row.sweMaeIn ?? null;
  return row.tmaxMaeF ?? null;
}

export function SkillByLeadChart({
  rows,
  models,
  mode,
  winter,
  region,
}: {
  rows: LeaderboardRow[];
  models: BacktestModelMeta[];
  mode: BacktestMetricMode;
  winter: number;
  region: string;
}) {
  const { data, series } = useMemo(() => {
    const leads = [0, 1, 3, 5];
    const relevant = rows.filter(
      (r) => r.winter === winter && r.region === region && !r.insufficientData
    );
    const modelIds = [
      ...new Set(relevant.filter((r) => metricOf(r, mode) != null).map((r) => r.modelId)),
    ];

    const data = leads.map((lead) => {
      const point: Record<string, number | string | null> = {
        lead,
        label: LEAD_LABELS[lead],
      };
      for (const id of modelIds) {
        const row = relevant.find((r) => r.lead === lead && r.modelId === id);
        point[id] = row ? metricOf(row, mode) : null;
      }
      return point;
    });

    return { data, series: modelIds };
  }, [rows, winter, region, mode]);

  const byId = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);

  if (!series.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-slate-500">
        Not enough timing coverage to chart how accuracy fades.
      </div>
    );
  }

  const unit =
    mode === "snowfall" ? " in of snow" : mode === "water" ? " in water" : "°F";
  const yLabel =
    mode === "snowfall"
      ? "Avg miss (in of snow)"
      : mode === "water"
        ? "Avg miss (in water)"
        : "High miss (°F)";

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            width={52}
            label={{
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              style: { fill: "#64748b", fontSize: 10 },
            }}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(v, name) => [
              v == null ? "–" : `${Number(v).toFixed(mode === "water" ? 2 : 1)}${unit}`,
              byId.get(String(name))?.label ?? String(name),
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            formatter={(value) => byId.get(String(value))?.label ?? String(value)}
          />
          {series.map((id) => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
              name={id}
              stroke={modelColor(id)}
              strokeWidth={id === "best_match" ? 2.4 : 1.8}
              strokeDasharray={id === "best_match" ? "5 3" : undefined}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
