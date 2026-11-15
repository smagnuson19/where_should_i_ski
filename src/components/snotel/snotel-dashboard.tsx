"use client";

import React, { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { EnsoPhase, SnotelStation } from "@/types/snotel";
import { YearRange } from "@/types/snotel-range";
import { SkiResort } from "@/types/resorts";
import { useSnotelData } from "@/components/snotel/use-snotel-data";
import { useRangeAnalysis } from "@/components/snotel/use-range-analysis";
import { useUsResorts } from "@/components/resorts/use-resort-snowfall";
import { PlainSummary } from "@/components/snotel/plain-summary";
import { ViewControls } from "@/components/snotel/view-controls";
import { EnsoMapPanel } from "@/components/snotel/enso-map-panel";
import { StationList } from "@/components/snotel/station-list";
import { ResortList } from "@/components/resorts/resort-list";
import { ResortDetailModal } from "@/components/resorts/resort-detail-modal";
import { RegionalDetails, REGION_DETAILS_ID } from "@/components/snotel/regional-details";
import { StationHistoryModal } from "@/components/snotel/station-history-modal";
import { GlossaryPanel, Term } from "@/components/snotel/glossary";
import { AboutData } from "@/components/snotel/about-data";
import { TrailHero } from "@/components/trail/trail-hero";

function matchesSearch(st: SnotelStation, q: string) {
  return (
    !q ||
    st.name.toLowerCase().includes(q) ||
    st.state.toLowerCase().includes(q) ||
    st.triplet.toLowerCase().includes(q) ||
    st.county.toLowerCase().includes(q)
  );
}

function matchesResort(r: SkiResort, q: string) {
  return !q || r.name.toLowerCase().includes(q) || r.state.toLowerCase().includes(q);
}

export function SnotelDashboard() {
  const { data, failed } = useSnotelData();
  const [phase, setPhase] = useState<EnsoPhase>("el_nino");
  const [customRange, setCustomRange] = useState<YearRange | null>(null);
  const [elevBand, setElevBand] = useState("ALL");
  const [selectedRegion, setSelectedRegion] = useState("ALL");
  const [showSites, setShowSites] = useState(false);
  const [showResorts, setShowResorts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [resortSearch, setResortSearch] = useState("");
  const [elevOffsetFt, setElevOffsetFt] = useState(0);
  const [activeStation, setActiveStation] = useState<SnotelStation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeResort, setActiveResort] = useState<SkiResort | null>(null);
  const [resortModalOpen, setResortModalOpen] = useState(false);

  const firstYear = data?.core.earliestWaterYear ?? 1930;
  const lastYear = data?.core.latestWaterYear ?? 2026;
  const range = useMemo(
    () => customRange ?? { start: firstYear, end: lastYear },
    [customRange, firstYear, lastYear]
  );
  const analysis = useRangeAnalysis(data, range.start, range.end, elevBand, selectedRegion);
  const { resorts, stats: resortStats } = useUsResorts(data?.core.ensoByWaterYear, range);

  const q = searchQuery.trim().toLowerCase();
  const mapSites = useMemo(
    () =>
      (data?.stations ?? []).filter(
        (st) => (elevBand === "ALL" || st.elevBand === elevBand) && matchesSearch(st, q)
      ),
    [data, elevBand, q]
  );
  const listedSites = useMemo(
    () => mapSites.filter((st) => selectedRegion === "ALL" || st.region === selectedRegion),
    [mapSites, selectedRegion]
  );
  const rq = resortSearch.trim().toLowerCase();
  const listedResorts = useMemo(
    () =>
      resorts.filter(
        (r) =>
          (selectedRegion === "ALL" || r.region === selectedRegion) && matchesResort(r, rq)
      ),
    [resorts, selectedRegion, rq]
  );

  if (!data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-700 gap-3">
        {failed ? (
          <p className="text-sm">Could not load the SNOTEL data files. Try reloading the page.</p>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-pine-600" />
            <p className="text-sm font-medium">Loading 954 SNOTEL sites and 97 winters of ENSO history…</p>
          </>
        )}
      </div>
    );
  }

  const { core } = data;
  const bandLabel = core.elevationBands.find((b) => b.id === elevBand)?.label ?? "All Elevations";
  const scopeLabel = selectedRegion === "ALL" ? "all regions" : core.regions[selectedRegion]?.shortName ?? selectedRegion;

  const openStation = (st: SnotelStation) => {
    setActiveStation(st);
    setModalOpen(true);
  };
  const openResort = (r: SkiResort) => {
    setActiveResort(r);
    setResortModalOpen(true);
  };
  const focusRegion = (regionId: string) => {
    setSelectedRegion(regionId);
    requestAnimationFrame(() =>
      document.getElementById(REGION_DETAILS_ID)?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  return (
    <>
      <TrailHero>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-950">
              Western US Snowpack in El Niño, La Niña &amp; Neutral Winters
            </h1>
            <span className="inline-flex items-center rounded-full bg-slate-950/5 border border-slate-950/25 px-2.5 py-0.5 text-xs font-medium text-slate-800 font-mono">
              {core.totalStations} SNOTEL Sites · WY {firstYear}–{lastYear}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-3xl">
            Historical snowpack analysis across {core.totalStations} USDA NRCS <Term k="snotel">SNOTEL</Term> mountain
            stations ({lastYear - firstYear + 1} <Term k="waterYear">water years</Term>). Select an{" "}
            <Term k="enso">ENSO</Term> phase, year window, or elevation band below — every map, ranking, and chart updates
            instantly.
          </p>
        </div>
      </TrailHero>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-16 space-y-5">
        <PlainSummary
          summaries={analysis.summaries}
          regions={core.regions}
          phaseCounts={analysis.phaseCounts}
          range={range}
          bandLabel={bandLabel}
        />

        <ViewControls
          phase={phase}
          onPhaseChange={setPhase}
          range={range}
          onRangeChange={setCustomRange}
          firstYear={firstYear}
          lastYear={lastYear}
          phaseCounts={analysis.phaseCounts}
          elevBand={elevBand}
          onElevBandChange={setElevBand}
          elevationBands={core.elevationBands}
        />

        <EnsoMapPanel
          regions={core.regions}
          allStations={data.stations}
          visibleSites={mapSites}
          summaries={analysis.summaries}
          stationStats={analysis.stationStats}
          phase={phase}
          selectedRegion={selectedRegion}
          onSelectRegion={focusRegion}
          onHighlightRegion={setSelectedRegion}
          showSites={showSites}
          onShowSitesChange={setShowSites}
          activeStation={modalOpen ? activeStation : null}
          onOpenStation={openStation}
          resorts={resorts}
          showResorts={showResorts}
          onShowResortsChange={setShowResorts}
          resortStats={resortStats}
          activeResort={resortModalOpen ? activeResort : null}
          onOpenResort={openResort}
        />

        {showSites && (
          <StationList
            stations={listedSites}
            stationStats={analysis.stationStats}
            phase={phase}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            scopeLabel={scopeLabel}
            onOpenStation={openStation}
          />
        )}

        {showResorts && resorts.length > 0 && (
          <ResortList
            resorts={listedResorts}
            stats={resortStats}
            phase={phase}
            searchQuery={resortSearch}
            onSearchChange={setResortSearch}
            scopeLabel={scopeLabel}
            unit="in"
            onOpenResort={openResort}
          />
        )}

        <RegionalDetails
          core={core}
          stations={data.stations}
          stationStats={analysis.stationStats}
          summaries={analysis.summaries}
          storms={analysis.storms}
          seasonal={analysis.seasonal}
          range={range}
          elevBand={elevBand}
          bandLabel={bandLabel}
          selectedRegion={selectedRegion}
          onSelectRegion={setSelectedRegion}
          elevOffsetFt={elevOffsetFt}
          onElevOffsetChange={setElevOffsetFt}
        />

        <GlossaryPanel />
        <AboutData source={core.source} totalStations={core.totalStations} resortCount={resorts.length || undefined} />

        <StationHistoryModal
          station={activeStation}
          open={modalOpen}
          onOpenChange={setModalOpen}
          regions={core.regions}
          ensoByWaterYear={core.ensoByWaterYear}
          stationHistoryRows={activeStation ? data.histories.histories[activeStation.triplet] || null : null}
        />

        <ResortDetailModal
          resort={activeResort}
          stats={activeResort ? resortStats.get(activeResort.id) : undefined}
          open={resortModalOpen}
          onOpenChange={setResortModalOpen}
          unit="in"
          regionName={activeResort?.region ? core.regions[activeResort.region]?.shortName : null}
        />
      </div>
    </>
  );
}
