"use client";

import React, { useState, useMemo } from "react";
import { HistoricalWinter, RegionData, StationData, EnsoPhase } from "@/types/enso";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  regions: RegionData[];
  stations: StationData[];
  historicalWinters: HistoricalWinter[];
  selectedRegionId: string;
}

export function StationAndHistoryView({ regions, stations, historicalWinters, selectedRegionId }: Props) {
  const [stationFilter, setStationFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [phaseFilter, setPhaseFilter] = useState<"ALL" | EnsoPhase>("ALL");

  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      if (stationFilter === "selected_region" && s.region_id !== selectedRegionId) return false;
      if (stationFilter === "El Niño" && s.enso_Comparison.outperforming_phase !== "El Niño") return false;
      if (stationFilter === "La Niña" && s.enso_Comparison.outperforming_phase !== "La Niña") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name_en.toLowerCase().includes(q) ||
          s.name_ja.includes(q) ||
          s.station_id.includes(q) ||
          s.region_id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stations, stationFilter, selectedRegionId, searchQuery]);

  const filteredWinters = useMemo(() => {
    return [...historicalWinters]
      .reverse()
      .filter((w) => (phaseFilter === "ALL" ? true : w.enso_phase === phaseFilter));
  }, [historicalWinters, phaseFilter]);

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base text-slate-100">
                WMO Synoptic Station Drill-Down ({filteredStations.length} of {stations.length} Stations)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                23 stations outperform in El Niño (led by Matsumoto +39.2%, Miyako +25.4%, Sendai +23.2%, Kawaguchiko +20.0%, Omu +16.7%, Hiroo +15.3%) vs. 17 in La Niña (led by Matsue −76.8%, Yonago −67.7%, Maizuru −56.0%, Toyooka −49.6%, Kanazawa −42.4%).
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search station (e.g. Kutchan, Tokyo, Takada)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-56 text-xs bg-slate-950 border-slate-800 text-slate-100"
              />
              {(["all", "selected_region", "El Niño", "La Niña"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={stationFilter === f ? "default" : "outline"}
                  className="h-7 text-xs border-slate-800"
                  onClick={() => setStationFilter(f)}
                >
                  {f === "all"
                    ? "All 40 Stations"
                    : f === "selected_region"
                    ? "Focused Region"
                    : `${f} Winners`}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto max-h-[420px]">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 text-xs">
                <TableHead className="text-slate-300">WMO Station</TableHead>
                <TableHead className="text-slate-300">Region</TableHead>
                <TableHead className="text-slate-300 text-right">Elev</TableHead>
                <TableHead className="text-slate-300 text-right">91–20 Norm</TableHead>
                <TableHead className="text-amber-300 text-right">El Niño Med (% Norm)</TableHead>
                <TableHead className="text-cyan-300 text-right">La Niña Med (% Norm)</TableHead>
                <TableHead className="text-slate-300 text-right">Neutral Med</TableHead>
                <TableHead className="text-slate-200 text-right">EN−LN Diff</TableHead>
                <TableHead className="text-slate-300 text-right">Days ≥3cm / ≥20cm (EN vs LN)</TableHead>
                <TableHead className="text-slate-300 text-right">Max 1d Med (EN/LN)</TableHead>
                <TableHead className="text-slate-300 text-right">Outperforms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs font-mono">
              {filteredStations.map((s) => {
                const en = s.phases["El Niño"];
                const ln = s.phases["La Niña"];
                const ne = s.phases["Neutral"];
                const comp = s.enso_Comparison;
                const rName = regions.find((r) => r.region_id === s.region_id)?.name_en ?? s.region_id;
                return (
                  <TableRow key={s.station_id} className="border-slate-800/60">
                    <TableCell className="font-sans font-medium text-slate-100">
                      {s.name_en} <span className="text-slate-400">({s.name_ja})</span>{" "}
                      <span className="text-[10px] text-slate-500">#{s.station_id}</span>
                    </TableCell>
                    <TableCell className="font-sans text-slate-400">{rName}</TableCell>
                    <TableCell className="text-right text-slate-400">{s.elevation_m}m</TableCell>
                    <TableCell className="text-right text-slate-200">{s.normals_1991_2020.snow_1991_2020_cm} cm</TableCell>
                    <TableCell className="text-right text-amber-200">
                      {en.snowfall_cm.median} cm ({en.pct_of_normal.median}%)
                    </TableCell>
                    <TableCell className="text-right text-cyan-200">
                      {ln.snowfall_cm.median} cm ({ln.pct_of_normal.median}%)
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {ne.snowfall_cm.median} cm ({ne.pct_of_normal.median}%)
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        comp.el_nino_minus_la_nina_median_pct_norm >= 0 ? "text-amber-400" : "text-cyan-400"
                      }`}
                    >
                      {comp.el_nino_minus_la_nina_median_cm > 0 ? "+" : ""}
                      {comp.el_nino_minus_la_nina_median_cm} cm ({comp.el_nino_minus_la_nina_median_pct_norm > 0 ? "+" : ""}
                      {comp.el_nino_minus_la_nina_median_pct_norm}%)
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {en.frequency_intensity.days_ge_3cm_mean}/{ln.frequency_intensity.days_ge_3cm_mean}d •{" "}
                      {en.frequency_intensity.days_ge_20cm_mean}/{ln.frequency_intensity.days_ge_20cm_mean}d
                    </TableCell>
                    <TableCell className="text-right text-slate-200">
                      {en.frequency_intensity.max_1d_snow_cm.median} / {ln.frequency_intensity.max_1d_snow_cm.median} cm
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          comp.outperforming_phase === "El Niño"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        }
                      >
                        {comp.outperforming_phase}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base text-slate-100">
                72-Winter Historical Chronology (1953/54–2024/25)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                JMA NINO.3 DJF SST deviations and regional seasonal snowfall totals (% of 1991–2020 normal in parentheses).
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              {(["ALL", "El Niño", "La Niña", "Neutral"] as const).map((ph) => (
                <Button
                  key={ph}
                  size="sm"
                  variant={phaseFilter === ph ? "default" : "outline"}
                  className="h-7 text-xs border-slate-800"
                  onClick={() => setPhaseFilter(ph)}
                >
                  {ph}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto max-h-[420px]">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 text-xs">
                <TableHead className="text-slate-300">Winter</TableHead>
                <TableHead className="text-slate-300">ENSO Phase</TableHead>
                <TableHead className="text-slate-300 text-right">NINO.3 DJF</TableHead>
                <TableHead className="text-slate-300 text-right">Hokkaido SoJ</TableHead>
                <TableHead className="text-slate-300 text-right">Hokkaido Okh</TableHead>
                <TableHead className="text-slate-300 text-right">Tohoku SoJ</TableHead>
                <TableHead className="text-slate-300 text-right">Tohoku Pac</TableHead>
                <TableHead className="text-slate-300 text-right">Hokuriku</TableHead>
                <TableHead className="text-slate-300 text-right">Central High</TableHead>
                <TableHead className="text-slate-300 text-right">San&apos;in West</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs font-mono">
              {filteredWinters.map((w) => (
                <TableRow key={w.winter_label} className="border-slate-800/60">
                  <TableCell className="font-bold text-slate-100">{w.winter_label}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        w.enso_phase === "El Niño"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : w.enso_phase === "La Niña"
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          : "bg-slate-700/40 text-slate-300 border-slate-600/40"
                      }
                    >
                      {w.enso_phase}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-slate-200">
                    {w.nino3_djf_mean_deviation_c > 0 ? `+${w.nino3_djf_mean_deviation_c}` : w.nino3_djf_mean_deviation_c}°C
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {w.regions.hokkaido_soj.snowfall_cm} ({w.regions.hokkaido_soj.pct_of_normal}%)
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {w.regions.hokkaido_okhotsk.snowfall_cm} ({w.regions.hokkaido_okhotsk.pct_of_normal}%)
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {w.regions.tohoku_soj.snowfall_cm} ({w.regions.tohoku_soj.pct_of_normal}%)
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {w.regions.tohoku_pac.snowfall_cm} ({w.regions.tohoku_pac.pct_of_normal}%)
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {w.regions.hokuriku.snowfall_cm} ({w.regions.hokuriku.pct_of_normal}%)
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {w.regions.central_highlands_kanto.snowfall_cm} ({w.regions.central_highlands_kanto.pct_of_normal}%)
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {w.regions.sanin_west_soj.snowfall_cm} ({w.regions.sanin_west_soj.pct_of_normal}%)
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
