"""Shared helpers for OpenSkiData resort filtering and station matching."""

from __future__ import annotations

import csv
import json
import math
import os
import urllib.request
from typing import Any

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CACHE_DIR = os.path.join(ROOT, "scripts", "cache")
PUBLIC_DATA = os.path.join(ROOT, "public", "data")
SRC_DATA = os.path.join(ROOT, "src", "data")

OPEN_SKI_CSV = "https://tiles.openskimap.org/csv/ski_areas.csv"
USER_AGENT = "WhereShouldISki/1.0 (climate-research; snowfall-enso)"

WESTERN_US_STATES = {
    "Washington",
    "Oregon",
    "California",
    "Nevada",
    "Idaho",
    "Montana",
    "Wyoming",
    "Utah",
    "Colorado",
    "New Mexico",
    "Arizona",
    "Alaska",
    "South Dakota",
}

STATE_ABBREV = {
    "Washington": "WA",
    "Oregon": "OR",
    "California": "CA",
    "Nevada": "NV",
    "Idaho": "ID",
    "Montana": "MT",
    "Wyoming": "WY",
    "Utah": "UT",
    "Colorado": "CO",
    "New Mexico": "NM",
    "Arizona": "AZ",
    "Alaska": "AK",
    "South Dakota": "SD",
}


def ensure_dirs() -> None:
    os.makedirs(CACHE_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DATA, exist_ok=True)


def fetch_bytes(url: str, dest: str, force: bool = False) -> str:
    ensure_dirs()
    if os.path.exists(dest) and not force and os.path.getsize(dest) > 0:
        return dest
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    with open(dest, "wb") as f:
        f.write(data)
    return dest


