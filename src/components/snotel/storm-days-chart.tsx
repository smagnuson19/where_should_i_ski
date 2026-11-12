"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RegionInfo, StormSummaryMetrics } from "@/types/snotel";
import { CHART_TOOLTIP_STYLE } from "@/components/snotel/swe-season-chart";

interface StormDaysChartProps {
  storms: Record<string, Record<string, StormSummaryMetrics>>;
  regions: Record<string, RegionInfo>;
}

export function StormDaysChart({ storms, regions }: StormDaysChartProps) {
  const data = Object.keys(regions).map((id) => {
    const s = storms[id] || {};
    return {
      region: regions[id].shortName,
      elNino: s.el_nino?.events2in ?? 0,
      laNina: s.la_nina?.events2in ?? 0,
      all: s.all?.events2in ?? 0,
    };
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis type="number" stroke="#94a3b8" fontSize={11} unit=" d" />
          <YAxis dataKey="region" type="category" stroke="#cbd5e1" fontSize={10} width={120} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => `${v} days`} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Bar dataKey="elNino" name="El Niño" fill="#f97316" radius={[0, 3, 3, 0]} />
          <Bar dataKey="laNina" name="La Niña" fill="#38bdf8" radius={[0, 3, 3, 0]} />
          <Bar dataKey="all" name="All winters" fill="#94a3b8" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
