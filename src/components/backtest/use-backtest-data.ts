"use client";

import { useEffect, useState } from "react";
import { BacktestSummary, StationBacktestFile } from "@/types/backtest";

export function useBacktestSummary() {
  const [data, setData] = useState<BacktestSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/model-backtest/summary.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: BacktestSummary) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, failed };
}

export function useStationBacktest(triplet: string | null) {
  const [data, setData] = useState<StationBacktestFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!triplet) {
      setData(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    const safe = triplet.replace(/:/g, "_");
    fetch(`/data/model-backtest/stations/${safe}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: StationBacktestFile) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
          setData(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [triplet]);

  return { data, loading, failed };
}
