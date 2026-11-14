#!/usr/bin/env python3
"""
Build season-snowfall histories for Japanese ski resorts from JMA AMeDAS (etrn).

Uses annually_a.php / annually_s.php cold-season (寒候年) snowfall columns — one page
per station covers every winter. Writes public/data/amedas-snow.json.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
from resorts_common import (  # noqa: E402
    CACHE_DIR,
    PUBLIC_DATA,
    SRC_DATA,
    ensure_dirs,
    filter_resorts,
    nearest_stations,
)

ETRN_BASE = "https://www.data.jma.go.jp/stats/etrn"
USER_AGENT_BROWSER = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Prefecture codes with winter snow (Hokkaido uses 11–17 in etrn)
SNOW_PREC_NOS = [
    "11", "12", "13", "14", "15", "16", "17",  # Hokkaido
    "02", "03", "04", "05", "06", "07",  # Tohoku
    "08", "09", "10",  # Kanto north
    "15", "16", "17", "18",  # Hokuriku (15=Niigata overlaps Hokkaido numbering — etrn uses distinct)
    "19", "20", "21",  # Yamanashi, Nagano, Gifu
    "22", "23", "24", "25", "26", "27", "28",
    "31", "32", "33", "34", "35",
]
# Note: Hokkaido etrn prec_nos are 11-17; Niigata is 54 in older system but 15 in some lists.
# We'll discover valid prefs by fetching; empty pages are skipped.
# Actual Niigata/Toyama/Ishikawa/Fukui/Nagano codes on etrn:
# 54 Niigata, 55 Toyama, 56 Ishikawa, 57 Fukui, 48 Nagano, 49 Gifu? — probe below.
ETRN_PREC_NOS = [
    # Hokkaido
    "11", "12", "13", "14", "15", "16", "17",
    # Honshu snow belt (etrn prefecture numbers)
    "31", "32", "33", "34", "35", "36",  # Aomori..Fukushima area codes vary
    "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50",
    "51", "52", "53", "54", "55", "56", "57", "58", "59", "60",
    "61", "62", "63", "64", "65", "66", "67", "68", "69", "70",
    "71", "72", "73",
]

VIEWPOINT_RE = re.compile(
    r"viewPoint\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,"
    r"\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'"
)

MIN_SEASONS = 15
NEAR_KM = 25.0


def fetch_etrn(url: str, dest: str, force: bool = False) -> str:
    ensure_dirs()
    if os.path.exists(dest) and not force and os.path.getsize(dest) > 800:
        with open(dest, encoding="utf-8", errors="replace") as f:
            return f.read()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT_BROWSER, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        text = resp.read().decode("utf-8", errors="replace")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        f.write(text)
    time.sleep(0.45)
    return text


def dms_to_deg(deg_str: str, min_str: str) -> float:
    return float(deg_str) + float(min_str) / 60.0


def parse_stations_from_pref(html: str, prec_no: str) -> list[dict]:
    stations = []
    for m in VIEWPOINT_RE.finditer(html):
        kind, block, name_ja, name_kana = m.group(1), m.group(2), m.group(3), m.group(4)
        lat = dms_to_deg(m.group(5), m.group(6))
        lon = dms_to_deg(m.group(7), m.group(8))
        alt_s = m.group(9)
        alt = float(alt_s) if alt_s not in ("", "9999") else 0.0
        if kind not in ("a", "s"):
            continue
        stations.append(
            {
                "id": f"{prec_no}-{block}",
                "precNo": prec_no,
                "blockNo": block,
                "kind": kind,
                "name": name_ja,
                "nameKana": name_kana,
                "lat": round(lat, 4),
                "lon": round(lon, 4),
                "elevationM": round(alt),
                "source": "amedas",
            }
        )
    return stations


def load_all_stations() -> list[dict]:
    cache = os.path.join(CACHE_DIR, "amedas_stations.json")
    if os.path.exists(cache) and os.path.getsize(cache) > 2000:
        with open(cache, encoding="utf-8") as f:
            return json.load(f)

    # Probe a wide range of etrn prefecture numbers; keep those with stations
    all_st: list[dict] = []
    seen: set[str] = set()
    for prec in [f"{i:02d}" for i in range(1, 74)]:
        url = f"{ETRN_BASE}/select/prefecture.php?prec_no={prec}&block_no=&year=&month=&day=&view="
        dest = os.path.join(CACHE_DIR, "etrn", f"pref_{prec}.html")
        try:
            html = fetch_etrn(url, dest)
        except Exception as e:
            print(f"  pref {prec} failed: {e}")
            continue
        if "viewPoint" not in html:
            continue
        sts = parse_stations_from_pref(html, prec)
        # Keep prefs that look snowy (north / mountain) — filter later by proximity
        if not sts:
            continue
        print(f"  pref {prec}: {len(sts)} stations")
        for s in sts:
            if s["id"] in seen:
                continue
            seen.add(s["id"])
            all_st.append(s)

    with open(cache, "w", encoding="utf-8") as f:
        json.dump(all_st, f, ensure_ascii=False)
    return all_st


def parse_number(cell: str) -> float | None:
    cell = cell.strip().replace("]", "").replace(")", "").replace(" ", "")
    if not cell or cell in ("///", "--", "×", "x", "*", ""):
        return None
    try:
        return float(cell)
    except ValueError:
        return None


def parse_annually_snow(html: str) -> list[list]:
    """
    Parse annually_a/s cold-season snow columns.

    AMeDAS (kind a) rows usually have 21 cells:
      [..., sunshine, snow_sum, max_1d, max_depth]
    Surface (kind s) rows often have 28 cells and may omit class="mtx":
      snow_sum@21, max_1d@22, max_depth@23
    寒候年 = Aug 1 previous year through Jul 31 of the labeled year.
    """
    rows_out: list[list] = []
    for row_html in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S | re.I):
        cells = [
            re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", c)).strip()
            for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", row_html, re.S | re.I)
        ]
        if len(cells) < 21:
            continue
        year = parse_number(cells[0])
        if year is None or year < 1950 or year > 2030:
            continue

        snow = max1d = depth = tavg = None
        if len(cells) >= 28:
            snow = parse_number(cells[21])
            max1d = parse_number(cells[22])
            depth = parse_number(cells[23])
            tavg = parse_number(cells[7])  # annual mean daily avg temp
        else:
            snow = parse_number(cells[18])
            max1d = parse_number(cells[19])
            depth = parse_number(cells[20])
            tavg = parse_number(cells[5])

        if snow is None:
            continue
        rows_out.append(
            [
                int(year),
                round(snow, 1),
                round(max1d, 1) if max1d is not None else None,
                round(depth, 1) if depth is not None else None,
                round(tavg, 2) if tavg is not None else None,
            ]
        )
    return rows_out


def fetch_annually(st: dict) -> list[list]:
    view = "annually_a" if st["kind"] == "a" else "annually_s"
    url = (
        f"{ETRN_BASE}/view/{view}.php?prec_no={st['precNo']}&block_no={st['blockNo']}"
        f"&year=&month=&day=&view="
    )
    dest = os.path.join(CACHE_DIR, "etrn", f"annual_{st['precNo']}_{st['blockNo']}.html")
    html = fetch_etrn(url, dest)
    return parse_annually_snow(html)


def load_jma_phases() -> dict[str, str]:
    path = os.path.join(SRC_DATA, "jma-enso-snowfall-data.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    out = {}
    for w in data["historical_winters"]:
        phase = {"El Niño": "el_nino", "La Niña": "la_nina", "Neutral": "neutral"}[w["enso_phase"]]
        out[str(w["winter_end_year"])] = phase
    return out


def main() -> None:
    t0 = time.time()
    ensure_dirs()
    print("Loading Japan resorts...")
    resorts = filter_resorts("Japan")
    print(f"  {len(resorts)} resorts")

    print("Loading JMA etrn station lists (all prefectures with data)...")
    all_stations = load_all_stations()
    print(f"  {len(all_stations)} stations")

    needed: dict[str, dict] = {}
    for r in resorts:
        matches = nearest_stations(
            r["lat"],
            r["lon"],
            r["baseM"],
            r["summitM"] or r["baseM"] + 400,
            all_stations,
            max_km=NEAR_KM,
            max_below_base_m=1200.0,
            elev_key="elevationM",
            limit=2,
        )
        for _, _, st in matches:
            needed[st["id"]] = st

    # Force well-known snow stations
    for st in all_stations:
        if st["name"] in ("白馬", "野沢温泉", "倶知安", "酸ケ湯", "関山", "大山", "草津", "藤原", "肘折"):
            needed[st["id"]] = st

    print(f"Fetching annual cold-season snowfall for {len(needed)} stations...")
    histories: dict[str, list] = {}
    stations_out: list[dict] = []

    for i, (sid, st) in enumerate(sorted(needed.items(), key=lambda x: x[0])):
        print(f"  [{i+1}/{len(needed)}] {st['name']} ({sid})")
        try:
            rows = fetch_annually(st)
        except Exception as e:
            print(f"    failed: {e}")
            continue
        # Keep winters with meaningful snow
        rows = [r for r in rows if r[1] is not None and r[1] >= 0]
        if len(rows) < MIN_SEASONS:
            print(f"    only {len(rows)} winters — skip")
            continue
        # Drop all-zero snow stations (no real snow sensor)
        if sum(1 for r in rows if r[1] and r[1] > 5) < 5:
            print(f"    negligible snow — skip")
            continue
        histories[sid] = rows
        stations_out.append(
            {
                "id": sid,
                "source": "amedas",
                "name": st["name"],
                "nameKana": st.get("nameKana"),
                "lat": st["lat"],
                "lon": st["lon"],
                "elevationM": st["elevationM"],
                "precNo": st["precNo"],
                "blockNo": st["blockNo"],
            }
        )

    payload = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "Japan Meteorological Agency (JMA) AMeDAS / etrn cold-season (寒候年) snowfall",
        "columns": ["winterEndYear", "seasonSnowfallCm", "max1dSnowCm", "maxDepthCm", "tempDjfC"],
        "ensoPhases": load_jma_phases(),
        "stations": stations_out,
        "histories": histories,
    }
    out_path = os.path.join(PUBLIC_DATA, "amedas-snow.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)
    print(f"Wrote {out_path}: {os.path.getsize(out_path)/1024:.1f} KB, {len(stations_out)} stations, {time.time()-t0:.0f}s")

    kutchan = next((s for s in stations_out if "倶知安" in s["name"]), None)
    if kutchan:
        rows = histories[kutchan["id"]]
        print(f"Kutchan winters: n={len(rows)} sample={rows[-3:]}")
    else:
        print("WARNING: Kutchan (倶知安) not found")
    hakuba = next((s for s in stations_out if s["name"] == "白馬"), None)
    if hakuba:
        rows = histories[hakuba["id"]]
        wy2023 = next((r for r in rows if r[0] == 2023), None)
        print(f"Hakuba 2023 cold-season snow: {wy2023}")


if __name__ == "__main__":
    main()
