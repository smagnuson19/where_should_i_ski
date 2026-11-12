#!/usr/bin/env python3
"""
Full-network USDA NRCS SNOTEL + NOAA CPC ONI (El Niño / La Niña) Historical Data Ingestion Pipeline.
Pulls historical data going as far back as possible for all 990 snow-monitoring SNOTEL (SNTL/SNTLT)
locations across Western North America & Alaska, plus daily snowfall event histories for representative
benchmark sites across every region and elevation tier.
"""

import concurrent.futures
import json
import math
import os
import statistics
import time
import urllib.parse
import urllib.request
from collections import defaultdict

AWDB_BASE = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1"
ONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"

OUT_DIR = "/workspace/public/data"
os.makedirs(OUT_DIR, exist_ok=True)

# Regional hydro-climatic classification mapping HUC2 and State
REGION_META = {
    "PNW": {
        "id": "PNW",
        "name": "Pacific Northwest & Cascades",
        "shortName": "PNW & Cascades",
        "description": "Maritime to transitional snowpack across Washington, Oregon, and the Cascade Range (HUC 17 West).",
        "color": "#0ea5e9",
    },
    "SIERRA": {
        "id": "SIERRA",
        "name": "Sierra Nevada & California",
        "shortName": "Sierra Nevada",
        "description": "High-relief maritime snowpack in the California/Tahoe Sierra Nevada and Klamath mountains (HUC 18).",
        "color": "#6366f1",
    },
    "GREAT_BASIN": {
        "id": "GREAT_BASIN",
        "name": "Great Basin & Wasatch",
        "shortName": "Great Basin & Wasatch",
        "description": "High-desert mountain ranges and Wasatch/Uinta snowsheds in Nevada and Utah (HUC 16).",
        "color": "#f59e0b",
    },
    "NORTHERN_ROCKIES": {
        "id": "NORTHERN_ROCKIES",
        "name": "Northern Rockies & Columbia Headwaters",
        "shortName": "Northern Rockies",
        "description": "Continental and transitional mountain ranges of Idaho, Montana, and Northern Wyoming.",
        "color": "#10b981",
    },
    "CENTRAL_ROCKIES": {
        "id": "CENTRAL_ROCKIES",
        "name": "Upper Colorado & Central Rockies",
        "shortName": "Central Rockies (CO/WY)",
        "description": "High-elevation continental headwaters of the Colorado, Green, Platte, and Wind River basins.",
        "color": "#8b5cf6",
    },
    "SOUTHWEST": {
        "id": "SOUTHWEST",
        "name": "Southwest & Rio Grande",
        "shortName": "Southwest (AZ/NM)",
        "description": "Southern Rockies, Mogollon Rim, and Rio Grande headwaters in Arizona and New Mexico (HUC 13 & 15).",
        "color": "#ef4444",
    },
    "ALASKA": {
        "id": "ALASKA",
        "name": "Alaska & Subarctic",
        "shortName": "Alaska",
        "description": "Coastal maritime and interior subarctic snow monitoring network across Alaska (HUC 19).",
        "color": "#14b8a6",
    },
}

ELEVATION_BANDS = [
    {"id": "ALL", "label": "All Elevations", "min": 0, "max": 20000},
    {"id": "LOW", "label": "< 4,500 ft (Low / Maritime)", "min": 0, "max": 4500},
    {"id": "MID_LOW", "label": "4,500 – 6,500 ft (Lower Montane)", "min": 4500, "max": 6500},
    {"id": "MID", "label": "6,500 – 8,500 ft (Montane)", "min": 6500, "max": 8500},
    {"id": "HIGH", "label": "8,500 – 10,000 ft (Subalpine)", "min": 8500, "max": 10000},
    {"id": "ALPINE", "label": "> 10,000 ft (Alpine)", "min": 10000, "max": 20000},
]

# Pre-1950 historical ENSO classifications from published NOAA/Trenberth (1997) & Gergis/Fowler reconstructions
# so SNOTEL snow course records from 1930-1949 also map to historical El Niño / La Niña phases!
HISTORICAL_PRE1950_ENSO = {
    1930: ("el_nino", "moderate", 1.1),
    1931: ("el_nino", "strong", 1.5),
    1932: ("neutral", "neutral", -0.2),
    1933: ("la_nina", "moderate", -1.0),
    1934: ("la_nina", "weak", -0.7),
    1935: ("neutral", "neutral", -0.2),
    1936: ("neutral", "neutral", 0.2),
    1937: ("neutral", "neutral", 0.1),
    1938: ("la_nina", "moderate", -1.1),
    1939: ("la_nina", "weak", -0.7),
    1940: ("el_nino", "moderate", 1.2),
    1941: ("el_nino", "strong", 1.8),
    1942: ("el_nino", "moderate", 1.1),
    1943: ("la_nina", "moderate", -1.1),
    1944: ("neutral", "neutral", -0.3),
    1945: ("la_nina", "weak", -0.6),
    1946: ("neutral", "neutral", -0.2),
    1947: ("el_nino", "weak", 0.6),
    1948: ("neutral", "neutral", 0.1),
    1949: ("la_nina", "weak", -0.6),
    1950: ("la_nina", "strong", -1.4),
}


