#!/usr/bin/env python3
"""
Match western US and Japan ski resorts to nearby snowfall stations.

Reads OpenSkiData + us-snowfall.json / amedas-snow.json (+ snotel-stations for region).
Writes public/data/resorts-us.json and public/data/resorts-japan.json.
"""

from __future__ import annotations

import json
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
from resorts_common import (  # noqa: E402
    PUBLIC_DATA,
    classify_us_region,
    ensure_dirs,
    filter_resorts,
    haversine_km,
    nearest_stations,
)


def load_json(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build_us() -> list[dict]:
    resorts = filter_resorts("US")
    snowfall = load_json(os.path.join(PUBLIC_DATA, "us-snowfall.json"))
    snotel = load_json(os.path.join(PUBLIC_DATA, "snotel-stations.json"))

    ghcn = [s for s in snowfall["stations"] if s["source"] == "ghcn" and s["id"] in snowfall["histories"]]
    snotel_depth = [
        s for s in snowfall["stations"] if s["source"] == "snotel_depth" and s["id"] in snowfall["histories"]
    ]
    # elevationM for matching
    for s in ghcn:
        s["elevationM"] = s["elevationFt"] * 0.3048
    for s in snotel_depth:
        s["elevationM"] = s["elevationFt"] * 0.3048

    snotel_pts = [
        {
            "id": s["triplet"],
            "lat": s["lat"],
            "lon": s["lon"],
            "elevationM": s["elevation"] * 0.3048,
            "region": s["region"],
        }
        for s in snotel
    ]

    out = []
    for r in resorts:
        base = r["baseM"]
        summit = r["summitM"] or base + 500
        matched = []
        match_quality = "none"

        ghcn_hits = nearest_stations(
            r["lat"], r["lon"], base, summit, ghcn,
            max_km=30.0, max_below_base_m=700.0, elev_key="elevationM", limit=3,
        )
        if ghcn_hits:
            match_quality = "nearby"
            for d, gap, st in ghcn_hits:
                matched.append(
                    {
                        "id": st["id"],
                        "source": "ghcn",
                        "name": st["name"],
                        "distanceKm": round(d, 1),
                        "elevGapM": round(gap),
                    }
                )
        else:
            for max_km, label in ((30.0, "nearby"), (60.0, "distant")):
                hits = nearest_stations(
                    r["lat"], r["lon"], base, summit, snotel_depth,
                    max_km=max_km, max_below_base_m=900.0, elev_key="elevationM", limit=2,
                )
                if hits:
                    match_quality = label
                    for d, gap, st in hits:
                        matched.append(
                            {
                                "id": st["id"],
                                "source": "snotel_depth",
                                "name": st["name"],
                                "distanceKm": round(d, 1),
                                "elevGapM": round(gap),
                            }
                        )
                    break

        # Region from nearby SNOTEL majority, else state rule
        near_snotel = [
            st
            for st in snotel_pts
            if haversine_km(r["lat"], r["lon"], st["lat"], st["lon"]) <= 80
        ]
        if near_snotel:
            region = Counter(st["region"] for st in near_snotel).most_common(1)[0][0]
        else:
            region = classify_us_region(r["state"], r["lat"], r["lon"])

        out.append(
            {
                **r,
                "region": region,
                "match": match_quality,
                "stations": matched,
            }
        )
    return out


def build_japan() -> list[dict]:
    resorts = filter_resorts("Japan")
    amedas = load_json(os.path.join(PUBLIC_DATA, "amedas-snow.json"))
    stations = [s for s in amedas["stations"] if s["id"] in amedas["histories"]]

    out = []
    for r in resorts:
        base = r["baseM"]
        summit = r["summitM"] or base + 400
        hits = nearest_stations(
            r["lat"], r["lon"], base, summit, stations,
            max_km=25.0, max_below_base_m=1200.0, elev_key="elevationM", limit=3,
        )
        matched = []
        match_quality = "none"
        if hits:
            match_quality = "nearby" if hits[0][0] <= 25 else "distant"
            for d, gap, st in hits:
                matched.append(
                    {
                        "id": st["id"],
                        "source": "amedas",
                        "name": st["name"],
                        "distanceKm": round(d, 1),
                        "elevGapM": round(gap),
                    }
                )
        out.append(
            {
                **r,
                "region": None,  # assigned client-side via geoContains
                "match": match_quality,
                "stations": matched,
            }
        )
    return out


def main() -> None:
    ensure_dirs()
    us_path = os.path.join(PUBLIC_DATA, "us-snowfall.json")
    jp_path = os.path.join(PUBLIC_DATA, "amedas-snow.json")
    if not os.path.exists(us_path):
        raise SystemExit(f"Missing {us_path} — run ingest_us_snowfall.py first")
    if not os.path.exists(jp_path):
        raise SystemExit(f"Missing {jp_path} — run ingest_amedas_snow.py first")

    us = build_us()
    jp = build_japan()

    us_out = os.path.join(PUBLIC_DATA, "resorts-us.json")
    jp_out = os.path.join(PUBLIC_DATA, "resorts-japan.json")
    with open(us_out, "w", encoding="utf-8") as f:
        json.dump(
            {
                "generatedAt": load_json(us_path).get("generatedAt"),
                "source": "OpenSkiData / OpenSkiMap.org + NOAA GHCN-Daily / SNOTEL",
                "resorts": us,
            },
            f,
            separators=(",", ":"),
        )
    with open(jp_out, "w", encoding="utf-8") as f:
        json.dump(
            {
                "generatedAt": load_json(jp_path).get("generatedAt"),
                "source": "OpenSkiData / OpenSkiMap.org + JMA AMeDAS",
                "resorts": jp,
            },
            f,
            separators=(",", ":"),
            ensure_ascii=False,
        )

    us_matched = sum(1 for r in us if r["match"] != "none")
    jp_matched = sum(1 for r in jp if r["match"] != "none")
    print(f"US resorts: {len(us)} ({us_matched} with snowfall stations) → {us_out}")
    print(f"Japan resorts: {len(jp)} ({jp_matched} with snowfall stations) → {jp_out}")


if __name__ == "__main__":
    main()
