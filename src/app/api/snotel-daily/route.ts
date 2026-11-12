import { NextResponse } from "next/server";

const AWDB_BASE = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const triplet = searchParams.get("triplet");
  const waterYearStr = searchParams.get("waterYear") || "2023";

  if (!triplet || !/^[0-9A-Za-z]+:[A-Z]{2}:SNTLT?$/.test(triplet)) {
    return NextResponse.json({ error: "Valid SNOTEL stationTriplet is required" }, { status: 400 });
  }

  const wy = parseInt(waterYearStr, 10);
  if (isNaN(wy) || wy < 1930 || wy > 2027) {
    return NextResponse.json({ error: "Valid waterYear between 1930 and 2027 is required" }, { status: 400 });
  }

  const beginDate = `${wy - 1}-10-01`;
  const endDate = `${wy}-09-30`;

  try {
    const url = `${AWDB_BASE}/data?stationTriplets=${encodeURIComponent(
      triplet
    )}&elements=WTEQ,SNWD,TAVG,TMAX,TMIN,PREC&duration=DAILY&beginDate=${beginDate}&endDate=${endDate}`;

    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SNOTEL-ENSO-Climate-Explorer/1.0",
      },
      next: { revalidate: 3600 },
    });

    if (!resp.ok) {
      throw new Error(`USDA AWDB API returned HTTP ${resp.status}`);
    }

    const raw = await resp.json();
    const stBlock = raw?.[0];
    if (!stBlock || !stBlock.data) {
      return NextResponse.json({ triplet, waterYear: wy, days: [], summary: null });
    }

    const dayMap: Record<
      string,
      {
        date: string;
        WTEQ?: number;
        SNWD?: number;
        TAVG?: number;
        TMAX?: number;
        TMIN?: number;
        PREC?: number;
      }
    > = {};

    for (const block of stBlock.data) {
      const code = block?.stationElement?.elementCode;
      if (!code) continue;
      for (const v of block.values || []) {
        if (!v.date || v.value === null || v.value === undefined) continue;
        if (!dayMap[v.date]) {
          dayMap[v.date] = { date: v.date };
        }
        dayMap[v.date][code as "WTEQ" | "SNWD" | "TAVG" | "TMAX" | "TMIN" | "PREC"] = Number(v.value);
      }
    }

    const sortedDates = Object.keys(dayMap).sort();
    let prevSnwd: number | null = null;
    let prevSwe: number | null = null;

    let events2in = 0;
    let events6in = 0;
    let events12in = 0;
    let max24hSnow = 0;
    let max24hSwe = 0;
    let totalDailySnowIn = 0;
    let subfreezingDays = 0;

    const days = sortedDates.map((d) => {
      const row = dayMap[d];
      const snwd = row.SNWD ?? null;
      const swe = row.WTEQ ?? null;
      const tavg =
        row.TAVG !== undefined
          ? row.TAVG
          : row.TMAX !== undefined && row.TMIN !== undefined
          ? Number(((row.TMAX + row.TMIN) / 2).toFixed(1))
          : null;

      let snowfall24h = 0;
      if (snwd !== null && prevSnwd !== null && snwd > prevSnwd && snwd - prevSnwd <= 48) {
        snowfall24h = Number((snwd - prevSnwd).toFixed(1));
        totalDailySnowIn += snowfall24h;
        if (snowfall24h >= 2) events2in++;
        if (snowfall24h >= 6) events6in++;
        if (snowfall24h >= 12) events12in++;
        if (snowfall24h > max24hSnow) max24hSnow = snowfall24h;
      }

      let sweGain24h = 0;
      if (swe !== null && prevSwe !== null && swe > prevSwe && swe - prevSwe <= 8) {
        sweGain24h = Number((swe - prevSwe).toFixed(2));
        if (sweGain24h > max24hSwe) max24hSwe = sweGain24h;
      }

      if (row.TMAX !== undefined && row.TMAX <= 32) {
        subfreezingDays++;
      }

      if (snwd !== null) prevSnwd = snwd;
      if (swe !== null) prevSwe = swe;

      return {
        date: d,
        swe: swe,
        snwd: snwd,
        tavg: tavg,
        tmax: row.TMAX ?? null,
        tmin: row.TMIN ?? null,
        prec: row.PREC ?? null,
        snowfall24h,
        sweGain24h,
      };
    });

    return NextResponse.json({
      triplet,
      waterYear: wy,
      days,
      summary: {
        events2in,
        events6in,
        events12in,
        max24hSnow: Number(max24hSnow.toFixed(1)),
        max24hSwe: Number(max24hSwe.toFixed(2)),
        totalDailySnowIn: Number(totalDailySnowIn.toFixed(1)),
        subfreezingDays,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch live SNOTEL daily trace";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
