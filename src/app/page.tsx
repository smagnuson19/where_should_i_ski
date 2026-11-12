"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  SnotelCoreData,
  SnotelStation,
  StationHistoriesFile,
} from "@/types/snotel";
import { SnotelInteractiveMap } from "@/components/snotel/snotel-map";
import { RegionalCharts } from "@/components/snotel/regional-charts";
import { StationHistoryModal } from "@/components/snotel/station-history-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  CloudSnow,
  Layers,
  Loader2,
  MapPin,
  Mountain,
  Search,
  Sparkles,
  ThermometerSnowflake,
} from "lucide-react";

export default function SnotelEnsoDashboardPage() {
  const [coreData, setCoreData] = useState<SnotelCoreData | null>(null);
  const [stations, setStations] = useState<SnotelStation[]>([]);
  const [histories, setHistories] = useState<StationHistoriesFile | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");
  const [selectedElevBand, setSelectedElevBand] = useState<string>("ALL");
  const [mapColorMode, setMapColorMode] = useState<
    "enso_spread" | "el_nino_pct" | "la_nina_pct" | "elevation" | "median_swe"
  >("enso_spread");
  const [elevOffsetFt, setElevOffsetFt] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [activeStation, setActiveStation] = useState<SnotelStation | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([
      fetch("/data/snotel-enso-core.json").then((r) => r.json()),
      fetch("/data/snotel-stations.json").then((r) => r.json()),
      fetch("/data/snotel-station-histories.json").then((r) => r.json()),
    ])
      .then(([core, stList, hist]) => {
        setCoreData(core);
        setStations(stList);
        setHistories(hist);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stations.filter((st) => {
      if (selectedRegion !== "ALL" && st.region !== selectedRegion) return false;
      if (selectedElevBand !== "ALL" && st.elevBand !== selectedElevBand) return false;
      if (
        q &&
        !st.name.toLowerCase().includes(q) &&
        !st.state.toLowerCase().includes(q) &&
        !st.triplet.toLowerCase().includes(q) &&
        !st.county.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [stations, selectedRegion, selectedElevBand, searchQuery]);

  const kpiStats = useMemo(() => {
    if (!filteredStations.length) {
      return { count: 0, medSwe: 0, elPct: 100, laPct: 100, medElev: 0, winterTemp: 25 };
    }
    const n = filteredStations.length;
    const medSwe = filteredStations.reduce((a, b) => a + b.medianPeakSwe, 0) / n;
    const elPct = filteredStations.reduce((a, b) => a + b.elNinoPctMedian, 0) / n;
    const laPct = filteredStations.reduce((a, b) => a + b.laNinaPctMedian, 0) / n;
    const medElev = filteredStations.reduce((a, b) => a + b.elevation, 0) / n;
    const tStations = filteredStations.filter((s) => s.winterTavg !== null);
    const winterTemp =
      tStations.length > 0
        ? tStations.reduce((a, b) => a + (b.winterTavg || 0), 0) / tStations.length
        : 25.0;
    return { count: n, medSwe, elPct, laPct, medElev, winterTemp };
  }, [filteredStations]);

  const sweMultiplier = Math.max(0.35, 1 + (elevOffsetFt / 1000) * 0.08);
  const tempOffsetF = -(elevOffsetFt / 1000) * 3.5;

  const openStationPopup = (st: SnotelStation) => {
    setActiveStation(st);
    setModalOpen(true);
  };

  if (loading || !coreData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <p className="text-sm font-medium">Loading 954 SNOTEL Snow Telemetry Sites & Historical ENSO Records (1930–2026)...</p>
      </div>
    );
  }

  const regAggregate =
    coreData.regionalAggregates[selectedRegion]?.[selectedElevBand] ||
    coreData.regionalAggregates[selectedRegion]?.["ALL"] ||
    coreData.regionalAggregates["ALL"]["ALL"];

  const activeStorm =
    coreData.stormSummaryByRegion[selectedRegion] || coreData.stormSummaryByRegion["ALL"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-14">
      {/* Header Banner */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <CloudSnow className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  SNOTEL × ENSO Historical Snowpack, Temperature & Storm Explorer
                </h1>
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px]">
                  954 Snow Sites • WY 1930–2026
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                USDA NRCS AWDB Period-of-Record Snow Telemetry paired with NOAA CPC Oceanic Niño Index (El Niño / La Niña / Median)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {filteredStations[0] && (
              <Button
                size="sm"
                onClick={() => openStationPopup(filteredStations[0])}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs h-8 gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Inspect Station History Popup ({filteredStations[0].name})</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-4 space-y-4">
        {/* Filter Controls: Region + Elevation Band + Altitude Lapse-Rate Adjuster */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 mr-1">Region:</span>
              <Button
                size="sm"
                variant={selectedRegion === "ALL" ? "default" : "outline"}
                className="h-7 text-xs px-2.5"
                onClick={() => setSelectedRegion("ALL")}
              >
                All Regions ({stations.length})
              </Button>
              {Object.values(coreData.regions).map((r) => (
                <Button
                  key={r.id}
                  size="sm"
                  variant={selectedRegion === r.id ? "default" : "outline"}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setSelectedRegion(r.id)}
                >
                  {r.shortName}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-800/80 items-center">
            <div className="lg:col-span-7 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Elevation Band:
              </span>
              {coreData.elevationBands.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedElevBand(b.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    selectedElevBand === b.id
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Mountain className="w-3.5 h-3.5 text-sky-400" />
                  Elevation Shift Adjuster (Orographic SWE & Lapse Temp):
                </span>
                <span className="font-mono text-sky-300 font-semibold">
                  {elevOffsetFt >= 0 ? `+${elevOffsetFt}` : elevOffsetFt} ft (×{sweMultiplier.toFixed(2)} SWE, {tempOffsetF >= 0 ? "+" : ""}{tempOffsetF.toFixed(1)}°F)
                </span>
              </div>
              <Slider
                value={[elevOffsetFt]}
                min={-3000}
                max={3000}
                step={250}
                onValueChange={(v) => setElevOffsetFt(Array.isArray(v) ? v[0] : v)}
              />
            </div>
          </div>
        </section>

        {/* Top KPI Summary Cards */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] text-slate-400">Active Filtered SNOTELs</div>
            <div className="text-xl font-bold text-white mt-0.5">{kpiStats.count}</div>
            <div className="text-[11px] text-slate-400">Mean Elev: {Math.round(kpiStats.medElev + elevOffsetFt).toLocaleString()} ft</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] text-slate-400">Historical Median Peak SWE</div>
            <div className="text-xl font-bold text-white mt-0.5">{(kpiStats.medSwe * sweMultiplier).toFixed(1)}&quot;</div>
            <div className="text-[11px] text-slate-400">1930–2026 Baseline</div>
          </div>
          <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-3">
            <div className="text-[11px] text-orange-300">El Niño Peak SWE (% Med)</div>
            <div className="text-xl font-bold text-orange-400 mt-0.5">{kpiStats.elPct.toFixed(1)}%</div>
            <div className="text-[11px] text-orange-300/80">Warm ENSO Phase</div>
          </div>
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3">
            <div className="text-[11px] text-sky-300">La Niña Peak SWE (% Med)</div>
            <div className="text-xl font-bold text-sky-400 mt-0.5">{kpiStats.laPct.toFixed(1)}%</div>
            <div className="text-[11px] text-sky-300/80">Cool ENSO Phase</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] text-slate-400">Nov–Mar Mean Winter Temp</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{(kpiStats.winterTemp + tempOffsetF).toFixed(1)}°F</div>
            <div className="text-[11px] text-slate-400">Sub-Freezing Days: {activeStorm.all?.subfreezingDays?.toFixed(0) ?? 48}/yr</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] text-slate-400">Snowfall Events ≥2&quot; / ≥6&quot;</div>
            <div className="text-xl font-bold text-purple-300 mt-0.5">
              {activeStorm.all?.events2in?.toFixed(1) ?? "15.2"} / {activeStorm.all?.events6in?.toFixed(1) ?? "4.4"}
            </div>
            <div className="text-[11px] text-slate-400">
              EN: {activeStorm.el_nino?.events2in?.toFixed(1)}d | LN: {activeStorm.la_nina?.events2in?.toFixed(1)}d
            </div>
          </div>
        </section>

        {/* Map + Station Browser Split */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-300">
                Interactive SNOTEL Network Map (Click any site marker to open historical popup UI)
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    ["enso_spread", "ENSO Signal Spread"],
                    ["el_nino_pct", "El Niño % Median"],
                    ["la_nina_pct", "La Niña % Median"],
                    ["elevation", "Elevation Band"],
                    ["median_swe", "Median SWE"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setMapColorMode(mode)}
                    className={`px-2 py-1 rounded text-[11px] font-medium ${
                      mapColorMode === mode
                        ? "bg-sky-600 text-white"
                        : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <SnotelInteractiveMap
              stations={filteredStations}
              regions={coreData.regions}
              selectedRegion={selectedRegion}
              selectedStation={activeStation}
              onSelectStation={openStationPopup}
              colorMode={mapColorMode}
            />
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 flex flex-col max-h-[560px]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>SNOTEL Sites ({filteredStations.length}) — Click for History</span>
              </h2>
            </div>
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search station name, state (CO, WA, UT...), ID..."
                className="pl-8 h-8 bg-slate-950 border-slate-800 text-xs"
              />
            </div>
            <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
              {filteredStations.slice(0, 80).map((st) => (
                <button
                  key={st.triplet}
                  onClick={() => openStationPopup(st)}
                  className="w-full text-left rounded-lg border border-slate-800/90 bg-slate-950/70 hover:bg-slate-800/80 hover:border-sky-500/50 p-2.5 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white truncate">{st.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-sky-300">
                      {st.elevation.toLocaleString()} ft
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>
                      {st.state} • {st.earliestYear}–{st.latestYear} ({st.yearsCount}y)
                    </span>
                    <span className="font-mono">
                      Med <strong className="text-white">{st.medianPeakSwe}&quot;</strong> |{" "}
                      <span className="text-orange-400">EN {st.elNinoPctMedian}%</span> |{" "}
                      <span className="text-sky-400">LN {st.laNinaPctMedian}%</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Regional & Elevation Charts */}
        <RegionalCharts
          seasonalCycle={regAggregate.seasonalCycle}
          annualSeries={regAggregate.annualSeries}
          stormByRegion={coreData.stormSummaryByRegion}
          regions={coreData.regions}
          selectedRegion={selectedRegion}
          sweMultiplier={sweMultiplier}
          tempOffsetF={tempOffsetF}
        />
      </main>

      {/* Station History Popup Modal */}
      <StationHistoryModal
        station={activeStation}
        open={modalOpen}
        onOpenChange={setModalOpen}
        regions={coreData.regions}
        ensoByWaterYear={coreData.ensoByWaterYear}
        stationHistoryRows={
          activeStation && histories ? histories.histories[activeStation.triplet] || null : null
        }
      />
    </div>
  );
}
