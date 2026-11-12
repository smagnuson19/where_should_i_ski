"use client";

import React, { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { EnsoPhase, SnotelStation } from "@/types/snotel";
import { YearRange } from "@/types/snotel-range";
import { useSnotelData } from "@/components/snotel/use-snotel-data";
import { useRangeAnalysis } from "@/components/snotel/use-range-analysis";
import { PlainSummary } from "@/components/snotel/plain-summary";
import { ViewControls } from "@/components/snotel/view-controls";
import { EnsoMapPanel } from "@/components/snotel/enso-map-panel";
import { StationList } from "@/components/snotel/station-list";
import { RegionalDetails, REGION_DETAILS_ID } from "@/components/snotel/regional-details";
import { StationHistoryModal } from "@/components/snotel/station-history-modal";
import { GlossaryPanel, Term } from "@/components/snotel/glossary";
import { AboutData } from "@/components/snotel/about-data";

function matchesSearch(st: SnotelStation, q: string) {
  return (
    !q ||
    st.name.toLowerCase().includes(q) ||
    st.state.toLowerCase().includes(q) ||
    st.triplet.toLowerCase().includes(q) ||
    st.county.toLowerCase().includes(q)
  );
}

export function SnotelDashboard() {
  const { data, failed } = useSnotelData();
  const [phase, setPhase] = useState<EnsoPhase>("el_nino");
  const [customRange, setCustomRange] = useState<YearRange | null>(null);
  const [elevBand, setElevBand] = useState("ALL");
  const [selectedRegion, setSelectedRegion] = useState("ALL");
  const [showSites, setShowSites] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [elevOffsetFt, setElevOffsetFt] = useState(0);
  const [activeStation, setActiveStation] = useState<SnotelStation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const firstYear = data?.core.earliestWaterYear ?? 1930;
  const lastYear = data?.core.latestWaterYear ?? 2026;
  const range = useMemo(
    () => customRange ?? { start: firstYear, end: lastYear },
    [customRange, firstYear, lastYear]
  );
  const analysis = useRangeAnalysis(data, range.start, range.end, elevBand, selectedRegion);

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

  if (!data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-300 gap-3">
        {failed ? (
          <p className="text-sm">Could not load the SNOTEL data files. Try reloading the page.</p>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
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
  const focusRegion = (regionId: string) => {
    setSelectedRegion(regionId);
    requestAnimationFrame(() =>
      document.getElementById(REGION_DETAILS_ID)?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-16 space-y-5">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Western US Snowpack in El Niño, La Niña &amp; Neutral Winters
          </h1>
          <span className="inline-flex items-center rounded-full bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 text-xs font-medium text-sky-300 font-mono">
            {core.totalStations} SNOTEL Sites · WY {firstYear}–{lastYear}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
          Historical snowpack analysis across {core.totalStations} USDA NRCS <Term k="snotel">SNOTEL</Term> mountain
          stations ({lastYear - firstYear + 1} <Term k="waterYear">water years</Term>). Select an{" "}
          <Term k="enso">ENSO</Term> phase, year window, or elevation band below — every map, ranking, and chart updates
          instantly.
        </p>
      </div>

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
        showSites={showSites}
        onShowSitesChange={setShowSites}
        activeStation={modalOpen ? activeStation : null}
        onOpenStation={openStation}
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
      <AboutData source={core.source} totalStations={core.totalStations} />

      <StationHistoryModal
        station={activeStation}
        open={modalOpen}
        onOpenChange={setModalOpen}
        regions={core.regions}
        ensoByWaterYear={core.ensoByWaterYear}
        stationHistoryRows={activeStation ? data.histories.histories[activeStation.triplet] || null : null}
      />
    </div>
  );
}
