"use client";

import React from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { JapanRegionSummary, SNOW_MONTHS } from "@/lib/japan/analysis";
import { CHART_TOOLTIP_STYLE } from "@/components/snotel/swe-season-chart";

export function MonthlySnowfallChart({ summary }: { summary: JapanRegionSummary }) {
  const data = SNOW_MONTHS.map((m) => ({
    month: m,
    elNino: summary.phases.el_nino.monthlyCm[m],
    laNina: summary.phases.la_nina.monthlyCm[m],
    neutral: summary.phases.neutral.monthlyCm[m],
    all: summary.allWintersMonthlyCm[m],
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3d9c3" />
          <XAxis dataKey="month" stroke="#6f6d5c" fontSize={11} />
          <YAxis stroke="#6f6d5c" fontSize={11} unit=" cm" width={56} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => `${v} cm`} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Bar dataKey="elNino" name="El Niño" fill="#ea580c" radius={[3, 3, 0, 0]} />
          <Bar dataKey="laNina" name="La Niña" fill="#0284c7" radius={[3, 3, 0, 0]} />
          <Bar dataKey="neutral" name="Neutral" fill="#9333ea" radius={[3, 3, 0, 0]} />
          <Line type="monotone" dataKey="all" name="All winters" stroke="#5a604f" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WinterHistoryChart({ summary }: { summary: JapanRegionSummary }) {
  const data = summary.winters.map((w) => ({
    endYear: w.endYear,
    label: w.label,
    snowfallCm: Math.round(w.snowfallCm),
    elNinoPct: w.phase === "el_nino" ? w.pctOfTypical : null,
    laNinaPct: w.phase === "la_nina" ? w.pctOfTypical : null,
    neutralPct: w.phase === "neutral" ? w.pctOfTypical : null,
    temp: w.tempDjfC,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3d9c3" />
          <XAxis dataKey="endYear" stroke="#6f6d5c" fontSize={11} />
          <YAxis yAxisId="left" stroke="#6f6d5c" fontSize={11} unit="%" width={48} />
          <YAxis yAxisId="right" orientation="right" stroke="#059669" fontSize={11} unit="°C" width={44} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
              return row ? `${row.label} winter · ${row.snowfallCm} cm` : "";
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <ReferenceLine yAxisId="left" y={100} stroke="#5a604f" strokeDasharray="4 3" />
          <Bar yAxisId="left" dataKey="elNinoPct" name="El Niño (% of typical)" stackId="a" fill="#ea580c" />
          <Bar yAxisId="left" dataKey="laNinaPct" name="La Niña (% of typical)" stackId="a" fill="#0284c7" />
          <Bar yAxisId="left" dataKey="neutralPct" name="Neutral (% of typical)" stackId="a" fill="#9333ea" />
          <Line yAxisId="right" type="monotone" dataKey="temp" name="Dec–Feb temp (°C)" stroke="#059669" strokeWidth={1.6} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
