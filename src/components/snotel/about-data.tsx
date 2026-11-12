"use client";

import React from "react";
import { Database } from "lucide-react";
import { Disclosure } from "@/components/snotel/disclosure";

export function AboutData({ source, totalStations }: { source: string; totalStations: number }) {
  return (
    <Disclosure
      title="About the data and method"
      summary="Where the numbers come from and how they are computed"
      icon={<Database className="w-4 h-4 text-slate-400" />}
    >
      <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400 leading-relaxed">
        <li>
          Sources: {source}. {totalStations} snow-monitoring sites; before about 1980 only a few dozen long-record sites
          reported, so recent ranges rest on many more sites.
        </li>
        <li>
          Each site&apos;s peak SWE in a winter is compared with that site&apos;s own median peak SWE over the selected
          years. A region&apos;s value for a winter is the median across its sites, and a phase&apos;s value is the median
          over that phase&apos;s winters. Sites with a typical peak under 1 in of SWE are left out of the percentages.
        </li>
        <li>
          Winters are classified with NOAA&apos;s Oceanic Niño Index over Oct–Apr (+0.5 °C or warmer = El Niño, −0.5 °C or
          cooler = La Niña); winters before 1951 use a historical reconstruction. Phases with fewer than 5 winters in the
          selected years are flagged as low confidence.
        </li>
        <li>
          Seasonal curves use per-year monthly site averages (scripts/build_monthly_by_year.py). Snowfall-day counts come
          from 28 benchmark sites with daily records, averaged over their winters in the selected years.
        </li>
        <li>
          Map states are shaded with the region that holds most of their sites; states with fewer than 5 sites are left
          unshaded. Site dots show where each station actually sits.
        </li>
      </ul>
    </Disclosure>
  );
}
