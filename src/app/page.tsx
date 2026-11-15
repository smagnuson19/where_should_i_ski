"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SnotelDashboard } from "@/components/snotel/snotel-dashboard";

const JapanDashboard = dynamic(
  () => import("@/components/japan/japan-dashboard").then((m) => m.JapanDashboard),
  {
    loading: () => (
      <div className="min-h-[60vh] flex items-center justify-center gap-2 text-sm text-slate-700">
        <Loader2 className="w-5 h-5 animate-spin text-pine-600" />
        Loading the Japan JMA dashboard…
      </div>
    ),
  }
);

const BacktestDashboard = dynamic(
  () => import("@/components/backtest/backtest-dashboard").then((m) => m.BacktestDashboard),
  {
    loading: () => (
      <div className="min-h-[60vh] flex items-center justify-center gap-2 text-sm text-slate-700">
        <Loader2 className="w-5 h-5 animate-spin text-pine-600" />
        Loading the model backtest…
      </div>
    ),
  }
);

type CountryTab = "us" | "japan" | "backtest";

function MountainLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M2 19 L9.5 6.5 L13.2 12.4 L15.6 8.8 L22 19 Z" fill="currentColor" />
      <path d="M9.5 6.5 L11.7 10.1 L10.5 9.6 L9.5 10.7 L8.4 9.5 L7.4 10 Z" fill="#ffffff" />
    </svg>
  );
}

export default function FindTheSnowPage() {
  const [tab, setTab] = useState<CountryTab>("us");
  const [japanOpened, setJapanOpened] = useState(false);
  const [backtestOpened, setBacktestOpened] = useState(false);

  const changeTab = (value: unknown) => {
    const next: CountryTab =
      value === "japan" ? "japan" : value === "backtest" ? "backtest" : "us";
    setTab(next);
    if (next === "japan") setJapanOpened(true);
    if (next === "backtest") setBacktestOpened(true);
  };

  return (
    <Tabs value={tab} onValueChange={changeTab} className="min-h-screen gap-0 bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-slate-100/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-pine-500/15 border border-pine-500/40 text-pine-700">
              <MountainLogo className="w-6 h-6" />
            </div>
            <div>
              <div className="font-heading uppercase text-lg sm:text-xl font-bold tracking-wide text-slate-950 leading-none">
                Find the Snow
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                How El Niño and La Niña shift mountain snowpack
              </div>
            </div>
          </div>
          <TabsList className="bg-slate-200/70 border border-slate-300 p-1 rounded-md h-9!">
            <TabsTrigger value="us" className="text-xs sm:text-sm px-2.5 sm:px-3.5 rounded-sm">
              United States (SNOTEL)
            </TabsTrigger>
            <TabsTrigger value="japan" className="text-xs sm:text-sm px-2.5 sm:px-3.5 rounded-sm">
              Japan (JMA)
            </TabsTrigger>
            <TabsTrigger value="backtest" className="text-xs sm:text-sm px-2.5 sm:px-3.5 rounded-sm">
              Model Backtest
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
      <TabsContent value="backtest" keepMounted>
        {backtestOpened && <BacktestDashboard />}
      </TabsContent>
    </Tabs>
  );
}
