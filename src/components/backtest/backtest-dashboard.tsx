"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Target } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBacktestSummary } from "@/components/backtest/use-backtest-data";
import { ModelLeaderboard } from "@/components/backtest/model-leaderboard";
import { SkillByLeadChart } from "@/components/backtest/skill-by-lead-chart";
import { RegionWinners } from "@/components/backtest/region-winners";
import { StationDrilldown } from "@/components/backtest/station-drilldown";
import { BacktestMethodologyPanel } from "@/components/backtest/methodology";
import { BacktestLead, BacktestMetricMode } from "@/types/backtest";
import { TrailHero } from "@/components/trail/trail-hero";

const LEAD_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "Same day" },
  { value: "1", label: "1 day before" },
  { value: "3", label: "3 days before" },
  { value: "5", label: "5 days before" },
];

const MODE_OPTIONS: { value: BacktestMetricMode; label: string }[] = [
  { value: "snowfall", label: "New snow" },
  { value: "water", label: "Water in snow" },
  { value: "temperature", label: "Temperature" },
];

function winnerMetric(row: {
  snowMaeIn?: number | null;
  sweMaeIn: number | null;
  tmaxMaeF: number | null;
  snowBiasPct?: number | null;
  sweBiasPct: number | null;
  snowPod?: number | null;
  pod: number | null;
}, mode: BacktestMetricMode): string {
  if (mode === "snowfall") {
    const miss = row.snowMaeIn != null ? `${row.snowMaeIn.toFixed(1)}" avg miss` : "–";
    const catchPct = row.snowPod != null ? `${Math.round(row.snowPod * 100)}% of 6"+ days` : null;
    return [miss, catchPct].filter(Boolean).join(" · ");
  }
  if (mode === "water") {
    const miss = row.sweMaeIn != null ? `${row.sweMaeIn.toFixed(2)}" water avg miss` : "–";
    const catchPct = row.pod != null ? `${Math.round(row.pod * 100)}% of big days` : null;
    return [miss, catchPct].filter(Boolean).join(" · ");
  }
  return row.tmaxMaeF != null ? `${row.tmaxMaeF.toFixed(1)}°F avg high miss` : "–";
}

