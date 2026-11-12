"use client";

import React from "react";
import { AlertTriangle, CalendarRange, CloudSnow, History, MapPin } from "lucide-react";
import { ENSO_PHASES, PhaseRecord, YearRange } from "@/types/snotel-range";
import { StationData } from "@/types/japan-enso";
import { Disclosure } from "@/components/snotel/disclosure";
import { GlossaryTerm } from "@/components/snotel/glossary";
import { MonthlySnowfallChart, WinterHistoryChart } from "@/components/japan/japan-charts";
import { JapanPhaseSignal, JapanRegionSummary } from "@/lib/japan/analysis";
import { JAPAN_GLOSSARY } from "@/lib/japan/glossary";
import { JAPAN_REGIONS, JAPAN_REGION_BY_ID, TO_JMA_PHASE } from "@/lib/japan/regions";
import { formatPct } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL, PHASE_STYLE, winterSpan } from "@/lib/snotel/year-range";

export const JAPAN_REGION_DETAILS_ID = "japan-region-details";

const CARD = "rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 space-y-1.5";
const CARD_LABEL = "text-[11px] font-semibold uppercase tracking-wider text-slate-400";
const fmt = (v: number | null | undefined, digits = 1) => (v === null || v === undefined ? "–" : v.toFixed(digits));

interface JapanRegionDetailsProps {
  summaries: Record<string, JapanRegionSummary>;
  stations: StationData[];
  nameJa: Record<string, string>;
  range: YearRange;
  selectedRegion: string;
  onSelectRegion: (regionId: string) => void;
}

export function JapanRegionDetails(props: JapanRegionDetailsProps) {
  const { selectedRegion } = props;
  const info = JAPAN_REGION_BY_ID[selectedRegion];
  const summary = props.summaries[selectedRegion];
  if (!info || !summary) return null;
  const regionStations = props.stations.filter((s) => s.region_id === selectedRegion);

  return (
    <section id={JAPAN_REGION_DETAILS_ID} className="space-y-4 scroll-mt-20 pt-2">
      <div>
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
          Region Deep Dive: {info.name}{" "}
          <span className="text-sm font-normal text-slate-400">{props.nameJa[selectedRegion]}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {winterSpan(props.range)}. Includes {info.places}. Choose a region below or click one on the map.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {JAPAN_REGIONS.map((r) => {
          const active = selectedRegion === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => props.onSelectRegion(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                active
                  ? "bg-sky-500/20 text-sky-200 border-sky-500/50 shadow-xs"
                  : "bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {r.shortName}
            </button>
          );
        })}
      </div>

      <KpiCards summary={summary} />

      <div className="space-y-3">
        <Disclosure
          defaultOpen
          icon={<CalendarRange className="w-4 h-4 text-sky-400" />}
          title={`When the snow falls: ${info.shortName}`}
          summary="Average snowfall each month, Nov–Mar, by ENSO phase."
        >
          <MonthlySnowfallChart summary={summary} />
        </Disclosure>

        <Disclosure
          icon={<History className="w-4 h-4 text-indigo-400" />}
          title="Winter-by-winter history"
          summary="Each bar is one winter's snowfall as % of typical, colored by ENSO phase, with the Dec–Feb temperature line."
        >
          <WinterHistoryChart summary={summary} />
        </Disclosure>

        <Disclosure
          icon={<CloudSnow className="w-4 h-4 text-purple-400" />}
          title="Snow days and big storms"
          summary="How often it snows, and how big the biggest day gets, in each phase."
        >
          <StormTable phases={summary.phases} />
        </Disclosure>

        <Disclosure
          icon={<MapPin className="w-4 h-4 text-emerald-400" />}
          title={`Weather stations: ${info.shortName} (${regionStations.length})`}
          summary="The JMA stations averaged into this region, with their median winter in each phase."
        >
          <StationTable stations={regionStations} />
        </Disclosure>
      </div>
    </section>
  );
}

