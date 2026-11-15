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
          <CartesianGrid strokeDasharray="3 3" stroke="#e3d9c3" />
          <XAxis dataKey="monthLabel" stroke="#6f6d5c" fontSize={11} />
          <YAxis stroke="#6f6d5c" fontSize={11} unit="°F" width={48} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => `${v}°F`} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <ReferenceLine
            y={32}
            stroke="#dc2626"
            strokeDasharray="4 4"
            label={{ value: "32°F freezing", fill: "#b91c1c", fontSize: 10 }}
          />
          <Line type="monotone" dataKey="tavgMedian" name="All winters" stroke="#5a604f" strokeWidth={2} strokeDasharray="4 3" />
          <Line type="monotone" dataKey="tavgElNino" name="El Niño" stroke="#ea580c" strokeWidth={2.2} />
          <Line type="monotone" dataKey="tavgLaNina" name="La Niña" stroke="#0284c7" strokeWidth={2.2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
