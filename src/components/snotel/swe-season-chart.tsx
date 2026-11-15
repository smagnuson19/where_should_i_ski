"use client";

import React from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SeasonalMonthPoint } from "@/types/snotel";

export const CHART_TOOLTIP_STYLE = { backgroundColor: "#fbf8f0", borderColor: "#d4c7aa", fontSize: "12px" };

export function SweSeasonChart({ data }: { data: SeasonalMonthPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3d9c3" />
          <XAxis dataKey="monthLabel" stroke="#6f6d5c" fontSize={11} />
          <YAxis stroke="#6f6d5c" fontSize={11} unit=" in" width={52} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => `${v} in`} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Area
            type="monotone"
            dataKey="sweMedian"
            name="All winters (median)"
            fill="#8b8774"
            fillOpacity={0.2}
            stroke="#5a604f"
            strokeWidth={2.2}
            strokeDasharray="5 3"
          />
          <Line type="monotone" dataKey="sweElNino" name="El Niño" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="sweLaNina" name="La Niña" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="sweNeutral" name="Neutral" stroke="#9333ea" strokeWidth={1.6} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