def fetch_text(url: str, dest: str | None = None, force: bool = False, encoding: str = "utf-8") -> str:
    ensure_dirs()
    if dest and os.path.exists(dest) and not force and os.path.getsize(dest) > 0:
        with open(dest, "r", encoding=encoding, errors="replace") as f:
            return f.read()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        text = resp.read().decode(encoding, errors="replace")
    if dest:
        with open(dest, "w", encoding=encoding) as f:
            f.write(text)
    return text


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p = math.radians
    a = math.sin(p(lat2 - lat1) / 2) ** 2 + math.cos(p(lat1)) * math.cos(p(lat2)) * math.sin(p(lon2 - lon1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def num(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def load_overrides() -> dict:
    path = os.path.join(ROOT, "scripts", "resort_overrides.json")
    if not os.path.exists(path):
        return {"exclude_ids": [], "exclude_names": [], "renames": {}, "force_include": [], "merges": []}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def clean_name(raw: str) -> tuple[str, str | None]:
    """Split OpenSkiData 'Japanese, English' names into (english_or_primary, japanese_or_none)."""
    raw = (raw or "").strip()
    if not raw:
        return ("", None)
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    if len(parts) == 1:
        return (parts[0], None)
    # Prefer the first Latin-script part as English name
    latin = [p for p in parts if any("a" <= c.lower() <= "z" for c in p)]
    non_latin = [p for p in parts if p not in latin]
    if latin:
        return (latin[0], non_latin[0] if non_latin else None)
    return (parts[0], parts[1] if len(parts) > 1 else None)


def stable_id(row: dict) -> str:
    sources = (row.get("sources") or "").strip().split()
    if sources:
        return sources[0]
    wid = (row.get("wikidata_id") or "").strip()
    if wid:
        return f"wikidata:{wid}"
    return f"openskimap:{row.get('id') or row.get('lat')}:{row.get('lng')}"


def filter_resorts(country: str) -> list[dict]:
    """Return filtered downhill resorts for 'US' (western) or 'Japan'."""
    ensure_dirs()
    csv_path = os.path.join(CACHE_DIR, "ski_areas.csv")
    fetch_bytes(OPEN_SKI_CSV, csv_path)
    overrides = load_overrides()
    exclude_ids = set(overrides.get("exclude_ids") or [])
    exclude_names = {n.lower() for n in overrides.get("exclude_names") or []}
    renames = overrides.get("renames") or {}

    out: list[dict] = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("status") != "operating" or row.get("has_downhill") != "yes":
                continue
            if not (row.get("name") or "").strip():
                continue
            lifts = num(row.get("lift_count")) or 0
            vertical = num(row.get("vertical_m")) or 0
            if lifts < 2 or vertical < 150:
                continue

            countries = row.get("countries") or ""
            region = row.get("regions") or ""
            if country == "US":
                if countries != "United States" or region not in WESTERN_US_STATES:
                    continue
            elif country == "Japan":
                if countries != "Japan":
                    continue
            else:
                raise ValueError(country)

            sid = stable_id(row)
            if sid in exclude_ids:
                continue
            name, name_ja = clean_name(row["name"])
            if name.lower() in exclude_names:
                continue
            if sid in renames:
                name = renames[sid]
            elif name in renames:
                name = renames[name]

            lat = num(row.get("lat"))
            lon = num(row.get("lng"))
            if lat is None or lon is None:
                continue

            out.append(
                {
                    "id": sid,
                    "openskimapId": row.get("id") or "",
                    "name": name,
                    "nameJa": name_ja,
                    "country": "US" if country == "US" else "Japan",
                    "state": STATE_ABBREV.get(region, region) if country == "US" else region,
                    "lat": round(lat, 5),
                    "lon": round(lon, 5),
                    "baseM": round(num(row.get("min_elevation_m")) or 0),
                    "summitM": round(num(row.get("max_elevation_m")) or 0),
                    "verticalM": round(vertical),
                    "liftCount": int(lifts),
                    "website": ((row.get("websites") or "").split() or [None])[0],
                    "wikidataId": (row.get("wikidata_id") or "").strip() or None,
                }
            )

    # Deduplicate by rounded lat/lon + name
    seen: set[tuple] = set()
    deduped: list[dict] = []
    for r in out:
        key = (r["name"].lower(), round(r["lat"], 3), round(r["lon"], 3))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(r)
    deduped.sort(key=lambda r: (r["state"], r["name"]))
    return deduped


def classify_us_region(state: str, lat: float, lon: float) -> str:
    """Mirror the SNOTEL region rules for a resort location."""
    if state == "AK":
        return "ALASKA"
    if state == "CA":
        return "SIERRA"
    if state in ("AZ", "NM"):
        return "SOUTHWEST"
    if state == "NV":
        return "GREAT_BASIN"
    if state in ("WA", "OR"):
        return "PNW"
    if state in ("ID", "MT"):
        return "NORTHERN_ROCKIES"
    if state in ("CO", "SD"):
        return "CENTRAL_ROCKIES"
    if state == "UT":
        return "GREAT_BASIN"
    if state == "WY":
        return "NORTHERN_ROCKIES" if lat > 43.3 else "CENTRAL_ROCKIES"
    return "CENTRAL_ROCKIES"


def nearest_stations(
    lat: float,
    lon: float,
    base_m: float,
    summit_m: float,
    stations: list[dict],
    *,
    max_km: float,
    max_below_base_m: float | None,
    elev_key: str,
    lat_key: str = "lat",
    lon_key: str = "lon",
    limit: int = 3,
) -> list[tuple[float, float, dict]]:
    """Return up to `limit` (distance_km, elev_gap_m, station) matches."""
    scored: list[tuple[float, float, dict]] = []
    for st in stations:
        d = haversine_km(lat, lon, st[lat_key], st[lon_key])
        if d > max_km:
            continue
        elev = st[elev_key]
        if max_below_base_m is not None and elev < base_m - max_below_base_m:
            continue
        # Prefer stations between a bit below base and a bit above summit
        if elev < base_m - 900 or elev > summit_m + 900:
            continue
        gap = elev - base_m
        scored.append((d, gap, st))
    scored.sort(key=lambda x: (x[0], abs(x[1])))
    return scored[:limit]
