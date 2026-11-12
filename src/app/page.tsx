"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { CloudSnow, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SnotelDashboard } from "@/components/snotel/snotel-dashboard";

const JapanDashboard = dynamic(
  () => import("@/components/japan/japan-dashboard").then((m) => m.JapanDashboard),
  {
    loading: () => (
      <div className="min-h-[60vh] flex items-center justify-center gap-2 text-sm text-slate-300">
        <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
        Loading the Japan JMA dashboard…
      </div>
    ),
  }
);

type CountryTab = "us" | "japan";

export default function WhereShouldISkiPage() {
  const [tab, setTab] = useState<CountryTab>("us");
  const [japanOpened, setJapanOpened] = useState(false);

  const changeTab = (value: unknown) => {
    const next = value === "japan" ? "japan" : "us";
    setTab(next);
    if (next === "japan") setJapanOpened(true);
  };

  return (
    <Tabs value={tab} onValueChange={changeTab} className="min-h-screen gap-0 bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <CloudSnow className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold tracking-tight text-white">Where Should I Ski?</div>
              <div className="text-[11px] text-slate-400">How El Niño and La Niña shift mountain snow</div>
            </div>
          </div>
          <TabsList className="bg-slate-900 border border-slate-800 h-9!">
            <TabsTrigger value="us" className="text-xs sm:text-sm px-3">
              United States (SNOTEL)
            </TabsTrigger>
            <TabsTrigger value="japan" className="text-xs sm:text-sm px-3">
              Japan (JMA)
            </TabsTrigger>
          </TabsList>
        </div>
      </header>

      <TabsContent value="us" keepMounted>
        <SnotelDashboard />
      </TabsContent>
      <TabsContent value="japan" keepMounted>
        {japanOpened && <JapanDashboard />}
      </TabsContent>
    </Tabs>
  );
}
