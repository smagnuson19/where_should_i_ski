# Find the Snow — Snowpack & ENSO in the US (SNOTEL) and Japan (JMA)

Two dashboards behind top-level tabs:

- **United States (SNOTEL)**: **954 snow-monitoring USDA NRCS SNOTEL (`SNTL` / `SNTLT`) stations** across Western North America and Alaska against **NOAA CPC Oceanic Niño Index (`ONI`)** El Niño, La Niña and Neutral winters, **Water Year 1930 through 2026**.
- **Japan (JMA)**: season snowfall for 8 JMA climate regions and 40 WMO stations across El Niño, La Niña and Neutral winters (1953/54–2024/25), from `src/data/jma-enso-snowfall-data.json`.

## US view

- **Plain-language summary first**: which regions do best and worst in each ENSO phase, updated with every filter, with low-confidence flags when a phase has fewer than 5 winters in the selected years.
- **US map front and center**: states are shaded with their SNOTEL region's typical peak snowpack (% of median) for the selected phase; click a region to focus the regional charts. Built from the bundled `us-atlas` TopoJSON with `d3-geo` (Albers USA projection, Alaska inset); no tile servers or API keys.
- **Year-range filter**: dual slider plus presets (All years, Since 1981, Since 1991, Last 20 winters). Map colors, regional medians, % of median, temperatures, storm days, elevation bands and takeaways are recomputed client-side from per-year data.
- **Show SNOTEL sites** (off by default): plots every site on the map and lists them; click a site to open its historical popup with live daily snowfall telemetry via `/api/snotel-daily`.
- **Progressive disclosure**: secondary charts, the elevation-band comparison, the glossary (SWE, ONI, % of median, elevation band, ...) and method notes are collapsed by default.

## Japan view

- **Same layout as the US view**: plain-language summary, ENSO phase toggle and year-range filter, a regional map with a ranking beside it, then a deep dive for one region (monthly snowfall, winter-by-winter history, snow days and big storms, stations).
- **Japan map**: JMA forecast areas are shaded with their region's median season snowfall as % of typical for the selected phase, using the same color scale as the US map. Region badges sit over the Sea of Japan and Pacific with leader lines; click a badge, region or station to open that region's details. Rendered with `d3-geo` from the bundled `src/data/japan-forecast-areas.topo.json`.
- **Year-range filter**: region percentages, monthly profiles, storm days and temperatures are recomputed client-side from the per-winter regional records. Station tables and hover cards use all winters.

## Data

- `scripts/build_japan_map.sh`: downloads JMA's forecast-area GIS data, drops distant island groups and simplifies it with `mapshaper` into `src/data/japan-forecast-areas.topo.json` (about 125 KB). `src/lib/japan/map.ts` assigns each area to one of the eight regions.
- `scripts/ingest_snotel_enso.py`: full ingest of station metadata, per-station water-year histories, ENSO classification and 28 benchmark daily storm records into `public/data/`.
- `scripts/build_monthly_by_year.py`: per-water-year monthly regional site averages (SWE, snow depth, temperature) by region and elevation band, written to `public/data/snotel-monthly-by-year.json`, so the seasonal curves can be rebuilt for any year range. Run `python3 scripts/build_monthly_by_year.py` (needs network access to the USDA AWDB API, about 2 minutes).

## Running Locally

```bash
npm install
npm run dev -- --port 4317
```

Open `http://127.0.0.1:4317` in your browser.

## Analytics

PostHog is initialized in `src/instrumentation-client.ts` when `NEXT_PUBLIC_POSTHOG_KEY` is set (see `.env.local`); without a key, nothing is sent. Set `NEXT_PUBLIC_POSTHOG_REGION` to `eu` for an EU-hosted project. Events go through the `/ingest` rewrites in `next.config.ts` so ad blockers don't drop them. On Vercel, add both variables to the project's environment variables and redeploy, since `NEXT_PUBLIC_` values are inlined at build time.
