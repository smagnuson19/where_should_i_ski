#!/usr/bin/env python3
"""
Per-water-year monthly regional snowpack & temperature medians for the SNOTEL x ENSO explorer.

Reads station metadata (region, elevation band) from public/data/snotel-stations.json, downloads
MONTHLY WTEQ / SNWD / TAVG (TMAX+TMIN fallback) from the USDA NRCS AWDB REST API, and writes
public/data/snotel-monthly-by-year.json so the dashboard can rebuild its seasonal curves for any
water-year range client-side:

  series[region][elevBand][waterYear] = 12 site-mean SWE (in) + 12 site-mean snow depths (in)
                                        + 12 site-mean air temperatures (F), months Oct..Sep

Site means (not medians) match how the full-record regional seasonal curves are aggregated.
"""

import concurrent.futures
import json
import os
import statistics
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "public", "data")
AWDB_BASE = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1"
WY_MONTHS = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]
FIRST_WY, LAST_WY = 1930, 2026
VALID_RANGE = {
    "WTEQ": (0, 250),
    "SNWD": (0, 1200),
    "TAVG": (-75, 135),
    "TMAX": (-75, 135),
    "TMIN": (-75, 135),
}


def fetch_json(url, timeout=90, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SNOTEL-ENSO-Climate-Explorer/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            if attempt == retries - 1:
                print(f"  request failed after {retries} attempts: {exc}")
                return None
            time.sleep(2 ** (attempt + 1))
    return None


def fetch_batch(batch):
    triplets = urllib.parse.quote(",".join(batch), safe=":,")
    url = (
        f"{AWDB_BASE}/data?stationTriplets={triplets}"
        f"&elements=WTEQ,SNWD,TAVG,TMAX,TMIN&duration=MONTHLY"
        f"&beginDate=1900-01-01&endDate=2026-11-01"
    )
    return fetch_json(url)


def station_months(entry):
    """(waterYear, month) -> {swe, snwd, tavg} for one AWDB station payload."""
    raw = defaultdict(dict)
    for block in entry.get("data", []):
        code = block.get("stationElement", {}).get("elementCode")
        if code not in VALID_RANGE:
            continue
        lo, hi = VALID_RANGE[code]
        for v in block.get("values", []):
            val, yr, mo = v.get("value"), v.get("year"), v.get("month")
            if val is None or yr is None or mo is None or not (lo <= val <= hi):
                continue
            raw[(yr, mo)][code] = float(val)

    out = {}
    for (yr, mo), vals in raw.items():
        wy = yr + 1 if mo >= 10 else yr
        if not (FIRST_WY <= wy <= LAST_WY):
            continue
        tavg = vals.get("TAVG")
        if tavg is None and "TMAX" in vals and "TMIN" in vals:
            tavg = (vals["TMAX"] + vals["TMIN"]) / 2.0
        out[(wy, mo)] = {"swe": vals.get("WTEQ"), "snwd": vals.get("SNWD"), "tavg": tavg}
    return out


def rounded(values, fn, digits):
    return round(fn(values), digits) if values else None


def main():
    t0 = time.time()
    with open(os.path.join(DATA_DIR, "snotel-stations.json")) as f:
        stations = {s["triplet"]: s for s in json.load(f)}

    triplets = list(stations.keys())
    batches = [triplets[i : i + 8] for i in range(0, len(triplets), 8)]
    print(f"Fetching MONTHLY WTEQ/SNWD/TAVG for {len(triplets)} stations in {len(batches)} batches...")

    payloads = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        for i, res in enumerate(ex.map(fetch_batch, batches)):
            if res:
                payloads.extend(res)
            if (i + 1) % 15 == 0 or i == len(batches) - 1:
                print(f"  batch {i + 1}/{len(batches)} done ({time.time() - t0:.0f}s)")

    got = {p.get("stationTriplet") for p in payloads} & set(triplets)
    print(f"Received monthly series for {len(got)}/{len(triplets)} stations.")
    if len(got) < 0.9 * len(triplets):
        print("Too many stations missing; not writing output.")
        sys.exit(1)

    # (region, band) -> wy -> month -> metric -> [station values]
    buckets = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(list))))
    for entry in payloads:
        meta = stations.get(entry.get("stationTriplet"))
        if not meta:
            continue
        for (wy, mo), vals in station_months(entry).items():
            for r_key in (meta["region"], "ALL"):
                for b_key in (meta["elevBand"], "ALL"):
                    cell = buckets[(r_key, b_key)][wy][mo]
                    for metric, val in vals.items():
                        if val is not None:
                            cell[metric].append(val)

    series = defaultdict(dict)
    for (r_key, b_key), by_wy in sorted(buckets.items()):
        years = {}
        for wy in sorted(by_wy):
            months = by_wy[wy]
            swe = [rounded(months[m]["swe"], statistics.fmean, 1) if m in months else None for m in WY_MONTHS]
            snwd = [rounded(months[m]["snwd"], statistics.fmean, 0) if m in months else None for m in WY_MONTHS]
            tavg = [rounded(months[m]["tavg"], statistics.fmean, 1) if m in months else None for m in WY_MONTHS]
            if any(v is not None for v in swe + tavg):
                years[str(wy)] = swe + snwd + tavg
        series[r_key][b_key] = years

    out_path = os.path.join(DATA_DIR, "snotel-monthly-by-year.json")
    with open(out_path, "w") as f:
        json.dump(
            {
                "source": "USDA NRCS AWDB SNOTEL monthly WTEQ, SNWD, TAVG (TMAX/TMIN fallback)",
                "months": WY_MONTHS,
                "layout": "per water year: 12 site-mean SWE (in), 12 site-mean snow depths (in), 12 site-mean temps (F), Oct..Sep",
                "series": series,
            },
            f,
            separators=(",", ":"),
        )
    print(f"Wrote {out_path} ({os.path.getsize(out_path) / 1e6:.2f} MB) in {time.time() - t0:.0f}s.")


if __name__ == "__main__":
    main()
