"use client";

import React from "react";
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SeasonalMonthPoint } from "@/types/snotel";
import { CHART_TOOLTIP_STYLE } from "@/components/snotel/swe-season-chart";

export function TempSeasonChart({ data }: { data: SeasonalMonthPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} />
          <YAxis stroke="#94a3b8" fontSize={11} unit="°F" width={48} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => `${v}°F`} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <ReferenceLine
            y={32}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: "32°F freezing", fill: "#f87171", fontSize: 10 }}
          />
          <Line type="monotone" dataKey="tavgMedian" name="All winters" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="4 3" />
          <Line type="monotone" dataKey="tavgElNino" name="El Niño" stroke="#f97316" strokeWidth={2.2} />
          <Line type="monotone" dataKey="tavgLaNina" name="La Niña" stroke="#38bdf8" strokeWidth={2.2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
