"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EnsoWaterYear,
  RegionInfo,
  SnotelStation,
} from "@/types/snotel";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calendar,
  CloudSnow,
  Loader2,
  MapPin,
  Mountain,
  ThermometerSnowflake,
  TrendingUp,
} from "lucide-react";

interface StationHistoryModalProps {
  station: SnotelStation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regions: Record<string, RegionInfo>;
  ensoByWaterYear: Record<string, EnsoWaterYear>;
  stationHistoryRows: (number | null)[][] | null;
}

const WY_MONTH_ORDER = [
  { m: "10", label: "Oct" },
  { m: "11", label: "Nov" },
  { m: "12", label: "Dec" },
  { m: "1", label: "Jan" },
  { m: "2", label: "Feb" },
  { m: "3", label: "Mar" },
  { m: "4", label: "Apr" },
  { m: "5", label: "May" },
  { m: "6", label: "Jun" },
  { m: "7", label: "Jul" },
  { m: "8", label: "Aug" },
  { m: "9", label: "Sep" },
];

interface DailyTraceDay {
  date: string;
  swe: number | null;
  snwd: number | null;
  tavg: number | null;
  tmax: number | null;
  tmin: number | null;
  prec: number | null;
  snowfall24h: number;
  sweGain24h: number;
}

interface DailyTraceResponse {
  triplet: string;
  waterYear: number;
  days: DailyTraceDay[];
  summary: {
    events2in: number;
    events6in: number;
    events12in: number;
    max24hSnow: number;
    max24hSwe: number;
    totalDailySnowIn: number;
    subfreezingDays: number;
  } | null;
}

