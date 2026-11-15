"use client";

import React, { useMemo } from "react";
import { BacktestMetricMode, BacktestModelMeta, BacktestRegionMeta, LeaderboardRow } from "@/types/backtest";
import { modelColor } from "@/components/backtest/model-colors";

function metricOf(row: LeaderboardRow, mode: BacktestMetricMode): number | null {
  if (mode === "snowfall") return row.snowMaeIn ?? null;
  if (mode === "water") return row.sweMaeIn ?? null;
  return row.tmaxMaeF ?? null;
}

function formatMetric(v: number, mode: BacktestMetricMode): string {
  if (mode === "snowfall") return `${v.toFixed(1)}" snow miss`;
  if (mode === "water") return `${v.toFixed(2)}" water miss`;
  return `${v.toFixed(1)}°F high miss`;
}

export function RegionWinners({
  rows,
  models,
  regions,
  winter,
  lead,
  mode,
}: {
  rows: LeaderboardRow[];
  models: BacktestModelMeta[];
  regions: BacktestRegionMeta[];
  winter: number;
  lead: number;
  mode: BacktestMetricMode;
}) {
  const byId = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);

  const cards = useMemo(() => {
    return regions.map((region) => {
      const subset = rows
        .filter(
          (r) =>
            r.winter === winter &&
            r.lead === lead &&
            r.region === region.id &&
            !r.insufficientData &&
            metricOf(r, mode) != null
        )
        .sort((a, b) => metricOf(a, mode)! - metricOf(b, mode)!);
      const winner = subset[0];
      const runner = subset[1];
      if (!winner) {
        return { region, winner: null, margin: null as number | null, runner: null };
      }
      const wMetric = metricOf(winner, mode)!;
      const rMetric = runner ? metricOf(runner, mode) : null;
      const margin = rMetric != null ? rMetric - wMetric : null;
      return { region, winner, margin, runner };
    });
  }, [rows, regions, winter, lead, mode]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map(({ region, winner, margin, runner }) => (
        <div
          key={region.id}
          className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-1.5"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            {region.label}
          </div>
          {!winner ? (
            <div className="text-sm text-slate-500">No data</div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: modelColor(winner.modelId) }}
                />
                <div className="text-base font-semibold text-slate-950 truncate">
                  {byId.get(winner.modelId)?.label ?? winner.modelId}
                </div>
              </div>
              <div className="text-xs text-slate-600">
                {formatMetric(metricOf(winner, mode)!, mode)}
                {margin != null && runner && (
                  <span className="text-slate-500">
                    {" "}
                    · edged out {byId.get(runner.modelId)?.label?.split(" ")[0] ?? runner.modelId}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
