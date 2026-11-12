# Japan Regional Snowfall & ENSO Climate Atlas (1953/54–2024/25)

Interactive Next.js (TypeScript, Tailwind CSS, shadcn/ui) dashboard and climatological dataset analyzing 72 winters (**1953/54–2024/25**: **19 El Niño**, **19 La Niña**, and **34 Neutral** winters) across **8 Japan Meteorological Agency (JMA) climate divisions** and **40 WMO synoptic stations**.

## Data Sources

- **JMA Historical El Niño & La Niña Events (NINO.3 5-month running mean SST deviation):** `https://ds.data.jma.go.jp/tcc/tcc/products/elnino/ensoevents.html`
- **JMA Historical Surface Observation Statistics & 1991–2020 Climatological Normals:** `https://www.jma.go.jp/jma/en/menu.html` and `https://www.data.jma.go.jp/obd/stats/etrn/index.php`

## Key Capabilities

1. **Regional Outperformance & Distributional Spread:** Toggle between the full 72-winter record (1953/54–2024/25) and the modern warming era (1991–2025), and inspect medians, means, IQRs (Q25–Q75), and min–max ranges in `% of 1991–2020 normal`, `% of 72-year median`, or `absolute cm`.
2. **Monthly Snowfall Evolution (Nov–Mar) & Storm Frequency vs. Intensity:** Compare early-winter La Niña East Asian Winter Monsoon (EAWM / JPCZ) surges against late-winter El Niño Southern Coast Lows (*Nan'gan Low* / 南岸低気圧), including snowfall days ($\ge 3\text{ cm}$, $\ge 10\text{ cm}$, $\ge 20\text{ cm}$, $\ge 50\text{ cm}$), median max 1-day storm totals, and snowfall intensity per snow day.
3. **Winter Temperatures (DJF & NDJFM):** View raw seasonal means, anomalies vs. 1991–2020 WMO normals, secular warming trends ($^\circ\text{C}/\text{decade}$), and linearly detrended DJF anomalies.
4. **40 WMO Stations & 72-Winter Chronology:** Filter and search individual stations from Wakkanai and Kutchan (Niseko) to Takada, Matsumoto, Kawaguchiko, Tokyo, Toyooka, and Matsue, and explore all 72 historical winters.

## Running Locally

```bash
npm install
npm run dev -- --port 4173 --hostname 127.0.0.1
```

Open `http://127.0.0.1:4173` in your browser.
