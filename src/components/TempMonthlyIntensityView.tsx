"use client";

import React from "react";
import { RegionData } from "@/types/enso";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  regions: RegionData[];
  selectedRegion: RegionData;
}

const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar"] as const;

export function TempMonthlyIntensityView({ regions, selectedRegion }: Props) {
  const en = selectedRegion.phases["El Niño"];
  const ln = selectedRegion.phases["La Niña"];
  const ne = selectedRegion.phases["Neutral"];
  const maxMonthVal = Math.max(
    ...MONTHS.flatMap((m) => [
      en.monthly_snow_mean_cm[m],
      ln.monthly_snow_mean_cm[m],
      ne.monthly_snow_mean_cm[m],
    ]),
    20
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-100">
                Monthly Snowfall Profile (Nov–Mar): {selectedRegion.name_en}
              </CardTitle>
              <Badge variant="outline" className="border-slate-700 text-slate-300 font-mono">
                Norm: {selectedRegion.normals_1991_2020.snowfall_cm} cm
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              La Niña peaks early (Dec–Jan monsoon cold surges) while El Niño surges in late winter (Feb–Mar Nan&apos;gan Low cyclones).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {MONTHS.map((m) => {
              const enM = en.monthly_snow_mean_cm[m];
              const lnM = ln.monthly_snow_mean_cm[m];
              const neM = ne.monthly_snow_mean_cm[m];
              const normM = selectedRegion.normals_1991_2020.monthly_snow_cm[m];
              return (
                <div key={m} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 w-12">{m}</span>
                    <span className="text-slate-400 font-mono">
                      1991–2020 Norm: {normM} cm | EN: <strong className="text-amber-300">{enM} cm</strong> ({en.monthly_snow_pct_of_normal[m]}%) | LN:{" "}
                      <strong className="text-cyan-300">{lnM} cm</strong> ({ln.monthly_snow_pct_of_normal[m]}%) | NE: {neM} cm
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-950 rounded p-1 border border-slate-800/70">
                      <div
                        className="h-2 rounded bg-amber-500"
                        style={{ width: `${Math.min(100, (enM / maxMonthVal) * 100)}%` }}
                      />
                    </div>
                    <div className="bg-slate-950 rounded p-1 border border-slate-800/70">
                      <div
                        className="h-2 rounded bg-cyan-400"
                        style={{ width: `${Math.min(100, (lnM / maxMonthVal) * 100)}%` }}
                      />
                    </div>
                    <div className="bg-slate-950 rounded p-1 border border-slate-800/70">
                      <div
                        className="h-2 rounded bg-slate-400"
                        style={{ width: `${Math.min(100, (neM / maxMonthVal) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-100">
              Storm Frequency vs. Single-Event Intensity: {selectedRegion.name_en}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Highlighting where El Niño brings fewer snowfall days (&ge;3 cm) but heavier single-day Nan&apos;gan Low storms (&ge;20 cm, &ge;50 cm, max 1-day).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-300 text-xs">Metric</TableHead>
                  <TableHead className="text-amber-300 text-xs text-right">El Niño</TableHead>
                  <TableHead className="text-cyan-300 text-xs text-right">La Niña</TableHead>
                  <TableHead className="text-slate-300 text-xs text-right">Neutral</TableHead>
                  <TableHead className="text-slate-200 text-xs text-right">EN − LN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-mono">
                {[
                  {
                    label: "Snow Days ≥ 3 cm (days/yr)",
                    enVal: en.frequency_intensity.days_ge_3cm_mean,
                    lnVal: ln.frequency_intensity.days_ge_3cm_mean,
                    neVal: ne.frequency_intensity.days_ge_3cm_mean,
                    unit: "d",
                  },
                  {
                    label: "Moderate Snow Days ≥ 10 cm",
                    enVal: en.frequency_intensity.days_ge_10cm_mean,
                    lnVal: ln.frequency_intensity.days_ge_10cm_mean,
                    neVal: ne.frequency_intensity.days_ge_10cm_mean,
                    unit: "d",
                  },
                  {
                    label: "Heavy Storm Days ≥ 20 cm",
                    enVal: en.frequency_intensity.days_ge_20cm_mean,
                    lnVal: ln.frequency_intensity.days_ge_20cm_mean,
                    neVal: ne.frequency_intensity.days_ge_20cm_mean,
                    unit: "d",
                  },
                  {
                    label: "Extreme Storm Days ≥ 50 cm",
                    enVal: en.frequency_intensity.days_ge_50cm_mean,
                    lnVal: ln.frequency_intensity.days_ge_50cm_mean,
                    neVal: ne.frequency_intensity.days_ge_50cm_mean,
                    unit: "d",
                  },
                  {
                    label: "Max 1-Day Snowfall Median",
                    enVal: en.frequency_intensity.max_1d_snow_cm.median,
                    lnVal: ln.frequency_intensity.max_1d_snow_cm.median,
                    neVal: ne.frequency_intensity.max_1d_snow_cm.median,
                    unit: " cm",
                  },
                  {
                    label: "Intensity per ≥3cm Snow Day",
                    enVal: en.frequency_intensity.snow_per_ge3cm_day_cm,
                    lnVal: ln.frequency_intensity.snow_per_ge3cm_day_cm,
                    neVal: ne.frequency_intensity.snow_per_ge3cm_day_cm,
                    unit: " cm/d",
                  },
                  {
                    label: "Max 1-Day Share of Winter Total",
                    enVal: en.frequency_intensity.max_1d_share_of_winter_pct,
                    lnVal: ln.frequency_intensity.max_1d_share_of_winter_pct,
                    neVal: ne.frequency_intensity.max_1d_share_of_winter_pct,
                    unit: "%",
                  },
                ].map((row) => {
                  const diff = +(row.enVal - row.lnVal).toFixed(2);
                  return (
                    <TableRow key={row.label} className="border-slate-800/60">
                      <TableCell className="font-sans text-slate-300">{row.label}</TableCell>
                      <TableCell className="text-right text-amber-200">{row.enVal}{row.unit}</TableCell>
                      <TableCell className="text-right text-cyan-200">{row.lnVal}{row.unit}</TableCell>
                      <TableCell className="text-right text-slate-300">{row.neVal}{row.unit}</TableCell>
                      <TableCell className={`text-right font-semibold ${diff > 0 ? "text-amber-400" : diff < 0 ? "text-cyan-400" : "text-slate-400"}`}>
                        {diff > 0 ? `+${diff}` : diff}{row.unit}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-100">
            All 8 Regions: Winter Temperatures (DJF & NDJFM, 1991–2020 Anomalies & Detrended Anomalies) & Storm Intensity
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Honshu regions are +0.36°C to +0.61°C warmer in El Niño vs. La Niña (driving rain/snow phase shifts in San&apos;in & Hokuriku), whereas subfreezing Hokkaido is slightly cooler in El Niño.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 text-xs">
                <TableHead className="text-slate-300">Region</TableHead>
                <TableHead className="text-slate-300 text-right">Norm DJF / NDJFM</TableHead>
                <TableHead className="text-slate-300 text-right">Trend /dec</TableHead>
                <TableHead className="text-amber-300 text-right">EN DJF (Anom / Detrend)</TableHead>
                <TableHead className="text-cyan-300 text-right">LN DJF (Anom / Detrend)</TableHead>
                <TableHead className="text-slate-200 text-right">EN−LN DJF</TableHead>
                <TableHead className="text-slate-300 text-right">NDJFM (EN / LN)</TableHead>
                <TableHead className="text-slate-300 text-right">Days ≥3cm (EN/LN)</TableHead>
                <TableHead className="text-slate-300 text-right">Days ≥20cm (EN/LN)</TableHead>
                <TableHead className="text-slate-300 text-right">Max 1d Med (EN/LN)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs font-mono">
              {regions.map((r) => {
                const ren = r.phases["El Niño"];
                const rln = r.phases["La Niña"];
                const tDiff = r.enso_comparison.temp_djf_el_nino_minus_la_nina_c;
                return (
                  <TableRow key={r.region_id} className="border-slate-800/60">
                    <TableCell className="font-sans font-medium text-slate-200">{r.name_en}</TableCell>
                    <TableCell className="text-right text-slate-300">
                      {r.normals_1991_2020.temp_djf_c}°C / {r.normals_1991_2020.temp_ndjfm_c}°C
                    </TableCell>
                    <TableCell className="text-right text-rose-300">+{r.baselines_1954_2025.temp_djf_trend_c_per_decade}°C</TableCell>
                    <TableCell className="text-right text-amber-200">
                      {ren.temp_djf_c.mean}°C ({ren.temp_djf_anomaly_c.mean > 0 ? "+" : ""}{ren.temp_djf_anomaly_c.mean}° / {ren.temp_djf_detrended_anom_c.median > 0 ? "+" : ""}{ren.temp_djf_detrended_anom_c.median}°)
                    </TableCell>
                    <TableCell className="text-right text-cyan-200">
                      {rln.temp_djf_c.mean}°C ({rln.temp_djf_anomaly_c.mean > 0 ? "+" : ""}{rln.temp_djf_anomaly_c.mean}° / {rln.temp_djf_detrended_anom_c.median > 0 ? "+" : ""}{rln.temp_djf_detrended_anom_c.median}°)
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${tDiff > 0 ? "text-rose-400" : "text-sky-400"}`}>
                      {tDiff > 0 ? `+${tDiff}` : tDiff}°C
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {ren.temp_ndjfm_c.mean}° / {rln.temp_ndjfm_c.mean}°C
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {ren.frequency_intensity.days_ge_3cm_mean} / {rln.frequency_intensity.days_ge_3cm_mean}d
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {ren.frequency_intensity.days_ge_20cm_mean} / {rln.frequency_intensity.days_ge_20cm_mean}d
                    </TableCell>
                    <TableCell className="text-right text-slate-200">
                      {ren.frequency_intensity.max_1d_snow_cm.median} / {rln.frequency_intensity.max_1d_snow_cm.median} cm
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
