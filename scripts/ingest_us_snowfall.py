#!/usr/bin/env python3
"""
Build season-snowfall histories for western US ski resorts.

Primary source: NOAA GHCN-Daily SNOW (measured snowfall on a snow board).
Fallback: USDA NRCS SNOTEL daily snow-depth gains (labeled snotel_depth).

Writes public/data/us-snowfall.json.
"""

from __future__ import annotations

import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
from resorts_common import (  # noqa: E402
    CACHE_DIR,
    PUBLIC_DATA,
    USER_AGENT,
    ensure_dirs,
    fetch_bytes,
    filter_resorts,
    haversine_km,
    nearest_stations,
    num,
)

GHCN_STATIONS_URL = "https://www.ncei.noaa.gov/pub/data/ghcn/daily/ghcnd-stations.txt"
GHCN_INVENTORY_URL = "https://www.ncei.noaa.gov/pub/data/ghcn/daily/ghcnd-inventory.txt"
GHCN_ACCESS = "https://www.ncei.noaa.gov/data/global-historical-climatology-network-daily/access"
AWDB_BASE = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1"

MM_TO_IN = 1.0 / 25.4
SEASON_MONTHS = {10, 11, 12, 1, 2, 3, 4, 5}
# Oct–May inclusive ≈ 243 days (varies leap years); require 90% reported
MIN_SEASON_DAYS = 218
MIN_SEASONS = 20
GHCN_MAX_KM = 30.0
GHCN_MAX_BELOW_BASE_M = 700.0


def download_ghcn_meta() -> tuple[dict, dict]:
    stations_path = os.path.join(CACHE_DIR, "ghcnd-stations.txt")
    inventory_path = os.path.join(CACHE_DIR, "ghcnd-inventory.txt")
    # Reuse /tmp copies from earlier research if present and cache is empty
    for src, dest in (
        ("/tmp/ghcnd-stations.txt", stations_path),
        ("/tmp/ghcnd-inventory.txt", inventory_path),
    ):
        if os.path.exists(src) and (not os.path.exists(dest) or os.path.getsize(dest) == 0):
            ensure_dirs()
            with open(src, "rb") as a, open(dest, "wb") as b:
                b.write(a.read())
    fetch_bytes(GHCN_STATIONS_URL, stations_path)
    fetch_bytes(GHCN_INVENTORY_URL, inventory_path)

    meta: dict[str, dict] = {}
    with open(stations_path, encoding="utf-8", errors="replace") as f:
        for line in f:
            sid = line[0:11]
            if not sid.startswith("US"):
                continue
            meta[sid] = {
                "id": sid,
                "lat": float(line[12:20]),
                "lon": float(line[21:30]),
                "elevationM": float(line[31:37]),
                "name": line[41:71].strip(),
            }

    snow_span: dict[str, tuple[int, int]] = {}
    with open(inventory_path, encoding="utf-8", errors="replace") as f:
        for line in f:
            sid = line[0:11]
            if sid not in meta or line[31:35] != "SNOW":
                continue
            snow_span[sid] = (int(line[36:40]), int(line[41:45]))

    return meta, snow_span


def candidate_ghcn_stations(resorts: list[dict], meta: dict, snow_span: dict) -> list[dict]:
    stations = []
    for sid, span in snow_span.items():
        if span[1] < 2024 or span[1] - span[0] < 20:
            continue
        m = meta[sid]
        # Quick bounding-box prefilter against resort extents
        near = False
        for r in resorts:
            if abs(m["lat"] - r["lat"]) > 0.4 or abs(m["lon"] - r["lon"]) > 0.5:
                continue
            if haversine_km(r["lat"], r["lon"], m["lat"], m["lon"]) <= GHCN_MAX_KM + 2:
                near = True
                break
        if not near:
            continue
        stations.append(
            {
                **m,
                "elevationFt": round(m["elevationM"] * 3.28084),
                "source": "ghcn",
                "snowStart": span[0],
                "snowEnd": span[1],
            }
        )
    return stations


