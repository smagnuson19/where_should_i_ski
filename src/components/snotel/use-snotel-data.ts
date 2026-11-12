"use client";

import { useEffect, useState } from "react";
import { SnotelCoreData, SnotelStation, StationHistoriesFile } from "@/types/snotel";
import { MonthlyByYearFile } from "@/types/snotel-range";

export interface SnotelData {
  core: SnotelCoreData;
  stations: SnotelStation[];
  histories: StationHistoriesFile;
  monthly: MonthlyByYearFile | null;
}

export function useSnotelData() {
  const [data, setData] = useState<SnotelData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/data/snotel-enso-core.json").then((r) => r.json()),
      fetch("/data/snotel-stations.json").then((r) => r.json()),
      fetch("/data/snotel-station-histories.json").then((r) => r.json()),
      fetch("/data/snotel-monthly-by-year.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([core, stations, histories, monthly]) => {
        if (!cancelled) setData({ core, stations, histories, monthly });
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
