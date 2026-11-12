"use client";

import React from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SeasonalMonthPoint } from "@/types/snotel";

export const CHART_TOOLTIP_STYLE = { backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "12px" };

export function SweSeasonChart({ data }: { data: SeasonalMonthPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} />
          <YAxis stroke="#94a3b8" fontSize={11} unit=" in" width={52} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => `${v} in`} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Area
            type="monotone"
            dataKey="sweMedian"
            name="All winters (median)"
            fill="#475569"
            fillOpacity={0.2}
            stroke="#e2e8f0"
            strokeWidth={2.2}
            strokeDasharray="5 3"
          />
          <Line type="monotone" dataKey="sweElNino" name="El Niño" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="sweLaNina" name="La Niña" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="sweNeutral" name="Neutral" stroke="#a855f7" strokeWidth={1.6} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
