"use client";

import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { ElevationBandInfo, EnsoWaterYear, SnotelStation } from "@/types/snotel";
import { ENSO_PHASES, StationRangeStats, YearRange } from "@/types/snotel-range";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { summarizeRegion } from "@/lib/snotel/range-analysis";
import { formatPct, pctColor } from "@/lib/snotel/enso-scale";
import { PHASE_LABEL, PHASE_STYLE } from "@/lib/snotel/year-range";

interface ElevationBandTableProps {
  regionId: string;
  elevationBands: ElevationBandInfo[];
  stations: SnotelStation[];
  stationStats: Map<string, StationRangeStats>;
  ensoByWaterYear: Record<string, EnsoWaterYear>;
  range: YearRange;
  sweMultiplier: number;
}

export function ElevationBandTable(props: ElevationBandTableProps) {
  const { regionId, elevationBands, stations, stationStats, ensoByWaterYear, range } = props;
  const rows = useMemo(
    () =>
      elevationBands.map((band) => ({
        band,
        summary: summarizeRegion(regionId, band.id, stations, stationStats, ensoByWaterYear, range),
      })),
    [regionId, elevationBands, stations, stationStats, ensoByWaterYear, range]
  );

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-800">
          <TableHead className="text-xs text-slate-400">Elevation band</TableHead>
          <TableHead className="text-xs text-slate-400 text-right">Sites</TableHead>
          <TableHead className="text-xs text-slate-400 text-right">Typical peak SWE</TableHead>
          {ENSO_PHASES.map((p) => (
            <TableHead key={p} className={`text-xs text-right ${PHASE_STYLE[p].text}`}>
              {PHASE_LABEL[p]}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ band, summary }) => (
          <TableRow key={band.id} className="border-slate-800">
            <TableCell className="text-xs text-slate-200">{band.label}</TableCell>
            <TableCell className="text-xs text-right font-mono">{summary.siteCount}</TableCell>
            <TableCell className="text-xs text-right font-mono">
              {summary.typicalPeakSwe !== null ? `${(summary.typicalPeakSwe * props.sweMultiplier).toFixed(1)} in` : "–"}
            </TableCell>
            {ENSO_PHASES.map((p) => {
              const s = summary.phases[p];
              return (
                <TableCell key={p} className="text-xs text-right font-mono">
                  <span className="inline-flex items-center gap-1.5 justify-end">
                    {s.pctOfMedian !== null && s.lowConfidence && <AlertTriangle className="w-3 h-3 text-amber-400" aria-label="low confidence" />}
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pctColor(s.pctOfMedian) }} />
                    {formatPct(s.pctOfMedian)}
                    <span className="text-slate-500">({s.winters})</span>
                  </span>
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
