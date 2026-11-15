"use client";

import React from "react";
import { AlertTriangle, CalendarRange, CloudSnow, History, MapPin, Mountain } from "lucide-react";
import { TrailMark } from "@/components/trail/trail-mark";
import { EnsoPhase } from "@/types/snotel";
import { ENSO_PHASES, PhaseRecord, YearRange } from "@/types/snotel-range";
import { StationData } from "@/types/japan-enso";
import { ResortSnowfallStats, SkiResort } from "@/types/resorts";
import { Disclosure } from "@/components/snotel/disclosure";
import { GlossaryTerm } from "@/components/snotel/glossary";
import { MonthlySnowfallChart, WinterHistoryChart } from "@/components/japan/japan-charts";
import { JapanPhaseSignal, JapanRegionSummary } from "@/lib/japan/analysis";
import { JAPAN_GLOSSARY } from "@/lib/japan/glossary";
import { JAPAN_REGIONS, JAPAN_REGION_BY_ID, TO_JMA_PHASE } from "@/lib/japan/regions";
import { formatPct, pctColor } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL, PHASE_STYLE, winterSpan } from "@/lib/snotel/year-range";

export const JAPAN_REGION_DETAILS_ID = "japan-region-details";

const CARD = "rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-1.5";
const CARD_LABEL = "text-[11px] font-semibold uppercase tracking-wider text-slate-600";
const fmt = (v: number | null | undefined, digits = 1) => (v === null || v === undefined ? "–" : v.toFixed(digits));

interface JapanRegionDetailsProps {
  summaries: Record<string, JapanRegionSummary>;
  stations: StationData[];
  nameJa: Record<string, string>;
  range: YearRange;
  selectedRegion: string;
  onSelectRegion: (regionId: string) => void;
  resorts?: SkiResort[];
  resortStats?: Map<string, ResortSnowfallStats>;
  phase?: EnsoPhase;
  onOpenResort?: (resort: SkiResort) => void;
}

