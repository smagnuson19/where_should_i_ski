#!/usr/bin/env bash
# Builds src/data/japan-forecast-areas.topo.json for the Japan dashboard map.
#
# Source: JMA forecast-area GIS data (一次細分区域, primary subdivisions), published at
# https://www.data.jma.go.jp/developer/gis.html under the Japanese Government Standard Terms of Use.
# Each feature keeps its JMA area code; the first two digits are the prefecture code, and
# src/lib/japan/map.ts assigns areas to the dashboard's eight climate regions.
#
# Distant island groups (Okinawa, Amami, Tanegashima/Yakushima, southern Izu, Ogasawara and the
# islands east of the Nemuro Peninsula) and islets under 40 km² are dropped so the map frames the
# main islands. Requires curl, python3 and npx (mapshaper is fetched on demand).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/src/data/japan-forecast-areas.topo.json"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

curl -sL --fail -o "$WORK/areas.zip" \
  https://www.data.jma.go.jp/developer/gis/20190125_AreaForecastLocalM_1saibun_GIS.zip

# The archive's member names are Shift-JIS, which unzip on macOS rejects; extract by extension.
python3 - "$WORK" <<'EOF'
import sys, zipfile
work = sys.argv[1]
with zipfile.ZipFile(f"{work}/areas.zip") as z:
    for info in z.infolist():
        ext = info.filename.rsplit(".", 1)[-1].lower()
        with open(f"{work}/areas.{ext}", "wb") as f:
            f.write(z.read(info))
EOF

npx -y mapshaper@0.6 -i "$WORK/areas.shp" encoding=utf8 \
  -filter 'code !== "" && !code.startsWith("47") && ["460030","460040","130030","130040"].indexOf(code) === -1' \
  -explode \
  -each 'cx=this.centroidX' \
  -filter 'code !== "014010" || cx < 145.85' \
  -filter-islands min-area=40km2 \
  -dissolve code \
  -simplify 0.08% keep-shapes \
  -rename-layers areas \
  -o format=topojson quantization=8000 "$OUT"

echo "Wrote $OUT"
