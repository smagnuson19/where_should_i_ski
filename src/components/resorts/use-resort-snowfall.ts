"use client";

import { useEffect, useMemo, useState } from "react";
import { EnsoWaterYear } from "@/types/snotel";
import { YearRange } from "@/types/snotel-range";
import {
  ResortSnowfallStats,
  ResortsFile,
  SkiResort,
  SnowfallHistoryFile,
} from "@/types/resorts";
import {
  computeResortSnowfallStats,
  computeSnowfallStationStats,
  phaseMapFromAmedas,
  phaseMapFromEnso,
} from "@/lib/resorts/analysis";
import { withJapanRegions } from "@/lib/resorts/assign-japan-regions";

export function useUsResorts(
  ensoByWaterYear: Record<string, EnsoWaterYear> | undefined,
  range: YearRange
) {
  const [resorts, setResorts] = useState<SkiResort[] | null>(null);
  const [snowfall, setSnowfall] = useState<SnowfallHistoryFile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/data/resorts-us.json").then((r) => {
        if (!r.ok) throw new Error("resorts-us missing");
        return r.json() as Promise<ResortsFile>;
      }),
      fetch("/data/us-snowfall.json").then((r) => {
        if (!r.ok) throw new Error("us-snowfall missing");
        return r.json() as Promise<SnowfallHistoryFile>;
      }),
    ])
      .then(([rf, sf]) => {
        if (!alive) return;
        setResorts(rf.resorts);
        setSnowfall(sf);
      })
      .catch((err) => {
        console.error("Failed to load US resort snowfall data", err);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    if (!resorts || !snowfall || !ensoByWaterYear) return new Map<string, ResortSnowfallStats>();
    try {
      const phases = phaseMapFromEnso(ensoByWaterYear);
      const stationStats = computeSnowfallStationStats(snowfall, phases, range, "in");
      return computeResortSnowfallStats(resorts, stationStats, phases, range, "in");
    } catch {
      return new Map<string, ResortSnowfallStats>();
    }
  }, [resorts, snowfall, ensoByWaterYear, range]);

  return { resorts: resorts ?? [], stats, failed, loading: !resorts && !failed };
}

export function useJapanResorts(range: YearRange) {
  const [resorts, setResorts] = useState<SkiResort[] | null>(null);
  const [snowfall, setSnowfall] = useState<SnowfallHistoryFile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/data/resorts-japan.json").then((r) => {
        if (!r.ok) throw new Error("resorts-japan missing");
        return r.json() as Promise<ResortsFile>;
      }),
      fetch("/data/amedas-snow.json").then((r) => {
        if (!r.ok) throw new Error("amedas-snow missing");
        return r.json() as Promise<SnowfallHistoryFile>;
      }),
    ])
      .then(([rf, sf]) => {
        if (!alive) return;
        setResorts(withJapanRegions(rf.resorts));
        setSnowfall(sf);
      })
      .catch((err) => {
        console.error("Failed to load Japan resort snowfall data", err);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    if (!resorts || !snowfall) return new Map<string, ResortSnowfallStats>();
    try {
      const phases = phaseMapFromAmedas(snowfall);
      const stationStats = computeSnowfallStationStats(snowfall, phases, range, "cm");
      return computeResortSnowfallStats(resorts, stationStats, phases, range, "cm");
    } catch {
      return new Map<string, ResortSnowfallStats>();
    }
  }, [resorts, snowfall, range]);

  return { resorts: resorts ?? [], stats, failed, loading: !resorts && !failed };
}