def parse_attr_quality(attr: str | None) -> str:
    """GHCN attribute fields are comma-separated: measurement,quality,source,obs-time."""
    if not attr:
        return ""
    parts = attr.split(",")
    return parts[1] if len(parts) > 1 else ""


def process_ghcn_csv(path: str) -> list[list]:
    """Return compact season rows: [wy, seasonSnowIn, max24hIn, days6in, days12in, maxDepthIn]."""
    by_wy: dict[int, dict] = defaultdict(
        lambda: {
            "days": 0,
            "snow": 0.0,
            "max24": 0.0,
            "d6": 0,
            "d12": 0,
            "maxDepth": 0.0,
            "mdsfs": [],
        }
    )

    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            date = row.get("DATE") or ""
            if len(date) < 7:
                continue
            year = int(date[:4])
            month = int(date[5:7])
            if month not in SEASON_MONTHS:
                continue
            wy = year + 1 if month >= 10 else year
            rec = by_wy[wy]
            rec["days"] += 1

            snow_raw = (row.get("SNOW") or "").strip()
            q = parse_attr_quality(row.get("SNOW_ATTRIBUTES"))
            used_daily = False
            if snow_raw and not q:
                try:
                    snow_mm = float(snow_raw)
                except ValueError:
                    snow_mm = None
                if snow_mm is not None and 0 <= snow_mm < 2000:
                    snow_in = snow_mm * MM_TO_IN
                    rec["snow"] += snow_in
                    used_daily = True
                    if snow_in > rec["max24"]:
                        rec["max24"] = snow_in
                    if snow_in >= 6:
                        rec["d6"] += 1
                    if snow_in >= 12:
                        rec["d12"] += 1

            # Multi-day snowfall totals only when the daily value is missing (avoids double-count)
            if not used_daily:
                mdsf = (row.get("MDSF") or "").strip()
                dasf = (row.get("DASF") or "").strip()
                if mdsf and dasf:
                    mq = parse_attr_quality(row.get("MDSF_ATTRIBUTES"))
                    if not mq:
                        try:
                            mdsf_in = float(mdsf) * MM_TO_IN
                            days = int(float(dasf))
                            if mdsf_in > 0 and days >= 2:
                                daily = mdsf_in / days
                                rec["snow"] += mdsf_in
                                if daily > rec["max24"]:
                                    rec["max24"] = daily
                                if mdsf_in >= 6:
                                    rec["d6"] += 1
                                if mdsf_in >= 12:
                                    rec["d12"] += 1
                        except ValueError:
                            pass

            snwd_raw = (row.get("SNWD") or "").strip()
            sq = parse_attr_quality(row.get("SNWD_ATTRIBUTES"))
            if snwd_raw and not sq:
                try:
                    depth_in = float(snwd_raw) * MM_TO_IN
                    if 0 <= depth_in < 800 and depth_in > rec["maxDepth"]:
                        rec["maxDepth"] = depth_in
                except ValueError:
                    pass

    rows = []
    for wy, rec in sorted(by_wy.items()):
        if rec["days"] < MIN_SEASON_DAYS:
            continue
        if rec["snow"] <= 0:
            continue
        rows.append(
            [
                wy,
                round(rec["snow"], 1),
                round(rec["max24"], 1),
                rec["d6"],
                rec["d12"],
                round(rec["maxDepth"], 1) if rec["maxDepth"] > 0 else None,
            ]
        )
    return rows


def fetch_ghcn_station(sid: str) -> str:
    dest = os.path.join(CACHE_DIR, "ghcn", f"{sid}.csv")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return dest
    url = f"{GHCN_ACCESS}/{sid}.csv"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = resp.read()
    with open(dest, "wb") as f:
        f.write(data)
    return dest


