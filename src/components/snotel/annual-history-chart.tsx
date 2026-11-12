"use client";

import React from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RangeYearRecord } from "@/types/snotel-range";
import { CHART_TOOLTIP_STYLE } from "@/components/snotel/swe-season-chart";

interface AnnualHistoryChartProps {
  years: RangeYearRecord[];
  tempOffsetF: number;
}

export function AnnualHistoryChart({ years, tempOffsetF }: AnnualHistoryChartProps) {
  const data = years.map((y) => ({
    waterYear: y.waterYear,
    label: y.label,
    elNinoPct: y.phase === "el_nino" ? y.pctOfMedian : null,
    laNinaPct: y.phase === "la_nina" ? y.pctOfMedian : null,
    neutralPct: y.phase === "neutral" ? y.pctOfMedian : null,
    winterTemp: y.winterTavg !== null ? Number((y.winterTavg + tempOffsetF).toFixed(1)) : null,
    sites: y.stationCount,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="waterYear" stroke="#94a3b8" fontSize={11} />
          <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} unit="%" width={48} />
          <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} unit="°F" width={44} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelFormatter={(wy, payload) => {
              const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
              return row ? `${row.label} winter · ${row.sites} sites` : String(wy);
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <ReferenceLine yAxisId="left" y={100} stroke="#e2e8f0" strokeDasharray="4 3" />
          <Bar yAxisId="left" dataKey="elNinoPct" name="El Niño (% of median)" stackId="a" fill="#f97316" />
          <Bar yAxisId="left" dataKey="laNinaPct" name="La Niña (% of median)" stackId="a" fill="#38bdf8" />
          <Bar yAxisId="left" dataKey="neutralPct" name="Neutral (% of median)" stackId="a" fill="#a855f7" />
          <Line yAxisId="right" type="monotone" dataKey="winterTemp" name="Nov–Mar temp (°F)" stroke="#10b981" strokeWidth={1.6} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
