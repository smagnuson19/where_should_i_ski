"use client";

import React, { useMemo, useState } from "react";
import { Database, Sparkles } from "lucide-react";
import rawData from "@/data/jma-enso-snowfall-data.json";
import { JmaEnsoDataset } from "@/types/japan-enso";
import { EnsoPhase } from "@/types/snotel";
import { ENSO_PHASES, PhaseRecord, YearRange } from "@/types/snotel-range";
import { JapanMapPanel } from "@/components/japan/japan-map-panel";
import { JapanRegionDetails, JAPAN_REGION_DETAILS_ID } from "@/components/japan/japan-region-details";
import { PhaseToggle } from "@/components/snotel/phase-toggle";
import { YearRangeFilter } from "@/components/snotel/year-range-filter";
import { PhaseCards, ThinPhasesNote } from "@/components/snotel/plain-summary";
import { GlossaryPanel, GlossaryTerm } from "@/components/snotel/glossary";
import { Disclosure } from "@/components/snotel/disclosure";
import { analyzeJapan, rankJapanRegions } from "@/lib/japan/analysis";
import { JAPAN_GLOSSARY } from "@/lib/japan/glossary";
import { RankedRegion } from "@/lib/snotel/story";
import { formatPct } from "@/lib/snotel/enso-scale";
import { winterSpan } from "@/lib/snotel/year-range";

const dataset = rawData as unknown as JmaEnsoDataset;
const FIRST_YEAR = dataset.historical_winters[0].winter_end_year;
const LAST_YEAR = dataset.historical_winters[dataset.historical_winters.length - 1].winter_end_year;
const NAME_JA = Object.fromEntries(dataset.regions.map((r) => [r.region_id, r.name_ja]));