export function StationHistoryModal({
  station,
  open,
  onOpenChange,
  regions,
  ensoByWaterYear,
  stationHistoryRows,
}: StationHistoryModalProps) {
  const [targetElev, setTargetElev] = useState<number>(8000);
  const [lapseRateTemp, setLapseRateTemp] = useState<number>(3.5); // °F per 1000 ft
  const [orographicSwePct, setOrographicSwePct] = useState<number>(8); // % SWE per 1000 ft
  const [selectedDailyWy, setSelectedDailyWy] = useState<string>("2023");
  const [dailyTrace, setDailyTrace] = useState<DailyTraceResponse | null>(null);
  const [dailyLoading, setDailyLoading] = useState<boolean>(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  useEffect(() => {
    if (station) {
      setTargetElev(station.elevation);
      const defaultWy = station.latestYear >= 2023 ? "2023" : String(station.latestYear);
      setSelectedDailyWy(defaultWy);
    }
  }, [station]);

  useEffect(() => {
    if (!open || !station || !selectedDailyWy) return;
    let cancelled = false;
    setDailyLoading(true);
    setDailyError(null);

    fetch(
      `/api/snotel-daily?triplet=${encodeURIComponent(
        station.triplet
      )}&waterYear=${encodeURIComponent(selectedDailyWy)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setDailyError(data.error);
          setDailyTrace(null);
        } else {
          setDailyTrace(data);
        }
      })
      .catch((e) => {
        if (!cancelled) setDailyError(e.message || "Failed to load daily trace");
      })
      .finally(() => {
        if (!cancelled) setDailyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, station, selectedDailyWy]);

  const elevDeltaThousands = station ? (targetElev - station.elevation) / 1000 : 0;
  const tempAdjustmentF = -elevDeltaThousands * lapseRateTemp;
  const sweMultiplier = Math.max(0.25, 1 + (elevDeltaThousands * orographicSwePct) / 100);

  const seasonalChartData = useMemo(() => {
    if (!station) return [];
    return WY_MONTH_ORDER.map(({ m, label }) => {
      const pt = station.monthlyCurves[m] || {};
      const adjSwe = (val: number | null | undefined) =>
        val !== null && val !== undefined ? Number((val * sweMultiplier).toFixed(1)) : null;
      const adjTemp = (val: number | null | undefined) =>
        val !== null && val !== undefined ? Number((val + tempAdjustmentF).toFixed(1)) : null;

      return {
        monthLabel: label,
        sweMedian: adjSwe(pt.sweMedian),
        sweElNino: adjSwe(pt.sweElNino),
        sweLaNina: adjSwe(pt.sweLaNina),
        sweNeutral: adjSwe(pt.sweNeutral),
        snwdMedian: adjSwe(pt.snwdMedian),
        snwdElNino: adjSwe(pt.snwdElNino),
        snwdLaNina: adjSwe(pt.snwdLaNina),
        tavgMedian: adjTemp(pt.tavgMedian),
        tavgElNino: adjTemp(pt.tavgElNino),
        tavgLaNina: adjTemp(pt.tavgLaNina),
      };
    });
  }, [station, sweMultiplier, tempAdjustmentF]);

  const parsedHistory = useMemo(() => {
    if (!stationHistoryRows || !station) return [];
    // Columns: [wy, peakSwe, aprSwe, peakSnwd, winterTavg, winterTmin, cumSnwdGain, majorPulseMonths, pctMedian]
    return stationHistoryRows.map((r) => {
      const wy = Number(r[0]);
      const enso = ensoByWaterYear[String(wy)];
      const rawPeakSwe = r[1] !== null ? Number(r[1]) : null;
      const rawPeakSnwd = r[3] !== null ? Number(r[3]) : null;
      const rawWinterTavg = r[4] !== null ? Number(r[4]) : null;
      const rawCumSnwd = r[6] !== null ? Number(r[6]) : null;

      return {
        wy,
        phase: enso?.phase || "neutral",
        oni: enso?.oniWinterMean ?? 0,
        strength: enso?.strength || "neutral",
        peakSwe: rawPeakSwe !== null ? Number((rawPeakSwe * sweMultiplier).toFixed(1)) : null,
        elNinoSwe:
          enso?.phase === "el_nino" && rawPeakSwe !== null
            ? Number((rawPeakSwe * sweMultiplier).toFixed(1))
            : null,
        laNinaSwe:
          enso?.phase === "la_nina" && rawPeakSwe !== null
            ? Number((rawPeakSwe * sweMultiplier).toFixed(1))
            : null,
        neutralSwe:
          enso?.phase === "neutral" && rawPeakSwe !== null
            ? Number((rawPeakSwe * sweMultiplier).toFixed(1))
            : null,
        peakSnwd: rawPeakSnwd !== null ? Number((rawPeakSnwd * sweMultiplier).toFixed(1)) : null,
        winterTavg:
          rawWinterTavg !== null ? Number((rawWinterTavg + tempAdjustmentF).toFixed(1)) : null,
        cumSnwdGain: rawCumSnwd !== null ? Number((rawCumSnwd * sweMultiplier).toFixed(1)) : null,
        majorPulseMonths: r[7] !== null ? Number(r[7]) : 0,
        pctMedian: r[8] !== null ? Number(r[8]) : null,
      };
    });
  }, [stationHistoryRows, station, ensoByWaterYear, sweMultiplier, tempAdjustmentF]);

  if (!station) return null;

  const regInfo = regions[station.region];
  const availableWys = parsedHistory
    .filter((h) => h.wy >= 1980)
    .map((h) => h.wy)
    .sort((a, b) => b - a);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-sky-400" />
                <span>{station.name}</span>
                <Badge variant="outline" className="border-slate-700 text-slate-300 font-mono">
                  {station.triplet}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">
                {regInfo?.name || station.region} • {station.county} County, {station.state} •{" "}
                Lat {station.lat}°, Lon {station.lon}° • Record:{" "}
                <strong className="text-slate-200">
                  {station.earliestYear}–{station.latestYear} ({station.yearsCount} Water Years)
                </strong>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-1">
                <Mountain className="w-3.5 h-3.5 mr-1" />
                Gauge Elev: {station.elevation.toLocaleString()} ft
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Interactive Elevation & Lapse-Rate Adjuster for this SNOTEL site */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 mt-1">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Mountain className="w-4 h-4" />
              <span>Site Elevation & Orographic Lapse-Rate Adjuster</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Simulated Target Elevation:</span>
              <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                {targetElev.toLocaleString()} ft (
                {elevDeltaThousands >= 0 ? "+" : ""}
                {Math.round(elevDeltaThousands * 1000).toLocaleString()} ft vs gauge)
              </span>
              {targetElev !== station.elevation && (
                <button
                  onClick={() => setTargetElev(station.elevation)}
                  className="text-sky-400 hover:underline text-[11px]"
                >
                  Reset to {station.elevation.toLocaleString()} ft
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1.5">
                <span>Target Elevation (3,000 – 12,500 ft)</span>
                <span className="font-mono text-sky-300">{targetElev.toLocaleString()} ft</span>
              </div>
              <Slider
                value={[targetElev]}
                min={3000}
                max={12500}
                step={100}
                onValueChange={(v) => setTargetElev(Array.isArray(v) ? v[0] : v)}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1.5">
                <span>Temp Lapse Rate (°F / 1,000 ft)</span>
                <span className="font-mono text-amber-300">
                  -{lapseRateTemp.toFixed(1)}°F/kft ({tempAdjustmentF >= 0 ? "+" : ""}
                  {tempAdjustmentF.toFixed(1)}°F)
                </span>
              </div>
              <Slider
                value={[lapseRateTemp]}
                min={2.0}
                max={5.5}
                step={0.1}
                onValueChange={(v) => setLapseRateTemp(Array.isArray(v) ? v[0] : v)}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1.5">
                <span>Orographic SWE Gradient (% / 1,000 ft)</span>
                <span className="font-mono text-emerald-300">
                  +{orographicSwePct}%/kft (×{sweMultiplier.toFixed(2)})
                </span>
              </div>
              <Slider
                value={[orographicSwePct]}
                min={0}
                max={18}
                step={1}
                onValueChange={(v) => setOrographicSwePct(Array.isArray(v) ? v[0] : v)}
              />
            </div>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="text-[11px] text-slate-400">Historical Median Peak SWE</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {(station.medianPeakSwe * sweMultiplier).toFixed(1)} in
            </div>
            <div className="text-[11px] text-slate-400">
              Peak Depth:{" "}
              {station.medianPeakSnwd
                ? `${(station.medianPeakSnwd * sweMultiplier).toFixed(0)} in`
                : "N/A"}
            </div>
          </div>

          <div className="rounded-lg border border-orange-500/30 bg-orange-950/20 p-3">
            <div className="text-[11px] text-orange-300">El Niño Median Peak SWE</div>
            <div className="text-lg font-bold text-orange-400 mt-0.5">
              {(station.elNinoPeakSwe * sweMultiplier).toFixed(1)} in
            </div>
            <div className="text-[11px] text-orange-300/80">
              {station.elNinoPctMedian}% of All-Year Median
            </div>
          </div>

          <div className="rounded-lg border border-sky-500/30 bg-sky-950/20 p-3">
            <div className="text-[11px] text-sky-300">La Niña Median Peak SWE</div>
            <div className="text-lg font-bold text-sky-400 mt-0.5">
              {(station.laNinaPeakSwe * sweMultiplier).toFixed(1)} in
            </div>
            <div className="text-[11px] text-sky-300/80">
              {station.laNinaPctMedian}% of All-Year Median
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="text-[11px] text-slate-400">Nov–Mar Mean Winter Temp</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {station.winterTavg !== null
                ? `${(station.winterTavg + tempAdjustmentF).toFixed(1)}°F`
                : "N/A"}
            </div>
            <div className="text-[11px] text-slate-400">
              EN:{" "}
              {station.elNinoWinterTavg !== null
                ? `${(station.elNinoWinterTavg + tempAdjustmentF).toFixed(1)}°F`
                : "–"}{" "}
              | LN:{" "}
              {station.laNinaWinterTavg !== null
                ? `${(station.laNinaWinterTavg + tempAdjustmentF).toFixed(1)}°F`
                : "–"}
            </div>
          </div>
        </div>

        {/* Detailed Historical Tabs */}
        <Tabs defaultValue="seasonal" className="w-full mt-1">
          <TabsList className="bg-slate-900 border border-slate-800 w-full justify-start flex-wrap h-auto p-1">
            <TabsTrigger value="seasonal" className="text-xs">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Seasonal ENSO Curves (Oct–Sep)
            </TabsTrigger>
            <TabsTrigger value="por" className="text-xs">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Full Period-of-Record ({station.earliestYear}–{station.latestYear})
            </TabsTrigger>
            <TabsTrigger value="daily" className="text-xs">
              <CloudSnow className="w-3.5 h-3.5 mr-1.5" />
              Live Daily Snowfall Events & Temp Trace
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Seasonal Water-Year Curve */}
          <TabsContent value="seasonal" className="space-y-4 mt-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <h4 className="text-xs font-semibold text-slate-200 mb-1">
                  Snow Water Equivalent (SWE, inches) — El Niño vs. La Niña vs. Historical Median
                </h4>
                <p className="text-[11px] text-slate-400 mb-3">
                  Monthly water-year snowpack accumulation and melt trajectory adjusted to{" "}
                  {targetElev.toLocaleString()} ft.
                </p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={seasonalChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} unit='"' />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Line
                        type="monotone"
                        dataKey="sweMedian"
                        name="Historical Median"
                        stroke="#e2e8f0"
                        strokeWidth={2.5}
                        strokeDasharray="5 3"
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sweElNino"
                        name="El Niño Median"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sweLaNina"
                        name="La Niña Median"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sweNeutral"
                        name="ENSO Neutral"
                        stroke="#a855f7"
                        strokeWidth={1.8}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <h4 className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                  <ThermometerSnowflake className="w-3.5 h-3.5 text-sky-400" />
                  <span>Monthly Mean Temperature (°F) & Freezing Threshold (32°F)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mb-3">
                  Shows how elevation lapse-rate shifts the sub-freezing accumulation window across ENSO phases.
                </p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={seasonalChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} unit="°F" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <ReferenceLine
                        y={32}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        label={{
                          value: "32°F Freezing",
                          fill: "#f87171",
                          fontSize: 10,
                          position: "insideTopRight",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="tavgMedian"
                        name="Historical Mean Temp"
                        stroke="#e2e8f0"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="tavgElNino"
                        name="El Niño Temp (°F)"
                        stroke="#f97316"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="tavgLaNina"
                        name="La Niña Temp (°F)"
                        stroke="#38bdf8"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Full Period-of-Record Water Years */}
          <TabsContent value="por" className="space-y-4 mt-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    Complete Historical Water-Year Peak SWE ({station.earliestYear}–{station.latestYear}) by ENSO Phase
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Every recorded water year colored by NOAA ONI classification (El Niño = Orange, La Niña = Cyan, Neutral = Purple) against the historical median line.
                  </p>
                </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={parsedHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="wy" stroke="#94a3b8" fontSize={11} />
                    <YAxis
                      yAxisId="left"
                      stroke="#94a3b8"
                      fontSize={11}
                      unit='"'
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#10b981"
                      fontSize={11}
                      unit="°F"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <ReferenceLine
                      yAxisId="left"
                      y={Number((station.medianPeakSwe * sweMultiplier).toFixed(1))}
                      stroke="#e2e8f0"
                      strokeDasharray="5 3"
                      label={{
                        value: "Site Median Peak SWE",
                        fill: "#e2e8f0",
                        fontSize: 10,
                        position: "insideTopLeft",
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="elNinoSwe"
                      name="El Niño WY Peak SWE"
                      stackId="swe"
                      fill="#f97316"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="laNinaSwe"
                      name="La Niña WY Peak SWE"
                      stackId="swe"
                      fill="#38bdf8"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="neutralSwe"
                      name="Neutral WY Peak SWE"
                      stackId="swe"
                      fill="#a855f7"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="winterTavg"
                      name="Nov–Mar Mean Temp (°F)"
                      stroke="#10b981"
                      strokeWidth={1.8}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Live On-Demand Daily Snowfall Events & Temperature Trace */}
          <TabsContent value="daily" className="space-y-4 mt-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    Daily Snowfall Impulses (24h ΔSnow Depth), SWE Accumulation & Daily Temperature
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Queries daily SNOTEL telemetry directly from USDA NRCS AWDB for any selected Water Year.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">Water Year:</span>
                  <Select
                    value={selectedDailyWy}
                    onValueChange={(v) => {
                      if (v) setSelectedDailyWy(v);
                    }}
                  >
                    <SelectTrigger className="w-44 h-8 bg-slate-950 border-slate-700 text-xs">
                      <SelectValue placeholder="Water Year" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-100 max-h-64">
                      {availableWys.map((wy) => {
                        const enso = ensoByWaterYear[String(wy)];
                        const phaseTag =
                          enso?.phase === "el_nino"
                            ? `El Niño (${enso.oniWinterMean > 0 ? "+" : ""}${enso.oniWinterMean})`
                            : enso?.phase === "la_nina"
                            ? `La Niña (${enso.oniWinterMean})`
                            : "Neutral";
                        return (
                          <SelectItem key={wy} value={String(wy)} className="text-xs">
                            WY {wy} — {phaseTag}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {dailyLoading && (
                <div className="h-64 flex items-center justify-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                  <span>Fetching daily SNOTEL storm telemetry for Water Year {selectedDailyWy}...</span>
                </div>
              )}

              {dailyError && !dailyLoading && (
                <div className="h-40 flex items-center justify-center text-red-400 text-xs">
                  {dailyError}
                </div>
              )}

              {!dailyLoading && dailyTrace && (
                <>
                  {dailyTrace.summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 text-center">
                      <div className="bg-slate-950/80 border border-slate-800 rounded p-2">
                        <div className="text-[10px] text-slate-400">Snow Events ≥ 2&quot;</div>
                        <div className="text-sm font-bold text-sky-300">
                          {dailyTrace.summary.events2in} days
                        </div>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded p-2">
                        <div className="text-[10px] text-slate-400">Major Storms ≥ 6&quot;</div>
                        <div className="text-sm font-bold text-indigo-300">
                          {dailyTrace.summary.events6in} days
                        </div>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded p-2">
                        <div className="text-[10px] text-slate-400">Powder Dump ≥ 12&quot;</div>
                        <div className="text-sm font-bold text-purple-300">
                          {dailyTrace.summary.events12in} days
                        </div>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded p-2">
                        <div className="text-[10px] text-slate-400">Max 24h Snowfall</div>
                        <div className="text-sm font-bold text-emerald-300">
                          {dailyTrace.summary.max24hSnow}&quot;
                        </div>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded p-2">
                        <div className="text-[10px] text-slate-400">Sub-Freezing Days</div>
                        <div className="text-sm font-bold text-amber-300">
                          {dailyTrace.summary.subfreezingDays} days
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={dailyTrace.days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickFormatter={(v) => v.slice(5)}
                          minTickGap={28}
                        />
                        <YAxis yAxisId="left" stroke="#38bdf8" fontSize={11} unit='"' />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#f59e0b"
                          fontSize={11}
                          unit="°F"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderColor: "#334155",
                            fontSize: "12px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="swe"
                          name="Daily SWE (in)"
                          fill="#0284c7"
                          fillOpacity={0.25}
                          stroke="#38bdf8"
                          strokeWidth={2}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="snowfall24h"
                          name="24h New Snowfall Event (in)"
                          fill="#c084fc"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="tavg"
                          name="Daily Mean Temp (°F)"
                          stroke="#f59e0b"
                          strokeWidth={1.2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
