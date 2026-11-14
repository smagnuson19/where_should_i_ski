"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BacktestMetricMode, BacktestModelMeta, LeaderboardRow } from "@/types/backtest";
import { modelColor } from "@/components/backtest/model-colors";

function fmt(v: number | null | undefined, digits = 1, suffix = ""): string {
  if (v === null || v === undefined) return "–";
  return `${v.toFixed(digits)}${suffix}`;
}

/** "22% too little" / "15% too much" */
function seasonVsObserved(biasPct: number | null | undefined): string {
  if (biasPct === null || biasPct === undefined) return "–";
  const abs = Math.abs(biasPct);
  if (abs < 5) return "about right";
  if (biasPct < 0) return `${abs.toFixed(0)}% too little`;
  return `${abs.toFixed(0)}% too much`;
}

function catchRate(pod: number | null | undefined): string {
  if (pod === null || pod === undefined) return "–";
  return `${Math.round(pod * 100)}%`;
}

function sortMetric(row: LeaderboardRow, mode: BacktestMetricMode): number | null {
  if (mode === "snowfall") return row.snowMaeIn ?? null;
  if (mode === "water") return row.sweMaeIn ?? null;
  return row.tmaxMaeF ?? null;
}

export function ModelLeaderboard({
  rows,
  models,
  mode,
}: {
  rows: LeaderboardRow[];
  models: BacktestModelMeta[];
  mode: BacktestMetricMode;
}) {
  const byId = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (a.insufficientData && !b.insufficientData) return 1;
      if (!a.insufficientData && b.insufficientData) return -1;
      const av = sortMetric(a, mode);
      const bv = sortMetric(b, mode);
      if (av === null) return 1;
      if (bv === null) return -1;
      return av - bv;
    });
    return copy;
  }, [rows, mode]);

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-6 text-sm text-slate-400">
        Not enough overlapping model and station data for this winter, timing, and region.
      </div>
    );
  }

  const subtitle =
    mode === "snowfall"
      ? "Ranked by how many inches of new snow the model missed on days that actually snowed (or that it called for snow)"
      : mode === "water"
        ? "Ranked by how many inches of water in the snowpack the model missed — the fairer scientific score"
        : "Ranked by how many degrees the daily high missed the station reading";

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-800/60">
        <div className="text-sm font-semibold text-white">Who was closest?</div>
        <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-xs text-slate-400 w-10">#</TableHead>
            <TableHead className="text-xs text-slate-400">Model</TableHead>
            {mode === "snowfall" && (
              <>
                <TableHead className="text-xs text-slate-400">Avg miss</TableHead>
                <TableHead className="text-xs text-slate-400">Season total</TableHead>
                <TableHead className="text-xs text-slate-400">Caught 6&quot;+ days</TableHead>
              </>
            )}
            {mode === "water" && (
              <>
                <TableHead className="text-xs text-slate-400">Avg miss</TableHead>
                <TableHead className="text-xs text-slate-400">Season total</TableHead>
                <TableHead className="text-xs text-slate-400">Caught big days</TableHead>
              </>
            )}
            {mode === "temperature" && (
              <>
                <TableHead className="text-xs text-slate-400">High miss</TableHead>
                <TableHead className="text-xs text-slate-400">Low miss</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row, idx) => {
            const meta = byId.get(row.modelId);
            const color = modelColor(row.modelId);
            const displayRank = row.insufficientData ? null : idx + 1;
            const best = !row.insufficientData && idx === 0;
            return (
              <TableRow key={row.modelId} className="border-slate-800/80">
                <TableCell className="font-mono text-slate-300">{displayRank ?? "–"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate flex flex-wrap items-center gap-2">
                        {meta?.label ?? row.modelId}
                        {best && row.tiedForFirst && (
                          <Badge variant="outline" className="text-[10px] border-sky-500/40 text-sky-300">
                            tied for best
                          </Badge>
                        )}
                        {best && !row.tiedForFirst && (
                          <Badge variant="outline" className="text-[10px] border-sky-500/40 text-sky-300">
                            closest
                          </Badge>
                        )}
                        {row.insufficientData && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                            not enough data
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{meta?.resolution}</div>
                    </div>
                  </div>
                </TableCell>
                {mode === "snowfall" && (
                  <>
                    <TableCell className="font-mono text-slate-200">
                      {fmt(row.snowMaeIn, 1, '"')}
                    </TableCell>
                    <TableCell className="text-slate-300 text-xs">
                      {seasonVsObserved(row.snowBiasPct)}
                    </TableCell>
                    <TableCell className="font-mono text-slate-300">
                      {catchRate(row.snowPod)}
                    </TableCell>
                  </>
                )}
                {mode === "water" && (
                  <>
                    <TableCell className="font-mono text-slate-200">
                      {fmt(row.sweMaeIn, 2, '" water')}
                    </TableCell>
                    <TableCell className="text-slate-300 text-xs">
                      {seasonVsObserved(row.sweBiasPct)}
                    </TableCell>
                    <TableCell className="font-mono text-slate-300">{catchRate(row.pod)}</TableCell>
                  </>
                )}
                {mode === "temperature" && (
                  <>
                    <TableCell className="font-mono text-slate-200">{fmt(row.tmaxMaeF, 1, "°F")}</TableCell>
                    <TableCell className="font-mono text-slate-200">{fmt(row.tminMaeF, 1, "°F")}</TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