def fetch_json(url: str, timeout: int = 60, retries: int = 3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            if attempt == retries - 1:
                print(f"  AWDB failed: {url[:90]}... ({e})")
                return None
            time.sleep(1.5 * (attempt + 1))
    return None


def process_snotel_depth(triplet: str) -> list[list]:
    """Estimate season snowfall from positive daily SNWD gains."""
    t_str = urllib.parse.quote(triplet, safe=":,")
    url = (
        f"{AWDB_BASE}/data?stationTriplets={t_str}"
        f"&elements=SNWD&duration=DAILY&beginDate=1995-10-01&endDate=2026-10-01"
    )
    raw = fetch_json(url, timeout=90)
    if not raw:
        return []
    day_map: dict[str, float] = {}
    for block in raw[0].get("data", []):
        if block.get("stationElement", {}).get("elementCode") != "SNWD":
            continue
        for v in block.get("values", []):
            dt = v.get("date")
            val = v.get("value")
            if dt and val is not None and 0 <= float(val) < 1000:
                day_map[dt] = float(val)

    sorted_dates = sorted(day_map.keys())
    by_wy: dict[int, dict] = defaultdict(lambda: {"snow": 0.0, "max24": 0.0, "d6": 0, "d12": 0, "maxDepth": 0.0, "days": 0})
    prev = None
    for dt in sorted_dates:
        year = int(dt[:4])
        month = int(dt[5:7])
        if month not in SEASON_MONTHS:
            prev = day_map[dt]
            continue
        wy = year + 1 if month >= 10 else year
        snwd = day_map[dt]
        rec = by_wy[wy]
        rec["days"] += 1
        if snwd > rec["maxDepth"]:
            rec["maxDepth"] = snwd
        if prev is not None and 0 <= prev < 1000:
            gain = snwd - prev
            if 0 < gain <= 48:
                rec["snow"] += gain
                if gain > rec["max24"]:
                    rec["max24"] = gain
                if gain >= 6:
                    rec["d6"] += 1
                if gain >= 12:
                    rec["d12"] += 1
        prev = snwd

    rows = []
    for wy, rec in sorted(by_wy.items()):
        if rec["days"] < MIN_SEASON_DAYS or rec["snow"] <= 0:
            continue
        rows.append(
            [
                wy,
                round(rec["snow"], 1),
                round(rec["max24"], 1),
                rec["d6"],
                rec["d12"],
                round(rec["maxDepth"], 1) if rec["maxDepth"] > 0 else None,
            ]
        )
    return rows


def load_snotel_stations() -> list[dict]:
    path = os.path.join(PUBLIC_DATA, "snotel-stations.json")
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    out = []
    for s in raw:
        out.append(
            {
                "id": s["triplet"],
                "name": s["name"],
                "lat": s["lat"],
                "lon": s["lon"],
                "elevationM": s["elevation"] * 0.3048,
                "elevationFt": s["elevation"],
                "region": s["region"],
                "source": "snotel_depth",
            }
        )
    return out


def main() -> None:
    t0 = time.time()
    ensure_dirs()
    print("Loading western US resorts from OpenSkiData...")
    resorts = filter_resorts("US")
    print(f"  {len(resorts)} resorts")

    print("Loading GHCN station metadata...")
    meta, snow_span = download_ghcn_meta()
    ghcn_candidates = candidate_ghcn_stations(resorts, meta, snow_span)
    print(f"  {len(ghcn_candidates)} GHCN SNOW stations near resorts")

    # Which resorts have a GHCN match?
    ghcn_needed: set[str] = set()
    for r in resorts:
        matches = nearest_stations(
            r["lat"],
            r["lon"],
            r["baseM"],
            r["summitM"] or r["baseM"] + 500,
            ghcn_candidates,
            max_km=GHCN_MAX_KM,
            max_below_base_m=GHCN_MAX_BELOW_BASE_M,
            elev_key="elevationM",
            limit=3,
        )
        for _, _, st in matches:
            ghcn_needed.add(st["id"])

    print(f"Fetching {len(ghcn_needed)} GHCN station CSVs...")
    histories: dict[str, list] = {}
    stations_out: list[dict] = []
    ghcn_by_id = {s["id"]: s for s in ghcn_candidates}

    for i, sid in enumerate(sorted(ghcn_needed)):
        if (i + 1) % 25 == 0 or i == 0:
            print(f"  GHCN {i+1}/{len(ghcn_needed)} ({time.time() - t0:.0f}s)")
        try:
            path = fetch_ghcn_station(sid)
            rows = process_ghcn_csv(path)
        except Exception as e:
            print(f"  skip {sid}: {e}")
            continue
        if len(rows) < MIN_SEASONS:
            continue
        histories[sid] = rows
        st = ghcn_by_id[sid]
        stations_out.append(
            {
                "id": sid,
                "source": "ghcn",
                "name": st["name"],
                "lat": round(st["lat"], 4),
                "lon": round(st["lon"], 4),
                "elevationFt": st["elevationFt"],
            }
        )
        # Be polite to NCEI when downloading fresh files
        if not os.path.exists(os.path.join(CACHE_DIR, "ghcn", f"{sid}.csv")):
            time.sleep(0.15)

    # Resorts still without a qualifying GHCN history → SNOTEL depth fallback
    snotel = load_snotel_stations()
    snotel_needed: set[str] = set()
    for r in resorts:
        ghcn_ok = nearest_stations(
            r["lat"],
            r["lon"],
            r["baseM"],
            r["summitM"] or r["baseM"] + 500,
            [ghcn_by_id[s] for s in histories if s in ghcn_by_id],
            max_km=GHCN_MAX_KM,
            max_below_base_m=GHCN_MAX_BELOW_BASE_M,
            elev_key="elevationM",
            limit=1,
        )
        if ghcn_ok:
            continue
        for max_km in (30.0, 60.0):
            matches = nearest_stations(
                r["lat"],
                r["lon"],
                r["baseM"],
                r["summitM"] or r["baseM"] + 500,
                snotel,
                max_km=max_km,
                max_below_base_m=900.0,
                elev_key="elevationM",
                limit=2,
            )
            if matches:
                for _, _, st in matches:
                    snotel_needed.add(st["id"])
                break

    print(f"Fetching SNOTEL daily depth for {len(snotel_needed)} fallback stations...")
    snotel_by_id = {s["id"]: s for s in snotel}
    for i, triplet in enumerate(sorted(snotel_needed)):
        print(f"  SNOTEL {i+1}/{len(snotel_needed)} {triplet}")
        rows = process_snotel_depth(triplet)
        if len(rows) < 10:
            continue
        histories[triplet] = rows
        st = snotel_by_id[triplet]
        stations_out.append(
            {
                "id": triplet,
                "source": "snotel_depth",
                "name": st["name"],
                "lat": st["lat"],
                "lon": st["lon"],
                "elevationFt": st["elevationFt"],
            }
        )

    payload = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "NOAA NCEI GHCN-Daily SNOW; USDA NRCS SNOTEL SNWD gains (fallback)",
        "columns": ["wy", "seasonSnowIn", "max24hIn", "days6in", "days12in", "maxDepthIn"],
        "stations": stations_out,
        "histories": histories,
    }
    out_path = os.path.join(PUBLIC_DATA, "us-snowfall.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))
    print(f"Wrote {out_path}: {os.path.getsize(out_path)/1024:.1f} KB, {len(stations_out)} stations, {time.time()-t0:.0f}s")

    # Validation: Alta 2022-23
    alta = histories.get("USC00420072")
    if alta:
        wy2023 = next((r for r in alta if r[0] == 2023), None)
        print(f"Alta USC00420072 WY2023 season snowfall: {wy2023[1] if wy2023 else 'missing'} in (expect ~743–747)")
    else:
        print("WARNING: Alta USC00420072 not in output")


if __name__ == "__main__":
    main()