export function JapanRegionDetails(props: JapanRegionDetailsProps) {
  const { selectedRegion } = props;
  const info = JAPAN_REGION_BY_ID[selectedRegion];
  const summary = props.summaries[selectedRegion];
  if (!info || !summary) return null;
  const regionStations = props.stations.filter((s) => s.region_id === selectedRegion);
  const phase = props.phase ?? "el_nino";
  const topResorts = [...(props.resorts ?? [])]
    .filter((r) => r.match !== "none")
    .sort(
      (a, b) =>
        (props.resortStats?.get(b.id)?.phases[phase].pctOfTypical ?? -1) -
        (props.resortStats?.get(a.id)?.phases[phase].pctOfTypical ?? -1)
    )
    .slice(0, 8);

  return (
    <section id={JAPAN_REGION_DETAILS_ID} className="space-y-4 scroll-mt-20 pt-2">
      <div>
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-950">
          <TrailMark level="advanced" className="mr-2.5 align-middle" />
          Region Deep Dive: {info.name}{" "}
          <span className="text-sm font-normal text-slate-600">{props.nameJa[selectedRegion]}</span>
        </h2>
        <p className="text-xs text-slate-600 mt-0.5">
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
                  ? "bg-pine-500/20 text-pine-800 border-pine-500/50 shadow-xs"
                  : "bg-slate-50/80 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-950"
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
          icon={<CalendarRange className="w-4 h-4 text-pine-600" />}
          title={`When the snow falls: ${info.shortName}`}
          summary="Average snowfall each month, Nov–Mar, by ENSO phase."
        >
          <MonthlySnowfallChart summary={summary} />
        </Disclosure>

        <Disclosure
          icon={<History className="w-4 h-4 text-indigo-600" />}
          title="Winter-by-winter history"
          summary="Each bar is one winter's snowfall as % of typical, colored by ENSO phase, with the Dec–Feb temperature line."
        >
          <WinterHistoryChart summary={summary} />
        </Disclosure>

        <Disclosure
          icon={<CloudSnow className="w-4 h-4 text-purple-600" />}
          title="Snow days and big storms"
          summary="How often it snows, and how big the biggest day gets, in each phase."
        >
          <StormTable phases={summary.phases} />
        </Disclosure>

        {topResorts.length > 0 && (
          <Disclosure
            icon={<Mountain className="w-4 h-4 text-pine-600" />}
            title={`Ski resorts: ${info.shortName} (${props.resorts?.length ?? 0})`}
            summary={`Top resorts by season snowfall in ${PHASE_LABEL[phase]} winters vs. typical.`}
            defaultOpen
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {topResorts.map((r) => {
                const s = props.resortStats?.get(r.id);
                const pct = s?.phases[phase].pctOfTypical ?? null;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => props.onOpenResort?.(r)}
                    className="text-left rounded-lg border border-slate-200/90 bg-slate-100/70 hover:bg-slate-200/80 hover:border-pine-500/50 p-2.5 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-slate-950 truncate">
                        {r.name}
                        {r.nameJa ? <span className="font-normal text-slate-600"> · {r.nameJa}</span> : null}
                      </span>
                      <span className="text-xs font-mono font-semibold flex items-center gap-1.5 text-slate-950">
                        <span className="w-2 h-2 rotate-45" style={{ backgroundColor: pctColor(pct) }} />
                        {formatPct(pct)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {r.verticalM.toLocaleString()} m vert
                      {s?.typicalSnow != null ? ` · typical ${s.typicalSnow} cm` : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </Disclosure>
        )}

        <Disclosure
          icon={<MapPin className="w-4 h-4 text-emerald-600" />}
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
        <div className="text-2xl font-bold font-mono tracking-tight text-slate-950">
          {summary.typicalCm !== null ? `${summary.typicalCm.toLocaleString()} cm` : "–"}
        </div>
        <div className="text-xs text-slate-600">
          Median winter · <span className="font-mono text-slate-700">{summary.stationCount}</span> stations
        </div>
      </div>

      <div className={CARD}>
        <div className={CARD_LABEL}>
          Snowfall (<GlossaryTerm entry={JAPAN_GLOSSARY.pctTypical}>% of Typical</GlossaryTerm>)
        </div>
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          {ENSO_PHASES.map((p) => (
            <div key={p} className="rounded-lg bg-slate-100/60 border border-slate-200/70 px-2 py-1">
              <div className={`text-[10px] font-semibold ${PHASE_STYLE[p].text}`}>{PHASE_LABEL[p]}</div>
              <div className="text-sm sm:text-base font-bold font-mono text-slate-950 flex items-center gap-1">
                {formatPct(summary.phases[p].pctOfTypical)}
                {summary.phases[p].lowConfidence && (
                  <AlertTriangle className="w-3 h-3 text-amber-600" aria-label="low confidence" />
                )}
              </div>
              <div className="text-[10px] font-mono text-slate-600">n={summary.phases[p].winters}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={CARD}>
        <div className={CARD_LABEL}>Winter Temp (Dec–Feb Mean)</div>
        <div className="text-2xl font-bold font-mono tracking-tight text-emerald-700">{fmt(summary.tempDjfC)}°C</div>
        <div className="text-xs text-slate-600">
          {tempGap === null
            ? "Not enough temperature data"
            : `El Niño runs ${Math.abs(tempGap).toFixed(1)}°C ${tempGap >= 0 ? "warmer" : "colder"} than La Niña`}
        </div>
      </div>

      <div className={CARD}>
        <div className={CARD_LABEL}>Big Snow Days (20 cm+)</div>
        <div className="text-2xl font-bold font-mono tracking-tight text-sky-700">
          {fmt(summary.bigSnowDays20cm)} <span className="text-sm font-sans font-medium text-slate-700">per winter</span>
        </div>
        <div className="text-xs text-slate-600">
          El Niño <span className="font-mono text-slate-800">{fmt(en.bigSnowDays20cm)}</span> · La Niña{" "}
          <span className="font-mono text-slate-800">{fmt(ln.bigSnowDays20cm)}</span> days
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
          <tr className="border-b border-slate-200 text-slate-700">
            <th className="px-2.5 py-2 text-left font-semibold">Per winter, averaged over the region&apos;s stations</th>
            <PhaseHeaders />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-slate-200/60 last:border-0">
              <td className="px-2.5 py-2 text-slate-700">{row.label}</td>
              {ENSO_PHASES.map((p) => (
                <td key={p} className={`${TD} text-slate-900`}>
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
            <tr className="border-b border-slate-200 text-slate-700">
              <th className="px-2.5 py-2 text-left font-semibold">Station</th>
              <th className={TH}>Elevation</th>
              <th className={TH}>1991–2020 avg</th>
              <PhaseHeaders />
            </tr>
          </thead>
          <tbody>
            {stations.map((s) => (
              <tr key={s.station_id} className="border-b border-slate-200/60 last:border-0">
                <td className="px-2.5 py-2 text-slate-900 font-medium">
                  {s.name_en} <span className="text-slate-600 font-normal">{s.name_ja}</span>
                </td>
                <td className={`${TD} text-slate-600`}>{Math.round(s.elevation_m).toLocaleString()} m</td>
                <td className={`${TD} text-slate-800`}>{Math.round(s.normals_1991_2020.snow_1991_2020_cm).toLocaleString()} cm</td>
                {ENSO_PHASES.map((p) => (
                  <td key={p} className={`${TD} text-slate-900`}>
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