export function JapanDashboard() {
  const [phase, setPhase] = useState<EnsoPhase>("el_nino");
  const [customRange, setCustomRange] = useState<YearRange | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("hokkaido_soj");
  const [showStations, setShowStations] = useState(true);

  const range = useMemo(() => customRange ?? { start: FIRST_YEAR, end: LAST_YEAR }, [customRange]);
  const analysis = useMemo(() => analyzeJapan(dataset, range), [range]);
  const rankedByPhase = useMemo(
    () =>
      Object.fromEntries(ENSO_PHASES.map((p) => [p, rankJapanRegions(analysis.summaries, p)])) as PhaseRecord<
        RankedRegion[]
      >,
    [analysis]
  );

  const focusRegion = (regionId: string) => {
    setSelectedRegion(regionId);
    requestAnimationFrame(() =>
      document.getElementById(JAPAN_REGION_DETAILS_ID)?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  const national = analysis.nationalPct;
  const nationalValues = ENSO_PHASES.map((p) => national[p]).filter((v): v is number => v !== null);
  const nationalFlat = nationalValues.length > 0 && Math.max(...nationalValues) - Math.min(...nationalValues) <= 6;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-16 space-y-5">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Japan Snowfall in El Niño, La Niña &amp; Neutral Winters
          </h1>
          <span className="inline-flex items-center rounded-full bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 text-xs font-medium text-sky-300 font-mono">
            {dataset.stations.length} JMA Stations · Winters {FIRST_YEAR}–{LAST_YEAR}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
          Season snowfall at {dataset.stations.length} <GlossaryTerm entry={JAPAN_GLOSSARY.jma}>JMA</GlossaryTerm>{" "}
          weather stations, grouped into eight climate regions, over {LAST_YEAR - FIRST_YEAR + 1} winters. Pick an{" "}
          <GlossaryTerm entry={JAPAN_GLOSSARY.enso}>ENSO</GlossaryTerm> phase or year window below — the map, ranking
          and charts all update.
        </p>
      </div>

      <section className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-950/35 via-slate-900/80 to-slate-900/60 p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            At a Glance: How ENSO Splits Japan
          </h2>
          <span className="text-xs font-mono text-slate-400 bg-slate-950/60 border border-slate-800/80 px-2.5 py-0.5 rounded-full">
            {analysis.phaseCounts.total} winters · {winterSpan(range)}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
          Across all eight regions, median season snowfall is{" "}
          <strong className="font-mono font-semibold text-orange-300">{formatPct(national.el_nino)}</strong> of typical in
          El Niño, <strong className="font-mono font-semibold text-sky-300">{formatPct(national.la_nina)}</strong> in La
          Niña, and <strong className="font-mono font-semibold text-slate-100">{formatPct(national.neutral)}</strong> in
          Neutral winters (<GlossaryTerm entry={JAPAN_GLOSSARY.pctTypical} />).{" "}
          {nationalFlat
            ? "Japan as a whole barely changes, so the story is where the snow shifts:"
            : "Here is where the snow shifts:"}
        </p>
        <PhaseCards rankedByPhase={rankedByPhase} phaseCounts={analysis.phaseCounts} />
        <ThinPhasesNote phaseCounts={analysis.phaseCounts} />
      </section>

      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:divide-x lg:divide-slate-800/80">
        <div className="lg:col-span-4 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Show <GlossaryTerm entry={JAPAN_GLOSSARY.enso}>ENSO</GlossaryTerm> Phase
          </div>
          <PhaseToggle phase={phase} onPhaseChange={setPhase} />
        </div>
        <div className="lg:col-span-8 lg:pl-5 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Winters Included (by the year they end)
          </div>
          <YearRangeFilter
            range={range}
            onRangeChange={setCustomRange}
            firstYear={FIRST_YEAR}
            lastYear={LAST_YEAR}
            phaseCounts={analysis.phaseCounts}
          />
        </div>
      </section>

      <JapanMapPanel
        summaries={analysis.summaries}
        stations={dataset.stations}
        phase={phase}
        selectedRegion={selectedRegion}
        onSelectRegion={focusRegion}
        showStations={showStations}
        onShowStationsChange={setShowStations}
      />

      <JapanRegionDetails
        summaries={analysis.summaries}
        stations={dataset.stations}
        nameJa={NAME_JA}
        range={range}
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
      />

      <GlossaryPanel
        entries={Object.values(JAPAN_GLOSSARY)}
        summary="What ENSO, % of typical, the Sea of Japan side and the other terms on this page mean"
      />
      <JapanAboutData />
    </div>
  );
}

function JapanAboutData() {
  return (
    <Disclosure
      title="About the data and method"
      summary="Where the numbers come from and how they are computed"
      icon={<Database className="w-4 h-4 text-slate-400" />}
    >
      <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400 leading-relaxed">
        <li>
          Sources: Japan Meteorological Agency (JMA) historical station records for daily snowfall and temperature, JMA&apos;s
          ENSO event list, and JMA forecast-area boundaries for the map. {dataset.metadata.analysis_period}.
        </li>
        <li>
          Each region&apos;s winter value is the average season snowfall of its stations. That winter is compared with the
          region&apos;s median winter over the selected years, and a phase&apos;s value is the median over that phase&apos;s
          winters, the same method the US view uses for snowpack.
        </li>
        <li>
          Winters are classified with JMA&apos;s NINO.3 index (see ENSO in the glossary). Phases with fewer than 5 winters in
          the selected years are flagged as low confidence.
        </li>
        <li>
          Most stations sit in towns at low elevation, so ski areas higher up usually get far more snow than the
          centimeter figures. Use the percentages as the guide to how a winter compares with typical.
        </li>
        <li>
          The map shades the JMA forecast areas each region covers, splitting prefectures where JMA does (for example
          Aomori, Fukushima, Gifu, Kyoto and Hyogo). Distant island groups are left off to keep the main islands in view.
          Station tables and hover cards use all winters since 1953–54.
        </li>
      </ul>
    </Disclosure>
  );
}
