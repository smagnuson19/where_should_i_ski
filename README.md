# SNOTEL × ENSO Historical Snowpack, Temperature & Storm Explorer (1930–2026)

Interactive climate explorer analyzing **954 snow-monitoring USDA NRCS SNOTEL (`SNTL` / `SNTLT`) stations** across Western North America and Alaska against **NOAA CPC Oceanic Niño Index (`ONI`)** El Niño, La Niña, and Historical Median regimes from **Water Year 1930 through 2026**.

## Key Features

- **All-Station SNOTEL Network Ingestion (`scripts/ingest_snotel_enso.py`)**: Pulls period-of-record monthly snow water equivalent (`WTEQ`), snow depth (`SNWD`), and temperature (`TAVG`, `TMAX`, `TMIN`) series going as far back as possible (`1930–2026`), plus daily storm event telemetry across 28 regional/elevation benchmark sites.
- **Regional & Elevation-Band Comparisons**: Compare seasonal `Oct–Sep` SWE accumulation curves, `Nov–Mar` winter temperatures against the `32°F` freezing line, and 97-year water-year snowpack anomalies across 7 hydro-climatic regions (`PNW`, `SIERRA`, `GREAT_BASIN`, `NORTHERN_ROCKIES`, `CENTRAL_ROCKIES`, `SOUTHWEST`, `ALASKA`) and 5 elevation bands (`<4,500 ft` to `>10,000 ft`).
- **Elevation & Orographic Lapse-Rate Adjuster**: Dynamically adjust simulated station/regional elevation (`±3,000 ft` or `3,000–12,500 ft`), temperature lapse rate (`°F / 1,000 ft`), and orographic SWE gradient (`% / 1,000 ft`).
- **Interactive Station Historical Popup Modal**: Click any SNOTEL site on the map or station list to open its full historical popup modal with seasonal ENSO curves, complete period-of-record bar/line charts, and live daily snowfall impulse telemetry via `/api/snotel-daily`.

## Running Locally

```bash
npm install
npm run dev -- --port 4317
```

Open `http://127.0.0.1:4317` in your browser.