export function BacktestDashboard() {
  const { data, failed } = useBacktestSummary();
  const [winter, setWinter] = useState<number | null>(null);
  const [lead, setLead] = useState<BacktestLead>(3);
  const [region, setRegion] = useState("ALL");
  const [mode, setMode] = useState<BacktestMetricMode>("snowfall");

  const activeWinter = winter ?? data?.winters?.[0] ?? 2026;

  const regionItems = useMemo(() => {
    if (!data) return [{ value: "ALL", label: "All regions" }];
    return [
      { value: "ALL", label: "All regions" },
      ...data.regions.map((r) => ({ value: r.id, label: r.label })),
    ];
  }, [data]);

  const winterItems = useMemo(() => {
    if (!data) return [];
    return data.winters.map((w) => ({
      value: String(w),
      label: `${w - 1}–${String(w).slice(2)}`,
    }));
  }, [data]);

  const boardRows = useMemo(() => {
    if (!data) return [];
    return data.leaderboard.filter(
      (r) => r.winter === activeWinter && r.lead === lead && r.region === region
    );
  }, [data, activeWinter, lead, region]);

  const winner = useMemo(() => {
    const scored = boardRows
      .filter((r) => {
        if (r.insufficientData) return false;
        if (mode === "snowfall") return r.snowMaeIn != null;
        if (mode === "water") return r.sweMaeIn != null;
        return r.tmaxMaeF != null;
      })
      .sort((a, b) => {
        const av =
          mode === "snowfall" ? a.snowMaeIn! : mode === "water" ? a.sweMaeIn! : a.tmaxMaeF!;
        const bv =
          mode === "snowfall" ? b.snowMaeIn! : mode === "water" ? b.sweMaeIn! : b.tmaxMaeF!;
        return av - bv;
      });
    return scored[0] ?? null;
  }, [boardRows, mode]);

  if (failed) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center space-y-3">
        <Target className="w-8 h-8 text-slate-500 mx-auto" />
        <div className="text-lg font-semibold text-slate-950">Backtest data not built yet</div>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          Run <code className="text-pine-700">python3 scripts/ingest_model_backtest.py --winters 2026</code> to
          score the models, then refresh.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-2 text-sm text-slate-700">
        <Loader2 className="w-5 h-5 animate-spin text-pine-600" />
        Loading model backtest…
      </div>
    );
  }

  const winnerMeta = winner ? data.models.find((m) => m.id === winner.modelId) : null;
  const leadLabel = LEAD_OPTIONS.find((o) => o.value === String(lead))?.label ?? "";

  return (
    <>
      <TrailHero>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-pine-800">
            <Target className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Forecast check</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950">
            Which forecast got the mountain snow right?
          </h1>
          <p className="text-sm text-slate-700 max-w-3xl leading-relaxed">
            We compared past model runs to {data.stations.length} mountain weather stations near Western ski resorts.
            Pick how far ahead you care about, then see who was closest.
            {data.incomplete ? (
              <span className="text-amber-800"> Some data is still downloading — re-run the script to finish.</span>
            ) : null}
          </p>
        </div>
      </TrailHero>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-16 space-y-6">
        <section className="flex flex-wrap gap-2.5 items-center">
          <Select
            items={winterItems}
            value={String(activeWinter)}
            onValueChange={(v) => setWinter(v ? Number(v) : null)}
          >
            <SelectTrigger className="h-9 bg-slate-100 border-slate-200 text-xs rounded-lg min-w-[7.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-50 border-slate-300">
              {winterItems.map((w) => (
                <SelectItem key={w.value} value={w.value} className="text-xs">
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={LEAD_OPTIONS}
            value={String(lead)}
            onValueChange={(v) => setLead(Number(v) as BacktestLead)}
          >
            <SelectTrigger className="h-9 bg-slate-100 border-slate-200 text-xs rounded-lg min-w-[9.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-50 border-slate-300">
              {LEAD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select items={regionItems} value={region} onValueChange={(v) => setRegion(v ? String(v) : "ALL")}>
            <SelectTrigger className="h-9 bg-slate-100 border-slate-200 text-xs rounded-lg min-w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-50 border-slate-300">
              {regionItems.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {MODE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`px-3 py-1.5 text-xs rounded-md transition ${
                  mode === value
                    ? "bg-pine-500/20 text-pine-800 border border-pine-500/30"
                    : "text-slate-600 hover:text-slate-800 border border-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {winner && mode !== "temperature" && (
          <section className="rounded-2xl border border-pine-500/25 bg-pine-500/5 px-4 sm:px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-pine-700/90">
              Closest model · {leadLabel.toLowerCase()}
            </div>
            <div className="text-lg sm:text-xl font-semibold text-slate-950 mt-1">
              {winnerMeta?.label ?? winner.modelId}
              {winner.tiedForFirst ? (
                <span className="text-sm font-normal text-pine-700 ml-2">tied with others</span>
              ) : null}
            </div>
            <div className="text-xs text-slate-600 mt-1">{winnerMetric(winner, mode)}</div>
          </section>
        )}

        <ModelLeaderboard rows={boardRows} models={data.models} mode={mode} />

        <section className="rounded-2xl border border-slate-200/90 bg-slate-50/60 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200/60">
            <div className="text-sm font-semibold text-slate-950">Does the forecast hold up further out?</div>
            <div className="text-xs text-slate-600 mt-0.5">
              Average miss from same-day out to five days ahead ·{" "}
              {region === "ALL" ? "all regions" : regionItems.find((r) => r.value === region)?.label}
            </div>
          </div>
          <div className="px-2 sm:px-4 py-3">
            <SkillByLeadChart
              rows={data.leaderboard}
              models={data.models}
              mode={mode}
              winter={activeWinter}
              region={region}
            />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">Best by region</div>
            <div className="text-xs text-slate-600 mt-0.5">
              Closest model for {leadLabel.toLowerCase()} in each part of the West
            </div>
          </div>
          <RegionWinners
            rows={data.leaderboard}
            models={data.models}
            regions={data.regions}
            winter={activeWinter}
            lead={lead}
            mode={mode}
          />
        </section>

        <StationDrilldown
          stations={data.stations}
          models={data.models}
          winter={activeWinter}
          lead={lead}
          mode={mode === "temperature" ? "water" : mode}
        />

        <BacktestMethodologyPanel
          methodology={data.methodology}
          models={data.models}
          stationCount={data.stations.length}
        />
      </div>
    </>
  );
}