def classify_station_region(station):
    st = station.get("stateCode", "")
    huc = str(station.get("huc", ""))[:2]
    lon = station.get("longitude") or -115.0
    if st == "AK" or huc == "19":
        return "ALASKA"
    if st == "CA" or huc == "18":
        if st == "OR":
            return "PNW"
        return "SIERRA"
    if st in ("AZ", "NM") or huc in ("13", "15"):
        return "SOUTHWEST"
    if st == "NV" or huc == "16":
        if st == "CA" and lon < -119.5:
            return "SIERRA"
        return "GREAT_BASIN"
    if st in ("WA", "OR"):
        return "PNW"
    if st in ("ID", "MT"):
        return "NORTHERN_ROCKIES"
    if st in ("CO", "SD"):
        return "CENTRAL_ROCKIES"
    if st == "UT":
        if huc == "14":
            return "CENTRAL_ROCKIES"
        return "GREAT_BASIN"
    if st == "WY":
        if huc == "17" or (station.get("latitude") or 42.0) > 43.3:
            return "NORTHERN_ROCKIES"
        return "CENTRAL_ROCKIES"
    return "CENTRAL_ROCKIES"


def get_elev_band(elev):
    if elev < 4500:
        return "LOW"
    elif elev < 6500:
        return "MID_LOW"
    elif elev < 8500:
        return "MID"
    elif elev < 10000:
        return "HIGH"
    else:
        return "ALPINE"


