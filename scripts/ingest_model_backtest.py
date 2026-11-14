#!/usr/bin/env python3
"""
Precompute Open-Meteo model skill vs SNOTEL observations at ski-area stations.

Uses:
  - Historical Forecast API  → lead day 0 (stitched near-term analysis)
  - Previous Runs API        → lead days 1, 3, 5
  - USDA AWDB daily SNOTEL   → observed SWE gain, SNWD gain, TMAX/TMIN

Writes:
  public/data/model-backtest/summary.json
  public/data/model-backtest/stations/<triplet>.json
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
from resorts_common import (  # noqa: E402
    CACHE_DIR,
    PUBLIC_DATA,
    ROOT,
    USER_AGENT,
    classify_us_region,
    ensure_dirs,
    filter_resorts,
    haversine_km,
)

AWDB_BASE = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1"
HF_BASE = "https://historical-forecast-api.open-meteo.com/v1/forecast"
PR_BASE = "https://previous-runs-api.open-meteo.com/v1/forecast"

OM_CACHE = os.path.join(CACHE_DIR, "open-meteo")
SNOTEL_CACHE = os.path.join(CACHE_DIR, "snotel-daily")
OUT_DIR = os.path.join(PUBLIC_DATA, "model-backtest")
STATIONS_OUT = os.path.join(OUT_DIR, "stations")

# Open-Meteo snowfall is cm of snow at fixed 7:1 (7 cm snow = 10 mm water).
# Convert cm snow → inches of water: (cm / 7) * (10 mm) / 25.4 mm/in = cm / 17.78
SNOWFALL_CM_TO_SWE_IN = 1.0 / 17.78
CM_TO_IN = 1.0 / 2.54
C_TO_F = lambda c: c * 9.0 / 5.0 + 32.0

SWE_NOISE_IN = 0.1
SWE_MAX_GAIN_IN = 8.0
POWDER_THRESHOLD_SWE_IN = 0.5  # ~6" snow at 12:1
SNOW_NOISE_IN = 0.5  # inches of depth
POWDER_THRESHOLD_SNOW_IN = 6.0
MIN_COVERAGE = 0.80
BOOTSTRAP_N = 1000
MAX_STATION_KM = 25.0
RESORTS_PER_REGION = 5
REQUEST_PAUSE_S = 0.35  # well under 600/min
WEIGHTED_CALLS_PER_DAY = 1.0 / 14.0  # ~14 days ≈ 1 API call (Open-Meteo docs)

LEADS = (0, 1, 3, 5)

MODELS: list[dict[str, Any]] = [
    {
        "id": "best_match",
        "label": "Open-Meteo Best Match",
        "resolution": "varies",
        "leads": [0, 1, 3, 5],
        "hasSnowDepth": True,
        "notes": "Auto-selects the highest-resolution local model for each grid cell.",
    },
    {
        "id": "ecmwf_ifs",
        "label": "ECMWF IFS HRES 9 km",
        "resolution": "9 km",
        "leads": [0, 1, 3, 5],
        "hasSnowDepth": True,
        "notes": "European Centre global high-resolution model.",
    },
    {
        "id": "ecmwf_aifs025_single",
        "label": "ECMWF AIFS 0.25°",
        "resolution": "25 km",
        "leads": [0],  # snowfall at longer leads often empty in archive
        "hasSnowDepth": False,
        "notes": "AI weather model. Archive starts 2025; longer leads often lack snowfall.",
        "snowLeads": [0],
        "tempLeads": [0, 1, 3, 5],
    },
    {
        "id": "gfs_seamless",
        "label": "NCEP GFS Seamless",
        "resolution": "~13 km",
        "leads": [0, 1, 3, 5],
        "hasSnowDepth": True,
        "notes": "NOAA global forecast system (seamless).",
    },
    {
        "id": "ncep_hrrr_conus",
        "label": "NCEP HRRR CONUS",
        "resolution": "3 km",
        "leads": [0, 1],
        "hasSnowDepth": True,
        "notes": "Hourly CONUS regional model. ~48 h horizon. Discontinued 2026-11-30.",
    },
    {
        "id": "ncep_nbm_conus",
        "label": "NCEP NBM CONUS",
        "resolution": "3 km",
        "leads": [0, 1, 3, 5],
        "hasSnowDepth": False,
        "notes": "Statistical blend of many models (not a single physics model).",
    },
    {
        "id": "gem_seamless",
        "label": "CMC GEM Seamless",
        "resolution": "~10–15 km",
        "leads": [0, 1, 3, 5],
        "hasSnowDepth": True,
        "notes": "Canadian global / regional seamless blend.",
    },
    {
        "id": "icon_seamless",
        "label": "DWD ICON Seamless",
        "resolution": "~11 km",
        "leads": [0, 1, 3, 5],
        "hasSnowDepth": True,
        "notes": "German Weather Service global ICON seamless.",
    },
    {
        "id": "ukmo_global_deterministic_10km",
        "label": "UK Met Office Global 10 km",
        "resolution": "10 km",
        "leads": [0, 1, 3, 5],
        "hasSnowDepth": False,
        "notes": "UK Met Office global deterministic model.",
    },
]

REGION_ORDER = [
    "PNW",
    "SIERRA",
    "GREAT_BASIN",
    "NORTHERN_ROCKIES",
    "CENTRAL_ROCKIES",
    "SOUTHWEST",
]

REGION_LABELS = {
    "PNW": "PNW & Cascades",
    "SIERRA": "Sierra Nevada",
    "GREAT_BASIN": "Great Basin & Wasatch",
    "NORTHERN_ROCKIES": "Northern Rockies",
    "CENTRAL_ROCKIES": "Central Rockies",
    "SOUTHWEST": "Southwest",
    "ALL": "All regions",
}


# ─── helpers ─────────────────────────────────────────────────────────────────


def winter_range(end_year: int) -> tuple[date, date]:
    """Winter ending in end_year: Nov 1 (end_year-1) → Apr 30 (end_year)."""
    return date(end_year - 1, 11, 1), date(end_year, 4, 30)


def daterange(start: date, end: date) -> list[str]:
    out = []
    d = start
    while d <= end:
        out.append(d.isoformat())
        d += timedelta(days=1)
    return out


def utc_offset_hours(lon: float) -> int:
    """Approx local-standard offset from UTC (hours behind = negative)."""
    return int(round(lon / 15.0))


def ensure_cache_dirs() -> None:
    ensure_dirs()
    os.makedirs(OM_CACHE, exist_ok=True)
    os.makedirs(SNOTEL_CACHE, exist_ok=True)
    os.makedirs(STATIONS_OUT, exist_ok=True)


def fetch_json(url: str, timeout: int = 90, retries: int = 3) -> Any:
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status == 429:
                    raise urllib.error.HTTPError(url, 429, "rate limited", resp.headers, None)
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code == 429:
                raise
            if e.code >= 500 and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
        except Exception as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
    raise last_err  # type: ignore[misc]


def cache_path(folder: str, key: str) -> str:
    safe = key.replace("/", "_").replace(":", "_")
    return os.path.join(folder, f"{safe}.json")


def load_or_fetch(folder: str, key: str, url: str, dry_run: bool = False) -> Any | None:
    path = cache_path(folder, key)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    if dry_run:
        return None
    time.sleep(REQUEST_PAUSE_S)
    data = fetch_json(url)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return data


# ─── station selection ───────────────────────────────────────────────────────


def select_stations(max_stations: int | None = None) -> list[dict]:
    stations_path = os.path.join(PUBLIC_DATA, "snotel-stations.json")
    with open(stations_path, "r", encoding="utf-8") as f:
        all_snotel = json.load(f)

    snotel_pts = [
        s
        for s in all_snotel
        if s.get("state") != "AK" and s.get("lat") is not None and s.get("lon") is not None
    ]

    resorts = [r for r in filter_resorts("US") if r["state"] != "AK"]
    for r in resorts:
        r["region"] = classify_us_region(r["state"], r["lat"], r["lon"])

    by_region: dict[str, list[dict]] = defaultdict(list)
    for r in resorts:
        by_region[r["region"]].append(r)

    selected: list[dict] = []
    used_triplets: set[str] = set()

    for region in REGION_ORDER:
        candidates = sorted(by_region.get(region, []), key=lambda x: -x["verticalM"])
        picked = 0
        for resort in candidates:
            if picked >= RESORTS_PER_REGION:
                break
            best = None
            best_km = 1e9
            for st in snotel_pts:
                if st["triplet"] in used_triplets:
                    continue
                km = haversine_km(resort["lat"], resort["lon"], st["lat"], st["lon"])
                if km < best_km:
                    best_km = km
                    best = st
            if best is None or best_km > MAX_STATION_KM:
                continue
            used_triplets.add(best["triplet"])
            selected.append(
                {
                    "triplet": best["triplet"],
                    "name": best["name"],
                    "state": best["state"],
                    "region": best.get("region") or region,
                    "lat": best["lat"],
                    "lon": best["lon"],
                    "elevation": best["elevation"],
                    "elevationM": round(best["elevation"] * 0.3048),
                    "nearResort": resort["name"],
                    "nearResortVerticalM": resort["verticalM"],
                    "distanceKm": round(best_km, 1),
                }
            )
            picked += 1

    selected.sort(key=lambda s: (REGION_ORDER.index(s["region"]) if s["region"] in REGION_ORDER else 99, s["name"]))
    if max_stations is not None:
        selected = selected[:max_stations]
    return selected


# ─── SNOTEL daily ────────────────────────────────────────────────────────────


def fetch_snotel_daily(triplet: str, start: date, end: date, dry_run: bool = False) -> dict[str, dict]:
    key = f"{triplet}_{start.isoformat()}_{end.isoformat()}"
    url = (
        f"{AWDB_BASE}/data?stationTriplets={urllib.parse.quote(triplet, safe=':,')}"
        f"&elements=WTEQ,SNWD,TAVG,TMAX,TMIN"
        f"&duration=DAILY&beginDate={start.isoformat()}&endDate={end.isoformat()}"
    )
    # AWDB is not rate-limited like Open-Meteo; still cache
    path = cache_path(SNOTEL_CACHE, key)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    else:
        if dry_run:
            return {}
        time.sleep(0.15)
        raw = fetch_json(url, timeout=120)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(raw, f)

    day_map: dict[str, dict] = {}
    st_block = raw[0] if isinstance(raw, list) and raw else None
    if not st_block or not st_block.get("data"):
        return {}

    for block in st_block["data"]:
        code = (block.get("stationElement") or {}).get("elementCode")
        if not code:
            continue
        for v in block.get("values") or []:
            if not v.get("date") or v.get("value") is None:
                continue
            d = v["date"][:10]
            if d not in day_map:
                day_map[d] = {"date": d}
            day_map[d][code] = float(v["value"])

    # Compute daily gains with QC
    sorted_dates = sorted(day_map.keys())
    prev_swe: float | None = None
    prev_snwd: float | None = None
    out: dict[str, dict] = {}

    for d in sorted_dates:
        row = day_map[d]
        swe = row.get("WTEQ")
        snwd = row.get("SNWD")
        tmax = row.get("TMAX")
        tmin = row.get("TMIN")
        tavg = row.get("TAVG")
        if tavg is None and tmax is not None and tmin is not None:
            tavg = (tmax + tmin) / 2.0

        swe_gain: float | None = None
        if swe is not None and prev_swe is not None:
            raw_gain = swe - prev_swe
            if raw_gain > SWE_MAX_GAIN_IN:
                swe_gain = None  # drop bad jump
            elif raw_gain < SWE_NOISE_IN:
                swe_gain = 0.0
            else:
                swe_gain = round(raw_gain, 2)

        snwd_gain: float | None = None
        if snwd is not None and prev_snwd is not None:
            raw_g = snwd - prev_snwd
            if 0 < raw_g <= 48:
                snwd_gain = round(raw_g, 1)
            elif raw_g <= 0:
                snwd_gain = 0.0
            else:
                snwd_gain = None

        # Temp QC
        if tmax is not None and tmin is not None and tmax < tmin:
            tmax = tmin = None
        if tmax is not None and (tmax < -80 or tmax > 120):
            tmax = None
        if tmin is not None and (tmin < -80 or tmin > 100):
            tmin = None

        out[d] = {
            "date": d,
            "swe": swe,
            "snwd": snwd,
            "sweGain": swe_gain,
            "snwdGain": snwd_gain,
            "tmax": tmax,
            "tmin": tmin,
            "tavg": tavg,
        }
        if swe is not None:
            prev_swe = swe
        if snwd is not None:
            prev_snwd = snwd

    return out


# ─── Open-Meteo ──────────────────────────────────────────────────────────────


def om_hf_url(lat: float, lon: float, elev_m: int, start: date, end: date, model: str) -> str:
    params = {
        "latitude": lat,
        "longitude": lon,
        "elevation": elev_m,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "hourly": "temperature_2m,snowfall,snow_depth",
        "models": model,
        "timezone": "GMT",
        "temperature_unit": "celsius",
        "precipitation_unit": "mm",
    }
    return f"{HF_BASE}?{urllib.parse.urlencode(params)}"


def om_pr_url(lat: float, lon: float, elev_m: int, start: date, end: date, model: str) -> str:
    # Pull days 1,3,5 for snow + temp (and day0 is from HF)
    hourly = ",".join(
        [
            "snowfall_previous_day1",
            "snowfall_previous_day3",
            "snowfall_previous_day5",
            "temperature_2m_previous_day1",
            "temperature_2m_previous_day3",
            "temperature_2m_previous_day5",
        ]
    )
    params = {
        "latitude": lat,
        "longitude": lon,
        "elevation": elev_m,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "hourly": hourly,
        "models": model,
        "timezone": "GMT",
        "temperature_unit": "celsius",
        "precipitation_unit": "mm",
    }
    return f"{PR_BASE}?{urllib.parse.urlencode(params)}"


def aggregate_hourly_to_daily(
    hourly: dict,
    lon: float,
    *,
    snow_key: str | None,
    temp_key: str | None,
    depth_key: str | None = None,
) -> dict[str, dict]:
    """Shift UTC hours by local-standard offset and aggregate to local calendar days."""
    times = hourly.get("time") or []
    if not times:
        return {}
    offset = utc_offset_hours(lon)  # e.g. -7 for Utah
    snow = hourly.get(snow_key) if snow_key else None
    temp = hourly.get(temp_key) if temp_key else None
    depth = hourly.get(depth_key) if depth_key else None

    buckets: dict[str, dict] = defaultdict(
        lambda: {"snow_cm": 0.0, "snow_n": 0, "temps": [], "depths": [], "depth_n": 0}
    )

    for i, tstr in enumerate(times):
        # tstr like 2025-01-10T00:00
        try:
            dt = datetime.fromisoformat(tstr)
        except ValueError:
            continue
        local = dt + timedelta(hours=offset)
        day = local.date().isoformat()
        b = buckets[day]
        if snow is not None and i < len(snow) and snow[i] is not None:
            b["snow_cm"] += float(snow[i])
            b["snow_n"] += 1
        if temp is not None and i < len(temp) and temp[i] is not None:
            b["temps"].append(float(temp[i]))
        if depth is not None and i < len(depth) and depth[i] is not None:
            b["depths"].append(float(depth[i]))
            b["depth_n"] += 1

    out: dict[str, dict] = {}
    for day, b in buckets.items():
        swe_in = round(b["snow_cm"] * SNOWFALL_CM_TO_SWE_IN, 3) if b["snow_n"] > 0 else None
        # Apply same noise floor as observations for fair comparison
        if swe_in is not None and swe_in < SWE_NOISE_IN:
            swe_in = 0.0
        # Open-Meteo snowfall (cm of snow at fixed 7:1) → inches of new snow
        snow_in = round(b["snow_cm"] * CM_TO_IN, 2) if b["snow_n"] > 0 else None
        if snow_in is not None and snow_in < SNOW_NOISE_IN:
            snow_in = 0.0
        tmax_f = round(C_TO_F(max(b["temps"])), 1) if b["temps"] else None
        tmin_f = round(C_TO_F(min(b["temps"])), 1) if b["temps"] else None
        # snow depth: take last available hour of day (cm → in)
        snwd_in = round(b["depths"][-1] * CM_TO_IN, 1) if b["depths"] else None
        out[day] = {
            "sweGain": swe_in,
            "snowIn": snow_in,
            "tmax": tmax_f,
            "tmin": tmin_f,
            "snwd": snwd_in,
            "hours": b["snow_n"],
        }
    return out


def parse_hf(raw: dict, lon: float) -> dict[str, dict]:
    if not raw or "hourly" not in raw:
        return {}
    return aggregate_hourly_to_daily(
        raw["hourly"],
        lon,
        snow_key="snowfall",
        temp_key="temperature_2m",
        depth_key="snow_depth",
    )


def parse_pr(raw: dict, lon: float) -> dict[int, dict[str, dict]]:
    """Return {lead: {date: daily}} for leads 1,3,5."""
    if not raw or "hourly" not in raw:
        return {}
    result = {}
    for lead in (1, 3, 5):
        result[lead] = aggregate_hourly_to_daily(
            raw["hourly"],
            lon,
            snow_key=f"snowfall_previous_day{lead}",
            temp_key=f"temperature_2m_previous_day{lead}",
            depth_key=None,
        )
    return result


# ─── metrics ─────────────────────────────────────────────────────────────────


def pearson(xs: list[float], ys: list[float]) -> float | None:
    n = len(xs)
    if n < 5:
        return None
    mx = sum(xs) / n
    my = sum(ys) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    dy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if dx == 0 or dy == 0:
        return None
    return num / (dx * dy)


def compute_metrics(
    pairs: list[
        tuple[
            str,
            float | None,
            float | None,
            float | None,
            float | None,
            float | None,
            float | None,
            float | None,
            float | None,
        ]
    ],
) -> dict:
    """
    pairs: (date, obs_swe, fcst_swe, obs_snow, fcst_snow, obs_tmax, fcst_tmax, obs_tmin, fcst_tmin)
    """
    wet_errs: list[float] = []
    snow_errs: list[float] = []
    obs_swe_total = 0.0
    fcst_swe_total = 0.0
    obs_snow_total = 0.0
    fcst_snow_total = 0.0
    hits = misses = false_alarms = 0
    snow_hits = snow_misses = snow_false_alarms = 0

    tmax_errs: list[float] = []
    tmin_errs: list[float] = []
    tmax_bias: list[float] = []
    tmin_bias: list[float] = []

    n_days = 0
    for _d, o_s, f_s, o_sn, f_sn, o_tx, f_tx, o_tn, f_tn in pairs:
        n_days += 1
        if o_s is not None and f_s is not None:
            obs_swe_total += o_s
            fcst_swe_total += f_s
            if o_s >= SWE_NOISE_IN or f_s >= SWE_NOISE_IN:
                wet_errs.append(abs(f_s - o_s))
            o_yes = o_s >= POWDER_THRESHOLD_SWE_IN
            f_yes = f_s >= POWDER_THRESHOLD_SWE_IN
            if o_yes and f_yes:
                hits += 1
            elif o_yes and not f_yes:
                misses += 1
            elif not o_yes and f_yes:
                false_alarms += 1

        if o_sn is not None and f_sn is not None:
            obs_snow_total += o_sn
            fcst_snow_total += f_sn
            if o_sn >= SNOW_NOISE_IN or f_sn >= SNOW_NOISE_IN:
                snow_errs.append(abs(f_sn - o_sn))
            o_yes = o_sn >= POWDER_THRESHOLD_SNOW_IN
            f_yes = f_sn >= POWDER_THRESHOLD_SNOW_IN
            if o_yes and f_yes:
                snow_hits += 1
            elif o_yes and not f_yes:
                snow_misses += 1
            elif not o_yes and f_yes:
                snow_false_alarms += 1

        if o_tx is not None and f_tx is not None:
            tmax_errs.append(abs(f_tx - o_tx))
            tmax_bias.append(f_tx - o_tx)
        if o_tn is not None and f_tn is not None:
            tmin_errs.append(abs(f_tn - o_tn))
            tmin_bias.append(f_tn - o_tn)

    def contingency(h: int, m: int, fa: int) -> tuple[float | None, float | None, float | None]:
        pod = h / (h + m) if (h + m) else None
        far = fa / (h + fa) if (h + fa) else None
        csi = h / (h + m + fa) if (h + m + fa) else None
        return pod, far, csi

    pod, far, csi = contingency(hits, misses, false_alarms)
    snow_pod, snow_far, snow_csi = contingency(snow_hits, snow_misses, snow_false_alarms)
    swe_bias_pct = ((fcst_swe_total / obs_swe_total) - 1.0) * 100.0 if obs_swe_total > 0 else None
    snow_bias_pct = ((fcst_snow_total / obs_snow_total) - 1.0) * 100.0 if obs_snow_total > 0 else None

    return {
        "nDays": n_days,
        "nWetDays": len(wet_errs),
        "nSnowDays": len(snow_errs),
        "sweMaeIn": round(sum(wet_errs) / len(wet_errs), 3) if wet_errs else None,
        "sweBiasPct": round(swe_bias_pct, 1) if swe_bias_pct is not None else None,
        "obsSweTotalIn": round(obs_swe_total, 2),
        "fcstSweTotalIn": round(fcst_swe_total, 2),
        "snowMaeIn": round(sum(snow_errs) / len(snow_errs), 2) if snow_errs else None,
        "snowBiasPct": round(snow_bias_pct, 1) if snow_bias_pct is not None else None,
        "obsSnowTotalIn": round(obs_snow_total, 1),
        "fcstSnowTotalIn": round(fcst_snow_total, 1),
        "pod": round(pod, 3) if pod is not None else None,
        "far": round(far, 3) if far is not None else None,
        "csi": round(csi, 3) if csi is not None else None,
        "snowPod": round(snow_pod, 3) if snow_pod is not None else None,
        "snowFar": round(snow_far, 3) if snow_far is not None else None,
        "snowCsi": round(snow_csi, 3) if snow_csi is not None else None,
        "hits": hits,
        "misses": misses,
        "falseAlarms": false_alarms,
        "tmaxMaeF": round(sum(tmax_errs) / len(tmax_errs), 2) if tmax_errs else None,
        "tminMaeF": round(sum(tmin_errs) / len(tmin_errs), 2) if tmin_errs else None,
        "tmaxBiasF": round(sum(tmax_bias) / len(tmax_bias), 2) if tmax_bias else None,
        "tminBiasF": round(sum(tmin_bias) / len(tmin_bias), 2) if tmin_bias else None,
        "nTempDays": len(tmax_errs),
    }


def bootstrap_ties(
    model_day_errors: dict[str, dict[str, list[float]]],
    n: int = BOOTSTRAP_N,
) -> set[str]:
    """
    model_day_errors[model][date] = list of abs errors across stations that day.
    Returns set of model ids tied with the best (95% CI of MAE difference includes 0).
    """
    if not model_day_errors:
        return set()
    # Mean MAE per model on shared dates
    all_dates = sorted(set().union(*(d.keys() for d in model_day_errors.values())))
    if len(all_dates) < 10:
        return set()

    def mae_for(mid: str, dates: list[str]) -> float:
        errs = []
        for d in dates:
            errs.extend(model_day_errors[mid].get(d, []))
        return sum(errs) / len(errs) if errs else 1e9

    models = list(model_day_errors.keys())
    point = {m: mae_for(m, all_dates) for m in models}
    best = min(point, key=point.get)  # type: ignore[arg-type]
    best_mae = point[best]
    tied = {best}

    rng = random.Random(42)
    for m in models:
        if m == best:
            continue
        diffs = []
        for _ in range(n):
            sample = [rng.choice(all_dates) for _ in all_dates]
            diffs.append(mae_for(m, sample) - mae_for(best, sample))
        diffs.sort()
        lo = diffs[int(0.025 * n)]
        hi = diffs[int(0.975 * n)]
        if lo <= 0 <= hi:
            tied.add(m)
        # Also treat near-identical point estimates as tied
        if abs(point[m] - best_mae) < 1e-6:
            tied.add(m)
    return tied


# ─── lag check ───────────────────────────────────────────────────────────────


def lag_correlation_report(
    obs_by_date: dict[str, dict],
    fcst_by_date: dict[str, dict],
) -> dict[int, float | None]:
    """Pearson of obs sweGain vs model sweGain at offsets -1,0,+1."""
    out: dict[int, float | None] = {}
    for lag in (-1, 0, 1):
        xs: list[float] = []
        ys: list[float] = []
        for d, o in obs_by_date.items():
            if o.get("sweGain") is None:
                continue
            try:
                dd = date.fromisoformat(d) + timedelta(days=lag)
            except ValueError:
                continue
            f = fcst_by_date.get(dd.isoformat())
            if not f or f.get("sweGain") is None:
                continue
            if o["sweGain"] < SWE_NOISE_IN and f["sweGain"] < SWE_NOISE_IN:
                continue
            xs.append(o["sweGain"])
            ys.append(f["sweGain"])
        out[lag] = pearson(xs, ys)
    return out


# ─── main pipeline ───────────────────────────────────────────────────────────


def estimate_budget(n_stations: int, n_models: int, n_winters: int) -> dict:
    days_per_winter = 181  # Nov–Apr approx
    weighted_per_req = days_per_winter * WEIGHTED_CALLS_PER_DAY
    # 2 APIs per station×model×winter
    n_req = n_stations * n_models * n_winters * 2
    return {
        "requests": n_req,
        "weightedCalls": round(n_req * weighted_per_req),
        "daysPerWinter": days_per_winter,
        "weightedPerRequest": round(weighted_per_req, 1),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest Open-Meteo vs SNOTEL model backtest")
    parser.add_argument("--winters", default="2026", help="Comma-separated winter end years (default: 2026)")
    parser.add_argument("--max-stations", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-lag-check", action="store_true")
    args = parser.parse_args()

    winters = [int(x.strip()) for x in args.winters.split(",") if x.strip()]
    ensure_cache_dirs()

    print("Selecting ski-area SNOTEL stations…")
    stations = select_stations(args.max_stations)
    print(f"  {len(stations)} stations:")
    for s in stations:
        print(
            f"    {s['triplet']:16s} {s['region']:18s} "
            f"{s['elevation']:5d}ft  near {s['nearResort']} ({s['distanceKm']} km)"
        )

    budget = estimate_budget(len(stations), len(MODELS), len(winters))
    print(
        f"\nAPI budget estimate: {budget['requests']} requests ≈ "
        f"{budget['weightedCalls']} weighted calls "
        f"({budget['weightedPerRequest']} each × {budget['daysPerWinter']} days)"
    )
    if args.dry_run:
        print("Dry run — no fetches. Exiting.")
        return 0

    # ── fetch observations + model data ──
    # Structure:
    #   obs[triplet][winter][date] = day dict
    #   model_daily[triplet][winter][model_id][lead][date] = day dict
    obs: dict[str, dict[int, dict[str, dict]]] = {}
    model_daily: dict[str, dict[int, dict[str, dict[int, dict[str, dict]]]]] = {}
    lag_checks: list[dict] = []

    rate_limited = False

    for winter in winters:
        start, end = winter_range(winter)
        print(f"\n=== Winter {winter - 1}-{str(winter)[2:]} ({start} → {end}) ===")

        for st in stations:
            trip = st["triplet"]
            print(f"\n  {trip} ({st['nearResort']})")
            obs.setdefault(trip, {})
            model_daily.setdefault(trip, {}).setdefault(winter, {})

            try:
                obs[trip][winter] = fetch_snotel_daily(trip, start, end)
            except Exception as e:
                print(f"    SNOTEL fetch failed: {e}")
                obs[trip][winter] = {}
            print(f"    SNOTEL days: {len(obs[trip][winter])}")

            for model in MODELS:
                mid = model["id"]
                model_daily[trip][winter].setdefault(mid, {})
                try:
                    # Historical Forecast (day 0)
                    hf_key = f"hf_{mid}_{trip}_{start}_{end}"
                    hf_url = om_hf_url(st["lat"], st["lon"], st["elevationM"], start, end, mid)
                    hf_raw = load_or_fetch(OM_CACHE, hf_key, hf_url)
                    day0 = parse_hf(hf_raw or {}, st["lon"])
                    model_daily[trip][winter][mid][0] = day0

                    # Previous Runs (days 1/3/5) — only if model supports any of them
                    if any(L in model["leads"] for L in (1, 3, 5)):
                        pr_key = f"pr_{mid}_{trip}_{start}_{end}"
                        pr_url = om_pr_url(st["lat"], st["lon"], st["elevationM"], start, end, mid)
                        pr_raw = load_or_fetch(OM_CACHE, pr_key, pr_url)
                        pr_days = parse_pr(pr_raw or {}, st["lon"])
                        for lead, days in pr_days.items():
                            model_daily[trip][winter][mid][lead] = days
                    else:
                        for lead in (1, 3, 5):
                            model_daily[trip][winter][mid].setdefault(lead, {})

                    n0 = sum(1 for d in day0.values() if d.get("sweGain") is not None)
                    print(f"    {mid}: day0 snow days={n0}")

                    # Lag check once per winter using first model with data
                    if (
                        not args.skip_lag_check
                        and mid == "gfs_seamless"
                        and winter == winters[0]
                        and trip == stations[0]["triplet"]
                    ):
                        lags = lag_correlation_report(obs[trip][winter], day0)
                        lag_checks.append({"triplet": trip, "model": mid, "winter": winter, "corr": lags})
                        print(f"    lag check (obs vs {mid} day0): {lags}")

                except urllib.error.HTTPError as e:
                    if e.code == 429:
                        print("\n!!! Rate limited by Open-Meteo (HTTP 429). Stopping. Re-run to resume from cache.")
                        rate_limited = True
                        break
                    print(f"    {mid} failed: {e}")
                except Exception as e:
                    print(f"    {mid} failed: {e}")

            if rate_limited:
                break
        if rate_limited:
            break

    # ── build leaderboards ──
    print("\nComputing metrics…")
    leaderboard: list[dict] = []
    per_station_metrics: list[dict] = []
    # For bootstrap: model → date → list of wet-day abs errors
    # keyed by (winter, lead, region)

    for winter in winters:
        start, end = winter_range(winter)
        all_dates = daterange(start, end)

        for lead in LEADS:
            eligible_models = [m for m in MODELS if lead in m["leads"]]
            # AIFS snow only at day 0
            snow_models = []
            for m in eligible_models:
                snow_leads = m.get("snowLeads", m["leads"])
                if lead in snow_leads:
                    snow_models.append(m)

            for region in ["ALL"] + REGION_ORDER:
                region_stations = [
                    s for s in stations if region == "ALL" or s["region"] == region
                ]
                if not region_stations:
                    continue

                # Coverage check per model
                coverage: dict[str, float] = {}
                for m in snow_models:
                    mid = m["id"]
                    have = 0
                    total = 0
                    for st in region_stations:
                        obs_days = obs.get(st["triplet"], {}).get(winter, {})
                        fcst = (
                            model_daily.get(st["triplet"], {})
                            .get(winter, {})
                            .get(mid, {})
                            .get(lead, {})
                        )
                        for d in all_dates:
                            o = obs_days.get(d)
                            if not o or o.get("sweGain") is None:
                                continue
                            total += 1
                            f = fcst.get(d)
                            if f and f.get("sweGain") is not None:
                                have += 1
                    coverage[mid] = (have / total) if total else 0.0

                listed = [m for m in snow_models if coverage.get(m["id"], 0) >= MIN_COVERAGE]
                insufficient = [m for m in snow_models if coverage.get(m["id"], 0) < MIN_COVERAGE]

                # Common-sample pairs: station-days where ALL listed models + obs have data
                # Also collect day-keyed errors for bootstrap
                day_errors: dict[str, dict[str, list[float]]] = {m["id"]: defaultdict(list) for m in listed}
                pairs_by_model: dict[str, list] = {m["id"]: [] for m in listed}

                for st in region_stations:
                    obs_days = obs.get(st["triplet"], {}).get(winter, {})
                    for d in all_dates:
                        o = obs_days.get(d)
                        if not o or o.get("sweGain") is None:
                            continue
                        # Check all listed models have snow that day
                        fcsts = {}
                        ok = True
                        for m in listed:
                            f = (
                                model_daily.get(st["triplet"], {})
                                .get(winter, {})
                                .get(m["id"], {})
                                .get(lead, {})
                                .get(d)
                            )
                            if not f or f.get("sweGain") is None:
                                ok = False
                                break
                            fcsts[m["id"]] = f
                        if not ok:
                            continue
                        for m in listed:
                            f = fcsts[m["id"]]
                            pairs_by_model[m["id"]].append(
                                (
                                    d,
                                    o["sweGain"],
                                    f["sweGain"],
                                    o.get("snwdGain"),
                                    f.get("snowIn"),
                                    o.get("tmax"),
                                    f.get("tmax"),
                                    o.get("tmin"),
                                    f.get("tmin"),
                                )
                            )
                            if o["sweGain"] >= SWE_NOISE_IN or f["sweGain"] >= SWE_NOISE_IN:
                                day_errors[m["id"]][d].append(abs(f["sweGain"] - o["sweGain"]))

                metrics_by_model = {
                    mid: compute_metrics(pairs) for mid, pairs in pairs_by_model.items()
                }

                # Rank by SWE MAE (lower better); None last
                ranked = sorted(
                    listed,
                    key=lambda m: (
                        metrics_by_model[m["id"]]["sweMaeIn"] is None,
                        metrics_by_model[m["id"]]["sweMaeIn"] or 99,
                    ),
                )
                tied = bootstrap_ties(day_errors) if ranked else set()

                for rank, m in enumerate(ranked, start=1):
                    mid = m["id"]
                    met = metrics_by_model[mid]
                    leaderboard.append(
                        {
                            "winter": winter,
                            "lead": lead,
                            "region": region,
                            "modelId": mid,
                            "rank": rank,
                            "tiedForFirst": mid in tied,
                            "coverage": round(coverage.get(mid, 0), 3),
                            "insufficientData": False,
                            **met,
                        }
                    )

                for m in insufficient:
                    leaderboard.append(
                        {
                            "winter": winter,
                            "lead": lead,
                            "region": region,
                            "modelId": m["id"],
                            "rank": None,
                            "tiedForFirst": False,
                            "coverage": round(coverage.get(m["id"], 0), 3),
                            "insufficientData": True,
                            "nDays": 0,
                            "nWetDays": 0,
                            "nSnowDays": 0,
                            "sweMaeIn": None,
                            "sweBiasPct": None,
                            "obsSweTotalIn": None,
                            "fcstSweTotalIn": None,
                            "snowMaeIn": None,
                            "snowBiasPct": None,
                            "obsSnowTotalIn": None,
                            "fcstSnowTotalIn": None,
                            "pod": None,
                            "far": None,
                            "csi": None,
                            "snowPod": None,
                            "snowFar": None,
                            "snowCsi": None,
                            "hits": 0,
                            "misses": 0,
                            "falseAlarms": 0,
                            "tmaxMaeF": None,
                            "tminMaeF": None,
                            "tmaxBiasF": None,
                            "tminBiasF": None,
                            "nTempDays": 0,
                        }
                    )

        # Per-station metrics (ALL models that have day0, at each lead)
        for st in stations:
            for lead in LEADS:
                for m in MODELS:
                    if lead not in m["leads"]:
                        continue
                    snow_leads = m.get("snowLeads", m["leads"])
                    if lead not in snow_leads:
                        continue
                    mid = m["id"]
                    obs_days = obs.get(st["triplet"], {}).get(winter, {})
                    fcst = (
                        model_daily.get(st["triplet"], {})
                        .get(winter, {})
                        .get(mid, {})
                        .get(lead, {})
                    )
                    pairs = []
                    for d, o in obs_days.items():
                        if o.get("sweGain") is None:
                            continue
                        f = fcst.get(d)
                        if not f or f.get("sweGain") is None:
                            continue
                        pairs.append(
                            (
                                d,
                                o["sweGain"],
                                f["sweGain"],
                                o.get("snwdGain"),
                                f.get("snowIn"),
                                o.get("tmax"),
                                f.get("tmax"),
                                o.get("tmin"),
                                f.get("tmin"),
                            )
                        )
                    met = compute_metrics(pairs)
                    per_station_metrics.append(
                        {
                            "triplet": st["triplet"],
                            "winter": winter,
                            "lead": lead,
                            "modelId": mid,
                            **met,
                        }
                    )

    # ── write per-station daily files ──
    print("Writing station files…")
    for st in stations:
        trip = st["triplet"]
        payload: dict[str, Any] = {
            "triplet": trip,
            "meta": st,
            "winters": {},
        }
        for winter in winters:
            start, end = winter_range(winter)
            dates = daterange(start, end)
            obs_days = obs.get(trip, {}).get(winter, {})
            models_out: dict[str, Any] = {}
            for m in MODELS:
                mid = m["id"]
                leads_out: dict[str, Any] = {}
                for lead in LEADS:
                    if lead not in m["leads"]:
                        continue
                    fcst = model_daily.get(trip, {}).get(winter, {}).get(mid, {}).get(lead, {})
                    swe = []
                    snow = []
                    tmax = []
                    tmin = []
                    snwd = []
                    for d in dates:
                        f = fcst.get(d) or {}
                        swe.append(f.get("sweGain"))
                        snow.append(f.get("snowIn"))
                        tmax.append(f.get("tmax"))
                        tmin.append(f.get("tmin"))
                        snwd.append(f.get("snwd") if lead == 0 else None)
                    leads_out[str(lead)] = {
                        "sweGain": swe,
                        "snowIn": snow,
                        "tmax": tmax,
                        "tmin": tmin,
                        "snwd": snwd if lead == 0 else None,
                    }
                models_out[mid] = leads_out

            obs_swe = []
            obs_snwd_gain = []
            obs_tmax = []
            obs_tmin = []
            obs_swe_level = []
            for d in dates:
                o = obs_days.get(d) or {}
                obs_swe.append(o.get("sweGain"))
                obs_snwd_gain.append(o.get("snwdGain"))
                obs_tmax.append(o.get("tmax"))
                obs_tmin.append(o.get("tmin"))
                obs_swe_level.append(o.get("swe"))

            payload["winters"][str(winter)] = {
                "dates": dates,
                "obs": {
                    "sweGain": obs_swe,
                    "snwdGain": obs_snwd_gain,
                    "tmax": obs_tmax,
                    "tmin": obs_tmin,
                    "swe": obs_swe_level,
                },
                "models": models_out,
            }

        safe = trip.replace(":", "_")
        path = os.path.join(STATIONS_OUT, f"{safe}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, separators=(",", ":"))
        print(f"  wrote {path}")

    # ── summary ──
    summary = {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "methodology": {
            "winterMonths": "Nov–Apr",
            "leads": list(LEADS),
            "sweNoiseIn": SWE_NOISE_IN,
            "sweMaxGainIn": SWE_MAX_GAIN_IN,
            "powderThresholdSweIn": POWDER_THRESHOLD_SWE_IN,
            "powderThresholdSnowIn": POWDER_THRESHOLD_SNOW_IN,
            "snowNoiseIn": SNOW_NOISE_IN,
            "minCoverage": MIN_COVERAGE,
            "snowfallCmToSweIn": SNOWFALL_CM_TO_SWE_IN,
            "bootstrapN": BOOTSTRAP_N,
            "truth": "USDA NRCS SNOTEL daily snow-pillow water gains, snow-depth gains, and high/low temps",
            "day0Source": "Open-Meteo Historical Forecast API",
            "leadSource": "Open-Meteo Previous Runs API",
            "rankingMetric": "Average miss on snow days (water for ranking; new-snow inches also reported)",
            "notes": [
                "New snow compares the model’s daily snowfall (inches) to the SNOTEL stake depth gain. Depth can settle, blow, or melt, so it undercounts true snowfall.",
                "Water in the snow compares model snowfall converted back to water against the snow pillow. That is the fairer scientific score.",
                "Open-Meteo snowfall assumes a fixed 7:1 snow-to-water ratio.",
                "SNOTEL sites sit in mid-mountain clearings, not on summits or lee-slope powder traps.",
                "NBM is a blend of many models, not one physics model.",
                "Two winters is a small sample — treat rankings as directional.",
            ],
        },
        "winters": winters,
        "models": MODELS,
        "regions": [{"id": r, "label": REGION_LABELS[r]} for r in REGION_ORDER],
        "stations": stations,
        "lagChecks": lag_checks,
        "leaderboard": leaderboard,
        "perStation": per_station_metrics,
        "incomplete": rate_limited,
    }

    summary_path = os.path.join(OUT_DIR, "summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f)
    print(f"\nWrote {summary_path}")
    print(f"Leaderboard rows: {len(leaderboard)}")
    if rate_limited:
        print("INCOMPLETE due to rate limit — re-run to finish from cache.")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
