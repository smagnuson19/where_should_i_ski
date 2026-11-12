"use client";

import React, { useState } from "react";
import rawData from "@/data/jma-enso-snowfall-data.json";
import { JmaEnsoDataset } from "@/types/enso";
import { RegionalComparisonView } from "@/components/RegionalComparisonView";
import { TempMonthlyIntensityView } from "@/components/TempMonthlyIntensityView";
import { StationAndHistoryView } from "@/components/StationAndHistoryView";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Snowflake, Thermometer, CloudSnow, Compass, MapPin, BarChart3 } from "lucide-react";

const dataset = rawData as unknown as JmaEnsoDataset;

export default function EnsoSnowfallDashboard() {
  const [selectedRegionId, setSelectedRegionId] = useState<string>("hokkaido_soj");
  const selectedRegion =
    dataset.regions.find((r) => r.region_id === selectedRegionId) ?? dataset.regions[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Snowflake className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Japan Regional Snowfall & ENSO Climate Atlas
                </h1>
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs">
                  JMA 1953/54–2024/25 (72 Winters)
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                19 El Niño • 19 La Niña • 34 Neutral Winters across 8 JMA Climate Divisions & 40 WMO Synoptic Stations (1991–2020 Normals)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {dataset.regions.map((r) => (
              <button
                key={r.region_id}
                onClick={() => setSelectedRegionId(r.region_id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                  r.region_id === selectedRegionId
                    ? "bg-sky-500/20 text-sky-200 border-sky-500/60"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                {r.name_en.replace(" (Eastern Japan Sea of Japan Side)", "").replace(" / Western Japan (Sea of Japan Side)", "").replace("Kanto-Koshin / Nagano / ", "")}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>La Niña Strongholds (EAWM / JPCZ)</span>
                <Compass className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-base font-bold text-cyan-300">
                San&apos;in (+34.0%), Hokuriku (+4.6%), Tohoku SoJ (+2.3%)
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cold Siberian NW monsoon surges favor Western & Central Sea of Japan coasts. Modern era (1991–2025) LN edge: San&apos;in +82.6%, Hokuriku +46.7%, Tohoku SoJ +24.3%.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>El Niño Outperformers (Nan&apos;gan Lows)</span>
                <CloudSnow className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-base font-bold text-amber-300">
                Okhotsk (+14.4%), Central Highlands (+13.7%), Hokkaido (+4.5%)
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Southern-coast extratropical cyclones pump Pacific moisture into Nagano/Kanto mountains (Matsumoto +39.2%, Kawaguchiko +20.0%, Miyako +25.4%, Sendai +23.2%).
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Frequency vs. Storm Intensity Paradox</span>
                <BarChart3 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-base font-bold text-emerald-300">
                Fewer Snow Days, Larger Single Storms in El Niño
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tohoku Pac has fewer ≥3cm days in EN (12.3 vs 13.5d) but +19.5% more ≥20cm days and +19.4% bigger max 1-day storms (24.6 vs 20.6 cm; Shinjo 48 vs 41 cm).
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Winter Thermal Dipole (DJF & Detrended)</span>
                <Thermometer className="h-4 w-4 text-rose-400" />
              </div>
              <p className="text-base font-bold text-rose-300">
                Honshu +0.36° to +0.61°C Warmer in El Niño
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Detrended DJF anomalies are +0.20° to +0.68°C in EN across Honshu (shifting coastal San&apos;in/Hokuriku snow to rain), while Hokkaido is −0.01° to −0.38°C cooler.
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="bg-slate-900 border border-slate-800">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">
                1. Regional Outperformance & IQR Distributions
              </TabsTrigger>
              <TabsTrigger value="climate" className="text-xs sm:text-sm">
                2. Monthly Profile, Storm Intensity & Temperatures
              </TabsTrigger>
              <TabsTrigger value="stations" className="text-xs sm:text-sm">
                3. 40 WMO Stations & 72-Winter Chronology
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-sky-400" />
              <span>Focused Region:</span>
              <strong className="text-slate-100">{selectedRegion.name_en}</strong>
              <span className="font-mono text-slate-400">({selectedRegion.name_ja})</span>
            </div>
          </div>

          <TabsContent value="overview" className="mt-0">
            <RegionalComparisonView
              regions={dataset.regions}
              selectedRegionId={selectedRegionId}
              onSelectRegion={setSelectedRegionId}
            />
          </TabsContent>

          <TabsContent value="climate" className="mt-0">
            <TempMonthlyIntensityView
              regions={dataset.regions}
              selectedRegion={selectedRegion}
            />
          </TabsContent>

          <TabsContent value="stations" className="mt-0">
            <StationAndHistoryView
              regions={dataset.regions}
              stations={dataset.stations}
              historicalWinters={dataset.historical_winters}
              selectedRegionId={selectedRegionId}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
