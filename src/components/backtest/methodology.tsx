"use client";

import React from "react";
import { FlaskConical } from "lucide-react";
import { Disclosure } from "@/components/snotel/disclosure";
import { BacktestMethodology, BacktestModelMeta } from "@/types/backtest";

export function BacktestMethodologyPanel({
  methodology,
  models,
  stationCount,
}: {
  methodology: BacktestMethodology;
  models: BacktestModelMeta[];
  stationCount: number;
}) {
  const powderSnow = methodology.powderThresholdSnowIn ?? 6;
  const powderWater = methodology.powderThresholdSweIn ?? methodology.powderThresholdIn ?? 0.5;

  return (
    <Disclosure
      title="How we scored the models"
      summary="Plain-English notes on what “closest” means"
      icon={<FlaskConical className="w-4 h-4 text-slate-600" />}
    >
      <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 leading-relaxed">
        <li>
          We asked: if you had checked a model N days before a date, how close was it to what mountain stations
          actually measured? <span className="text-slate-700">Same day</span> is the model’s near-term view;{" "}
          <span className="text-slate-700">1 / 3 / 5 days before</span> is the trip-planning question.
        </li>
        <li>
          Truth comes from {stationCount} USDA SNOTEL sites next to major Western resorts — snow-pillow water,
          stake depth gains, and daily high/low temperature.
        </li>
        <li>
          <span className="text-slate-700">New snow</span> compares the model’s daily snowfall (inches) to how much
          the stake depth rose. Depth can settle or blow around, so it undercounts true snowfall.
        </li>
        <li>
          <span className="text-slate-700">Water in the snow</span> compares the model’s snowfall converted to water
          against the snow pillow. That is the fairer scientific score when the two disagree.
        </li>
        <li>
          <span className="text-slate-700">Avg miss</span> is the average absolute error on days when either the
          mountain or the model had meaningful snow. Lower is better.{" "}
          <span className="text-slate-700">Season total</span> says whether the model ran too high or too low all
          winter. <span className="text-slate-700">Caught 6&quot;+ days</span> is how often it warned for a powder day
          (about {powderSnow}&quot; new snow, or {powderWater}&quot; of water).
        </li>
        <li>
          Models are only compared on days where every listed model and the station both have data, so the race is
          fair. “Tied for best” means we cannot statistically separate them.
        </li>
        <li>Models in this table: {models.map((m) => m.label).join("; ")}.</li>
        {methodology.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </Disclosure>
  );
}