function KpiCards({ summary }: { summary: JapanRegionSummary }) {
  const en = summary.phases.el_nino;
  const ln = summary.phases.la_nina;
  const tempGap = en.tempDjfC !== null && ln.tempDjfC !== null ? en.tempDjfC - ln.tempDjfC : null;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className={CARD}>
        <div className={CARD_LABEL}>
          Typical <GlossaryTerm entry={JAPAN_GLOSSARY.seasonSnowfall}>Season Snowfall</GlossaryTerm>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-white">
          {summary.typicalCm !== null ? `${summary.typicalCm.toLocaleString()} cm` : "–"}
        </div>
        <div className="text-xs text-slate-400">
          Median winter · <span className="font-mono text-slate-300">{summary.stationCount}</span> stations
        </div>
      </div>

      <div className={CARD}>
        <div className={CARD_LABEL}>
          Snowfall (<GlossaryTerm entry={JAPAN_GLOSSARY.pctTypical}>% of Typical</GlossaryTerm>)
        </div>
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          {ENSO_PHASES.map((p) => (
            <div key={p} className="rounded-lg bg-slate-950/60 border border-slate-800/70 px-2 py-1">
              <div className={`text-[10px] font-semibold ${PHASE_STYLE[p].text}`}>{PHASE_LABEL[p]}</div>
              <div className="text-sm sm:text-base font-bold font-mono text-white flex items-center gap-1">
                {formatPct(summary.phases[p].pctOfTypical)}
                {summary.phases[p].lowConfidence && (
                  <AlertTriangle className="w-3 h-3 text-amber-400" aria-label="low confidence" />
                )}
              </div>
              <div className="text-[10px] font-mono text-slate-400">n={summary.phases[p].winters}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={CARD}>
        <div className={CARD_LABEL}>Winter Temp (Dec–Feb Mean)</div>
        <div className="text-2xl font-bold font-mono tracking-tight text-emerald-300">{fmt(summary.tempDjfC)}°C</div>
        <div className="text-xs text-slate-400">
          {tempGap === null
            ? "Not enough temperature data"
            : `El Niño runs ${Math.abs(tempGap).toFixed(1)}°C ${tempGap >= 0 ? "warmer" : "colder"} than La Niña`}
        </div>
      </div>

      <div className={CARD}>
        <div className={CARD_LABEL}>Big Snow Days (20 cm+)</div>
        <div className="text-2xl font-bold font-mono tracking-tight text-sky-300">
          {fmt(summary.bigSnowDays20cm)} <span className="text-sm font-sans font-medium text-slate-300">per winter</span>
        </div>
        <div className="text-xs text-slate-400">
          El Niño <span className="font-mono text-slate-200">{fmt(en.bigSnowDays20cm)}</span> · La Niña{" "}
          <span className="font-mono text-slate-200">{fmt(ln.bigSnowDays20cm)}</span> days
        </div>
      </div>
    </section>
  );
}

const TH = "px-2.5 py-2 text-right font-semibold";
const TD = "px-2.5 py-2 text-right font-mono";

function PhaseHeaders() {
  return (
    <>
      {ENSO_PHASES.map((p) => (
        <th key={p} className={`${TH} ${PHASE_STYLE[p].text}`}>
          {PHASE_LABEL[p]}
        </th>
      ))}
    </>
  );
}

function StormTable({ phases }: { phases: PhaseRecord<JapanPhaseSignal> }) {
  const rows: { label: string; value: (s: JapanPhaseSignal) => string }[] = [
    { label: "Snow days (3 cm+ of new snow)", value: (s) => `${fmt(s.snowDays3cm)} days` },
    { label: "Big snow days (20 cm+)", value: (s) => `${fmt(s.bigSnowDays20cm)} days` },
    { label: "Biggest single day (typical winter)", value: (s) => `${fmt(s.biggestDayCm, 0)} cm` },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800 text-slate-300">
            <th className="px-2.5 py-2 text-left font-semibold">Per winter, averaged over the region&apos;s stations</th>
            <PhaseHeaders />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-slate-800/60 last:border-0">
              <td className="px-2.5 py-2 text-slate-300">{row.label}</td>
              {ENSO_PHASES.map((p) => (
                <td key={p} className={`${TD} text-slate-100`}>
                  {row.value(phases[p])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StationTable({ stations }: { stations: StationData[] }) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-300">
              <th className="px-2.5 py-2 text-left font-semibold">Station</th>
              <th className={TH}>Elevation</th>
              <th className={TH}>1991–2020 avg</th>
              <PhaseHeaders />
            </tr>
          </thead>
          <tbody>
            {stations.map((s) => (
              <tr key={s.station_id} className="border-b border-slate-800/60 last:border-0">
                <td className="px-2.5 py-2 text-slate-100 font-medium">
                  {s.name_en} <span className="text-slate-400 font-normal">{s.name_ja}</span>
                </td>
                <td className={`${TD} text-slate-400`}>{Math.round(s.elevation_m).toLocaleString()} m</td>
                <td className={`${TD} text-slate-200`}>{Math.round(s.normals_1991_2020.snow_1991_2020_cm).toLocaleString()} cm</td>
                {ENSO_PHASES.map((p) => (
                  <td key={p} className={`${TD} text-slate-100`}>
                    {Math.round(s.phases[TO_JMA_PHASE[p]].snowfall_cm.median).toLocaleString()} cm
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500">
        Phase columns are the median season snowfall across all winters since 1953–54; they do not change with the year
        range.
      </p>
    </div>
  );
}