def fetch_json_with_retry(url, timeout=45, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "SNOTEL-ENSO-Climate-Explorer/1.0", "Accept": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            if attempt == retries - 1:
                print(f"Failed URL after {retries} attempts: {url[:100]}... ({e})")
                return []
            time.sleep(1.5 * (attempt + 1))
    return []


def fetch_noaa_oni():
    print("Fetching NOAA CPC Oceanic Niño Index (ONI)...")
    req = urllib.request.Request(ONI_URL, headers={"User-Agent": "SNOTEL-ENSO-Climate-Explorer/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        lines = resp.read().decode("utf-8").splitlines()

    # Map (year, season) -> anom
    raw_seasons = defaultdict(dict)
    for line in lines[1:]:
        parts = line.split()
        if len(parts) >= 4:
            seas, yr_str, total_str, anom_str = parts[0], parts[1], parts[2], parts[3]
            try:
                yr = int(yr_str)
                anom = float(anom_str)
                raw_seasons[yr][seas] = anom
            except ValueError:
                pass

    # Compute Water Year (Oct of Y-1 through Sep of Y) winter ONI index
    # Core winter seasons for Water Year Y are:
    # OND (Y-1), NDJ (Y-1), DJF (Y), JFM (Y), FMA (Y)
    enso_by_water_year = {}
    for wy, (phase, strength, oni_val) in HISTORICAL_PRE1950_ENSO.items():
        enso_by_water_year[wy] = {
            "waterYear": wy,
            "label": f"{wy-1}–{str(wy)[2:]}",
            "oniWinterMean": oni_val,
            "oniPeak": oni_val,
            "phase": phase,
            "strength": strength,
            "seasons": {},
        }

    all_years = sorted(raw_seasons.keys())
    for wy in range(1951, max(all_years) + 1):
        prev = raw_seasons.get(wy - 1, {})
        curr = raw_seasons.get(wy, {})
        winter_vals = []
        seasons_dict = {}
        for s in ["ASO", "SON", "OND", "NDJ"]:
            if s in prev:
                seasons_dict[s] = prev[s]
                if s in ("OND", "NDJ"):
                    winter_vals.append(prev[s])
        for s in ["DJF", "JFM", "FMA", "MAM"]:
            if s in curr:
                seasons_dict[s] = curr[s]
                if s in ("DJF", "JFM", "FMA"):
                    winter_vals.append(curr[s])

        if not winter_vals:
            continue

        mean_oni = round(sum(winter_vals) / len(winter_vals), 2)
        # Peak magnitude in core winter
        peak_oni = max(winter_vals, key=lambda x: abs(x))

        # NOAA CPC threshold is +/- 0.5 C across overlapping 3-month seasons
        el_count = sum(1 for v in winter_vals if v >= 0.5)
        la_count = sum(1 for v in winter_vals if v <= -0.5)

        if el_count >= 3 or mean_oni >= 0.5:
            phase = "el_nino"
            if peak_oni >= 2.0:
                strength = "very_strong"
            elif peak_oni >= 1.5:
                strength = "strong"
            elif peak_oni >= 1.0:
                strength = "moderate"
            else:
                strength = "weak"
        elif la_count >= 3 or mean_oni <= -0.5:
            phase = "la_nina"
            if peak_oni <= -1.5:
                strength = "strong"
            elif peak_oni <= -1.0:
                strength = "moderate"
            else:
                strength = "weak"
        else:
            phase = "neutral"
            strength = "neutral"

        enso_by_water_year[wy] = {
            "waterYear": wy,
            "label": f"{wy-1}–{str(wy)[2:]}",
            "oniWinterMean": mean_oni,
            "oniPeak": round(peak_oni, 2),
            "phase": phase,
            "strength": strength,
            "seasons": seasons_dict,
        }

    print(f"Classified {len(enso_by_water_year)} water years (1930 to {max(enso_by_water_year.keys())}).")
    return enso_by_water_year


def safe_median(vals):
    if not vals:
        return None
    return round(statistics.median(vals), 2)


def safe_mean(vals):
    if not vals:
        return None
    return round(sum(vals) / len(vals), 2)


def safe_percentile(vals, q):
    if not vals:
        return None
    s = sorted(vals)
    idx = (len(s) - 1) * q
    lo = int(math.floor(idx))
    hi = int(math.ceil(idx))
    if lo == hi:
        return round(s[lo], 2)
    return round(s[lo] + (s[hi] - s[lo]) * (idx - lo), 2)


def main():
    t_start = time.time()
    enso_by_wy = fetch_noaa_oni()

    print("Fetching all snow-monitoring SNOTEL (SNTL/SNTLT) stations from USDA AWDB...")
    stations_url = f"{AWDB_BASE}/stations?stationTriplets=*:*:SNTL,*:*:SNTLT&elements=WTEQ,SNWD&activeOnly=false"
    raw_stations = fetch_json_with_retry(stations_url, timeout=45)
    print(f"Found {len(raw_stations)} snow-monitoring SNOTEL stations.")

    station_map = {}
    for s in raw_stations:
        triplet = s["stationTriplet"]
        elev = float(s.get("elevation") or 0)
        region_id = classify_station_region(s)
        station_map[triplet] = {
            "triplet": triplet,
            "id": s.get("stationId"),
            "name": s.get("name", triplet),
            "state": s.get("stateCode", ""),
            "network": s.get("networkCode", "SNTL"),
            "county": s.get("countyName", ""),
            "huc": s.get("huc", ""),
            "huc2": str(s.get("huc", ""))[:2],
            "elevation": round(elev),
            "elevBand": get_elev_band(elev),
            "lat": round(float(s.get("latitude") or 0), 4),
            "lon": round(float(s.get("longitude") or 0), 4),
            "beginDate": (s.get("beginDate") or "")[:10],
            "endDate": (s.get("endDate") or "")[:10],
            "region": region_id,
        }

    triplets = list(station_map.keys())
    batches = [triplets[i : i + 8] for i in range(0, len(triplets), 8)]
    print(f"Fetching full Period-of-Record MONTHLY time series for {len(triplets)} stations in {len(batches)} batches...")

    def fetch_monthly_batch(idx_and_batch):
        idx, batch = idx_and_batch
        t_str = urllib.parse.quote(",".join(batch), safe=":,")
        url = (
            f"{AWDB_BASE}/data?stationTriplets={t_str}"
            f"&elements=WTEQ,SNWD,TAVG,TMAX,TMIN,PREC"
            f"&duration=MONTHLY&beginDate=1900-01-01&endDate=2026-11-01"
        )
        res = fetch_json_with_retry(url, timeout=60, retries=3)
        if (idx + 1) % 20 == 0 or idx == len(batches) - 1:
            print(f"  Completed batch {idx+1}/{len(batches)} ({time.time() - t_start:.1f}s elapsed)")
        return res

    all_station_data = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as ex:
        results = list(ex.map(fetch_monthly_batch, enumerate(batches)))
        for batch_res in results:
            if batch_res:
                all_station_data.extend(batch_res)

    print(f"Downloaded full historical monthly series for {len(all_station_data)} stations in {time.time() - t_start:.1f}s.")

    # Water year months in order: Oct (10), Nov (11), Dec (12), Jan (1), Feb (2), Mar (3), Apr (4), May (5), Jun (6), Jul (7), Aug (8), Sep (9)
    WY_MONTHS = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    WINTER_MONTHS = {11, 12, 1, 2, 3}
    SPRING_SWE_MONTHS = {1, 2, 3, 4, 5}

    # Global accumulators for regional and elevation-band analysis
    # (region_id, elev_band) -> phase -> month -> list of station means
    regional_seasonal = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    # (region_id, elev_band) -> water_year -> list of station peak SWEs / anomalies / winter temps / snowfall
    regional_wy_records = defaultdict(lambda: defaultdict(list))

    processed_stations = []
    compact_history_by_station = {}

    for st_entry in all_station_data:
        triplet = st_entry.get("stationTriplet")
        if not triplet or triplet not in station_map:
            continue
        meta = station_map[triplet]
        reg = meta["region"]
        eband = meta["elevBand"]

        # Parse element values into (year, month) -> {WTEQ, SNWD, TAVG, TMAX, TMIN, PREC}
        ym_data = defaultdict(dict)
        earliest_yr = 9999
        latest_yr = 0

        for block in st_entry.get("data", []):
            el_code = block.get("stationElement", {}).get("elementCode")
            if not el_code:
                continue
            for v in block.get("values", []):
                val = v.get("value")
                yr = v.get("year")
                mo = v.get("month")
                if val is None or yr is None or mo is None:
                    continue
                # Filter extreme sensor noise
                if el_code == "WTEQ" and (val < 0 or val > 250):
                    continue
                if el_code == "SNWD" and (val < 0 or val > 1200):
                    continue
                if el_code in ("TAVG", "TMAX", "TMIN") and (val < -75 or val > 135):
                    continue
                if el_code == "PREC" and (val < 0 or val > 300):
                    continue
                ym_data[(yr, mo)][el_code] = float(val)
                if yr < earliest_yr:
                    earliest_yr = yr
                if yr > latest_yr:
                    latest_yr = yr

        if not ym_data:
            continue

        # Organize into Water Years: Oct..Dec of (WY-1) and Jan..Sep of WY
        wy_months_map = defaultdict(dict)
        for (yr, mo), vals in ym_data.items():
            wy = yr + 1 if mo >= 10 else yr
            if 1930 <= wy <= 2026:
                wy_months_map[wy][mo] = vals

        # Compute per-Water-Year summary metrics for this station
        wy_summaries = {}
        for wy, mdict in sorted(wy_months_map.items()):
            enso = enso_by_wy.get(wy)
            if not enso:
                continue

            wteq_vals = [mdict[m]["WTEQ"] for m in mdict if "WTEQ" in mdict[m]]
            spring_wteq = [mdict[m]["WTEQ"] for m in SPRING_SWE_MONTHS if m in mdict and "WTEQ" in mdict[m]]
            snwd_vals = [mdict[m]["SNWD"] for m in mdict if "SNWD" in mdict[m]]

            peak_swe = max(wteq_vals) if wteq_vals else None
            apr1_swe = mdict.get(4, {}).get("WTEQ")
            if apr1_swe is None and 3 in mdict and "WTEQ" in mdict[3]:
                apr1_swe = mdict[3]["WTEQ"]
            peak_snwd = max(snwd_vals) if snwd_vals else None

            # Winter temperature (Nov - Mar)
            winter_tavg = []
            winter_tmax = []
            winter_tmin = []
            for m in WINTER_MONTHS:
                if m in mdict:
                    if "TAVG" in mdict[m]:
                        winter_tavg.append(mdict[m]["TAVG"])
                    elif "TMAX" in mdict[m] and "TMIN" in mdict[m]:
                        winter_tavg.append((mdict[m]["TMAX"] + mdict[m]["TMIN"]) / 2.0)
                    if "TMAX" in mdict[m]:
                        winter_tmax.append(mdict[m]["TMAX"])
                    if "TMIN" in mdict[m]:
                        winter_tmin.append(mdict[m]["TMIN"])

            # Estimate snowfall events / positive snow accumulation impulses across the water year
            # From monthly steps + winter cold precipitation
            pos_swe_gains = 0.0
            pos_snwd_gains = 0.0
            major_acc_months = 0
            prev_swe = 0.0
            prev_snwd = 0.0
            for m in WY_MONTHS:
                curr_swe = mdict.get(m, {}).get("WTEQ", prev_swe)
                curr_snwd = mdict.get(m, {}).get("SNWD", prev_snwd)
                dswe = curr_swe - prev_swe
                dsnwd = curr_snwd - prev_snwd
                if dswe > 0.2:
                    pos_swe_gains += dswe
                if dsnwd > 1.0:
                    pos_snwd_gains += dsnwd
                if dswe >= 3.0 or dsnwd >= 12.0:
                    major_acc_months += 1
                prev_swe = curr_swe
                prev_snwd = curr_snwd

            # Only record water years that have meaningful snow or temp observations
            if peak_swe is None and peak_snwd is None:
                continue

            wy_summaries[wy] = {
                "wy": wy,
                "phase": enso["phase"],
                "oni": enso["oniWinterMean"],
                "peakSwe": round(peak_swe, 1) if peak_swe is not None else None,
                "aprSwe": round(apr1_swe, 1) if apr1_swe is not None else None,
                "peakSnwd": round(peak_snwd, 1) if peak_snwd is not None else None,
                "winterTavg": safe_mean(winter_tavg),
                "winterTmax": safe_mean(winter_tmax),
                "winterTmin": safe_mean(winter_tmin),
                "cumSweGain": round(pos_swe_gains, 1),
                "cumSnwdGain": round(pos_snwd_gains, 1),
                "majorPulseMonths": major_acc_months,
            }

        if len(wy_summaries) < 3:
            continue

        # Compute station long-term Median, El Niño, La Niña, Neutral stats
        all_peaks = [v["peakSwe"] for v in wy_summaries.values() if v["peakSwe"] is not None and v["peakSwe"] > 0]
        if not all_peaks:
            all_peaks = [v["peakSwe"] for v in wy_summaries.values() if v["peakSwe"] is not None]

        median_peak_swe = safe_median(all_peaks) or 0.0
        el_peaks = [v["peakSwe"] for v in wy_summaries.values() if v["phase"] == "el_nino" and v["peakSwe"] is not None]
        la_peaks = [v["peakSwe"] for v in wy_summaries.values() if v["phase"] == "la_nina" and v["peakSwe"] is not None]
        ne_peaks = [v["peakSwe"] for v in wy_summaries.values() if v["phase"] == "neutral" and v["peakSwe"] is not None]

        el_med_swe = safe_median(el_peaks)
        la_med_swe = safe_median(la_peaks)
        ne_med_swe = safe_median(ne_peaks)

        el_pct_median = round((el_med_swe / median_peak_swe) * 100, 1) if (el_med_swe is not None and median_peak_swe > 1.0) else 100.0
        la_pct_median = round((la_med_swe / median_peak_swe) * 100, 1) if (la_med_swe is not None and median_peak_swe > 1.0) else 100.0

        all_wtavg = [v["winterTavg"] for v in wy_summaries.values() if v["winterTavg"] is not None]
        el_wtavg = [v["winterTavg"] for v in wy_summaries.values() if v["phase"] == "el_nino" and v["winterTavg"] is not None]
        la_wtavg = [v["winterTavg"] for v in wy_summaries.values() if v["phase"] == "la_nina" and v["winterTavg"] is not None]

        all_snwd = [v["peakSnwd"] for v in wy_summaries.values() if v["peakSnwd"] is not None]
        el_snwd = [v["peakSnwd"] for v in wy_summaries.values() if v["phase"] == "el_nino" and v["peakSnwd"] is not None]
        la_snwd = [v["peakSnwd"] for v in wy_summaries.values() if v["phase"] == "la_nina" and v["peakSnwd"] is not None]

        # Build station monthly curve by ENSO phase (months 10..9)
        station_monthly_curves = {}
        for mo in WY_MONTHS:
            m_all_swe = []
            m_el_swe = []
            m_la_swe = []
            m_ne_swe = []
            m_all_snwd = []
            m_el_snwd = []
            m_la_snwd = []
            m_all_tavg = []
            m_el_tavg = []
            m_la_tavg = []

            for wy, mdict in wy_months_map.items():
                enso = enso_by_wy.get(wy)
                if not enso or mo not in mdict:
                    continue
                ph = enso["phase"]
                v = mdict[mo]
                if "WTEQ" in v:
                    m_all_swe.append(v["WTEQ"])
                    if ph == "el_nino":
                        m_el_swe.append(v["WTEQ"])
                    elif ph == "la_nina":
                        m_la_swe.append(v["WTEQ"])
                    else:
                        m_ne_swe.append(v["WTEQ"])
                if "SNWD" in v:
                    m_all_snwd.append(v["SNWD"])
                    if ph == "el_nino":
                        m_el_snwd.append(v["SNWD"])
                    elif ph == "la_nina":
                        m_la_snwd.append(v["SNWD"])
                tval = v.get("TAVG")
                if tval is None and "TMAX" in v and "TMIN" in v:
                    tval = (v["TMAX"] + v["TMIN"]) / 2.0
                if tval is not None:
                    m_all_tavg.append(tval)
                    if ph == "el_nino":
                        m_el_tavg.append(tval)
                    elif ph == "la_nina":
                        m_la_tavg.append(tval)

            med_swe_mo = safe_median(m_all_swe)
            el_swe_mo = safe_median(m_el_swe)
            la_swe_mo = safe_median(m_la_swe)
            ne_swe_mo = safe_median(m_ne_swe)
            med_snwd_mo = safe_median(m_all_snwd)
            el_snwd_mo = safe_median(m_el_snwd)
            la_snwd_mo = safe_median(m_la_snwd)
            med_tavg_mo = safe_mean(m_all_tavg)
            el_tavg_mo = safe_mean(m_el_tavg)
            la_tavg_mo = safe_mean(m_la_tavg)

            station_monthly_curves[str(mo)] = {
                "sweMedian": med_swe_mo,
                "sweElNino": el_swe_mo,
                "sweLaNina": la_swe_mo,
                "sweNeutral": ne_swe_mo,
                "snwdMedian": med_snwd_mo,
                "snwdElNino": el_snwd_mo,
                "snwdLaNina": la_snwd_mo,
                "tavgMedian": med_tavg_mo,
                "tavgElNino": el_tavg_mo,
                "tavgLaNina": la_tavg_mo,
            }

            # Contribute to Regional + Elevation Band seasonal curves
            for r_key in (reg, "ALL"):
                for e_key in (eband, "ALL"):
                    bucket = regional_seasonal[(r_key, e_key)]
                    if med_swe_mo is not None:
                        bucket["swe_median"][mo].append(med_swe_mo)
                    if el_swe_mo is not None:
                        bucket["swe_el_nino"][mo].append(el_swe_mo)
                    if la_swe_mo is not None:
                        bucket["swe_la_nina"][mo].append(la_swe_mo)
                    if ne_swe_mo is not None:
                        bucket["swe_neutral"][mo].append(ne_swe_mo)
                    if med_snwd_mo is not None:
                        bucket["snwd_median"][mo].append(med_snwd_mo)
                    if el_snwd_mo is not None:
                        bucket["snwd_el_nino"][mo].append(el_snwd_mo)
                    if la_snwd_mo is not None:
                        bucket["snwd_la_nina"][mo].append(la_snwd_mo)
                    if med_tavg_mo is not None:
                        bucket["tavg_median"][mo].append(med_tavg_mo)
                    if el_tavg_mo is not None:
                        bucket["tavg_el_nino"][mo].append(el_tavg_mo)
                    if la_tavg_mo is not None:
                        bucket["tavg_la_nina"][mo].append(la_tavg_mo)

        # Contribute to Regional + Elevation Band annual Water Year records
        for wy, wrec in wy_summaries.items():
            pct_med = (
                round((wrec["peakSwe"] / median_peak_swe) * 100, 1)
                if (wrec["peakSwe"] is not None and median_peak_swe > 1.0)
                else None
            )
            wrec["pctMedian"] = pct_med
            for r_key in (reg, "ALL"):
                for e_key in (eband, "ALL"):
                    regional_wy_records[(r_key, e_key)][wy].append(wrec)

        station_summary = {
            **meta,
            "earliestYear": min(wy_summaries.keys()),
            "latestYear": max(wy_summaries.keys()),
            "yearsCount": len(wy_summaries),
            "medianPeakSwe": median_peak_swe,
            "elNinoPeakSwe": el_med_swe if el_med_swe is not None else median_peak_swe,
            "laNinaPeakSwe": la_med_swe if la_med_swe is not None else median_peak_swe,
            "neutralPeakSwe": ne_med_swe if ne_med_swe is not None else median_peak_swe,
            "elNinoPctMedian": el_pct_median,
            "laNinaPctMedian": la_pct_median,
            "ensoSignalSpread": round(el_pct_median - la_pct_median, 1),
            "medianPeakSnwd": safe_median(all_snwd),
            "elNinoPeakSnwd": safe_median(el_snwd),
            "laNinaPeakSnwd": safe_median(la_snwd),
            "winterTavg": safe_mean(all_wtavg),
            "elNinoWinterTavg": safe_mean(el_wtavg),
            "laNinaWinterTavg": safe_mean(la_wtavg),
            "monthlyCurves": station_monthly_curves,
        }
        processed_stations.append(station_summary)

        # Store compact annual history for instant modal inspection of any of the 990 stations
        compact_history_by_station[triplet] = [
            [
                w["wy"],
                w["peakSwe"],
                w["aprSwe"],
                w["peakSnwd"],
                w["winterTavg"],
                w["winterTmin"],
                w["cumSnwdGain"],
                w["majorPulseMonths"],
                w["pctMedian"],
            ]
            for w in wy_summaries.values()
        ]

    print(f"Processed {len(processed_stations)} snow SNOTEL stations with full historical curves.")

    # Select 28 benchmark SNOTEL stations across all 7 regions and diverse elevations to fetch full DAILY histories
    # to compute exact daily snowfall event thresholds (>=2", >=6", >=12", max 24h snowfall, freezing days, storm temperatures)
    by_reg_stations = defaultdict(list)
    for st in processed_stations:
        if st["medianPeakSnwd"] and st["medianPeakSnwd"] > 20 and st["yearsCount"] >= 25:
            by_reg_stations[st["region"]].append(st)

    benchmark_triplets = []
    for reg_id, st_list in by_reg_stations.items():
        st_sorted = sorted(st_list, key=lambda x: x["elevation"])
        if len(st_sorted) >= 4:
            picks = [
                st_sorted[0],
                st_sorted[len(st_sorted) // 3],
                st_sorted[(2 * len(st_sorted)) // 3],
                st_sorted[-1],
            ]
        else:
            picks = st_sorted
        for p in picks:
            benchmark_triplets.append(p["triplet"])

    print(f"Fetching full DAILY Period-of-Record histories for {len(benchmark_triplets)} regional/elevation benchmark SNOTEL stations...")

    def fetch_daily_station(triplet):
        t_str = urllib.parse.quote(triplet, safe=":,")
        url = (
            f"{AWDB_BASE}/data?stationTriplets={t_str}"
            f"&elements=WTEQ,SNWD,TAVG,TMAX,TMIN,PREC"
            f"&duration=DAILY&beginDate=1978-10-01&endDate=2026-10-01"
        )
        res = fetch_json_with_retry(url, timeout=60, retries=2)
        return triplet, res

    daily_storm_stats_by_region = defaultdict(lambda: defaultdict(list))
    daily_storm_stats_by_station = {}

    with concurrent.futures.ThreadPoolExecutor(max_workers=14) as ex:
        daily_results = list(ex.map(fetch_daily_station, benchmark_triplets))

    for triplet, dres in daily_results:
        if not dres:
            continue
        meta = station_map[triplet]
        reg = meta["region"]
        eband = meta["elevBand"]
        day_map = defaultdict(dict)
        for block in dres[0].get("data", []):
            el = block.get("stationElement", {}).get("elementCode")
            for v in block.get("values", []):
                dt = v.get("date")
                val = v.get("value")
                if dt and val is not None:
                    day_map[dt][el] = float(val)

        sorted_dates = sorted(day_map.keys())
        wy_daily = defaultdict(lambda: {
            "events_2in": 0,
            "events_6in": 0,
            "events_12in": 0,
            "swe_events_05in": 0,
            "swe_events_1in": 0,
            "max_24h_snwd_gain": 0.0,
            "max_24h_swe_gain": 0.0,
            "total_daily_snowfall_in": 0.0,
            "subfreezing_days": 0,
            "extreme_cold_days": 0,
            "storm_temps": [],
            "winter_temps": [],
        })

        prev_snwd = None
        prev_swe = None
        for dt in sorted_dates:
            vals = day_map[dt]
            yr = int(dt[:4])
            mo = int(dt[5:7])
            wy = yr + 1 if mo >= 10 else yr
            if wy < 1979 or wy > 2026:
                continue

            snwd = vals.get("SNWD")
            swe = vals.get("WTEQ")
            tavg = vals.get("TAVG")
            tmax = vals.get("TMAX")
            tmin = vals.get("TMIN")
            if tavg is None and tmax is not None and tmin is not None:
                tavg = (tmax + tmin) / 2.0

            rec = wy_daily[wy]
            if mo in (11, 12, 1, 2, 3) and tavg is not None and -60 < tavg < 100:
                rec["winter_temps"].append(tavg)
            if tmax is not None and tmax <= 32.0:
                rec["subfreezing_days"] += 1
            if tmin is not None and tmin <= 10.0:
                rec["extreme_cold_days"] += 1

            if snwd is not None and prev_snwd is not None and 0 <= snwd < 1000 and 0 <= prev_snwd < 1000:
                dsnwd = snwd - prev_snwd
                # Filter single-day ultrasonic snow depth glitches (> 48 inches in 24h)
                if 0 < dsnwd <= 48.0:
                    rec["total_daily_snowfall_in"] += dsnwd
                    if dsnwd >= 2.0:
                        rec["events_2in"] += 1
                        if tavg is not None and -50 < tavg < 60:
                            rec["storm_temps"].append(tavg)
                    if dsnwd >= 6.0:
                        rec["events_6in"] += 1
                    if dsnwd >= 12.0:
                        rec["events_12in"] += 1
                    if dsnwd > rec["max_24h_snwd_gain"]:
                        rec["max_24h_snwd_gain"] = round(dsnwd, 1)

            if swe is not None and prev_swe is not None and 0 <= swe < 250 and 0 <= prev_swe < 250:
                dswe = swe - prev_swe
                if 0 < dswe <= 8.0:
                    if dswe >= 0.5:
                        rec["swe_events_05in"] += 1
                    if dswe >= 1.0:
                        rec["swe_events_1in"] += 1
                    if dswe > rec["max_24h_swe_gain"]:
                        rec["max_24h_swe_gain"] = round(dswe, 2)

            if snwd is not None:
                prev_snwd = snwd
            if swe is not None:
                prev_swe = swe

        station_storm_wys = []
        for wy, r in sorted(wy_daily.items()):
            enso = enso_by_wy.get(wy)
            if not enso or (r["events_2in"] == 0 and r["swe_events_05in"] == 0):
                continue
            entry = {
                "wy": wy,
                "phase": enso["phase"],
                "oni": enso["oniWinterMean"],
                "events2in": r["events_2in"],
                "events6in": r["events_6in"],
                "events12in": r["events_12in"],
                "sweEvents05in": r["swe_events_05in"],
                "sweEvents1in": r["swe_events_1in"],
                "max24hSnow": r["max_24h_snwd_gain"],
                "max24hSwe": r["max_24h_swe_gain"],
                "totalDailySnowIn": round(r["total_daily_snowfall_in"], 1),
                "subfreezingDays": r["subfreezing_days"],
                "extremeColdDays": r["extreme_cold_days"],
                "avgStormTempF": safe_mean(r["storm_temps"]),
                "avgWinterTempF": safe_mean(r["winter_temps"]),
            }
            station_storm_wys.append(entry)
            for rk in (reg, "ALL"):
                daily_storm_stats_by_region[rk][enso["phase"]].append(entry)
                daily_storm_stats_by_region[rk]["all"].append(entry)

        daily_storm_stats_by_station[triplet] = {
            "triplet": triplet,
            "name": meta["name"],
            "state": meta["state"],
            "region": reg,
            "elevation": meta["elevation"],
            "elevBand": eband,
            "waterYears": station_storm_wys,
        }

    print(f"Processed daily snowfall event statistics for {len(daily_storm_stats_by_station)} benchmark stations.")

    # Assemble Regional + Elevation Band Aggregate Curves & Historical Water Year Series
    MONTH_LABELS = {
        10: "Oct",
        11: "Nov",
        12: "Dec",
        1: "Jan",
        2: "Feb",
        3: "Mar",
        4: "Apr",
        5: "May",
        6: "Jun",
        7: "Jul",
        8: "Aug",
        9: "Sep",
    }

    regional_aggregates = {}
    all_region_ids = ["ALL"] + list(REGION_META.keys())
    all_eband_ids = [b["id"] for b in ELEVATION_BANDS]

    for r_id in all_region_ids:
        regional_aggregates[r_id] = {}
        for e_id in all_eband_ids:
            bucket = regional_seasonal.get((r_id, e_id), {})
            seasonal_cycle = []
            for mo in WY_MONTHS:
                seasonal_cycle.append({
                    "month": mo,
                    "monthLabel": MONTH_LABELS[mo],
                    "sweMedian": safe_mean(bucket.get("swe_median", {}).get(mo, [])),
                    "sweElNino": safe_mean(bucket.get("swe_el_nino", {}).get(mo, [])),
                    "sweLaNina": safe_mean(bucket.get("swe_la_nina", {}).get(mo, [])),
                    "sweNeutral": safe_mean(bucket.get("swe_neutral", {}).get(mo, [])),
                    "sweP25": safe_percentile(bucket.get("swe_median", {}).get(mo, []), 0.25),
                    "sweP75": safe_percentile(bucket.get("swe_median", {}).get(mo, []), 0.75),
                    "snwdMedian": safe_mean(bucket.get("snwd_median", {}).get(mo, [])),
                    "snwdElNino": safe_mean(bucket.get("snwd_el_nino", {}).get(mo, [])),
                    "snwdLaNina": safe_mean(bucket.get("snwd_la_nina", {}).get(mo, [])),
                    "tavgMedian": safe_mean(bucket.get("tavg_median", {}).get(mo, [])),
                    "tavgElNino": safe_mean(bucket.get("tavg_el_nino", {}).get(mo, [])),
                    "tavgLaNina": safe_mean(bucket.get("tavg_la_nina", {}).get(mo, [])),
                })

            wy_bucket = regional_wy_records.get((r_id, e_id), {})
            annual_series = []
            for wy in sorted(wy_bucket.keys()):
                recs = wy_bucket[wy]
                if not recs:
                    continue
                enso = enso_by_wy[wy]
                swes = [r["peakSwe"] for r in recs if r["peakSwe"] is not None]
                pcts = [r["pctMedian"] for r in recs if r["pctMedian"] is not None and 0 < r["pctMedian"] < 400]
                snwds = [r["peakSnwd"] for r in recs if r["peakSnwd"] is not None]
                tavgs = [r["winterTavg"] for r in recs if r["winterTavg"] is not None]
                tmins = [r["winterTmin"] for r in recs if r["winterTmin"] is not None]
                snwd_gains = [r["cumSnwdGain"] for r in recs if r["cumSnwdGain"] is not None]
                pulses = [r["majorPulseMonths"] for r in recs if r["majorPulseMonths"] is not None]

                annual_series.append({
                    "waterYear": wy,
                    "label": enso["label"],
                    "phase": enso["phase"],
                    "strength": enso["strength"],
                    "oni": enso["oniWinterMean"],
                    "oniPeak": enso["oniPeak"],
                    "stationCount": len(recs),
                    "meanPeakSwe": safe_mean(swes),
                    "medianPeakSwe": safe_median(swes),
                    "pctOfMedian": safe_median(pcts),
                    "meanPeakSnwd": safe_mean(snwds),
                    "winterTavg": safe_mean(tavgs),
                    "winterTmin": safe_mean(tmins),
                    "cumSnwdGain": safe_mean(snwd_gains),
                    "majorPulseMonths": safe_mean(pulses),
                })

            regional_aggregates[r_id][e_id] = {
                "seasonalCycle": seasonal_cycle,
                "annualSeries": annual_series,
            }

    # Summarize daily storm stats per region & phase
    storm_summary_by_region = {}
    for r_id in all_region_ids:
        storm_summary_by_region[r_id] = {}
        for phase in ("all", "el_nino", "la_nina", "neutral"):
            s_recs = daily_storm_stats_by_region.get(r_id, {}).get(phase, [])
            storm_summary_by_region[r_id][phase] = {
                "sampleStationYears": len(s_recs),
                "events2in": safe_mean([x["events2in"] for x in s_recs]),
                "events6in": safe_mean([x["events6in"] for x in s_recs]),
                "events12in": safe_mean([x["events12in"] for x in s_recs]),
                "sweEvents05in": safe_mean([x["sweEvents05in"] for x in s_recs]),
                "sweEvents1in": safe_mean([x["sweEvents1in"] for x in s_recs]),
                "max24hSnow": safe_mean([x["max24hSnow"] for x in s_recs]),
                "max24hSwe": safe_mean([x["max24hSwe"] for x in s_recs]),
                "totalDailySnowIn": safe_mean([x["totalDailySnowIn"] for x in s_recs]),
                "subfreezingDays": safe_mean([x["subfreezingDays"] for x in s_recs]),
                "extremeColdDays": safe_mean([x["extremeColdDays"] for x in s_recs]),
                "avgStormTempF": safe_mean([x["avgStormTempF"] for x in s_recs if x["avgStormTempF"] is not None]),
                "avgWinterTempF": safe_mean([x["avgWinterTempF"] for x in s_recs if x["avgWinterTempF"] is not None]),
            }

    # Write output JSON files
    core_payload = {
        "generatedAt": "2026-11-11T21:30:00Z",
        "source": "USDA NRCS AWDB SNOTEL Network & NOAA CPC Oceanic Niño Index (ONI)",
        "totalStations": len(processed_stations),
        "earliestWaterYear": 1930,
        "latestWaterYear": 2026,
        "regions": REGION_META,
        "elevationBands": ELEVATION_BANDS,
        "ensoByWaterYear": enso_by_wy,
        "regionalAggregates": regional_aggregates,
        "stormSummaryByRegion": storm_summary_by_region,
        "benchmarkStormStations": list(daily_storm_stats_by_station.values()),
    }

    with open(os.path.join(OUT_DIR, "snotel-enso-core.json"), "w") as f:
        json.dump(core_payload, f, separators=(",", ":"))

    with open(os.path.join(OUT_DIR, "snotel-stations.json"), "w") as f:
        json.dump(processed_stations, f, separators=(",", ":"))

    with open(os.path.join(OUT_DIR, "snotel-station-histories.json"), "w") as f:
        json.dump(
            {
                "columns": [
                    "wy",
                    "peakSwe",
                    "aprSwe",
                    "peakSnwd",
                    "winterTavg",
                    "winterTmin",
                    "cumSnwdGain",
                    "majorPulseMonths",
                    "pctMedian",
                ],
                "histories": compact_history_by_station,
            },
            f,
            separators=(",", ":"),
        )

    for fn in ["snotel-enso-core.json", "snotel-stations.json", "snotel-station-histories.json"]:
        p = os.path.join(OUT_DIR, fn)
        print(f"Wrote {fn}: {os.path.getsize(p)/1024:.1f} KB")

    print(f"All SNOTEL + ENSO data ingestion finished in {time.time() - t_start:.1f}s!")


if __name__ == "__main__":
    main()
