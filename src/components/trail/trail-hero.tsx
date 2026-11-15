import React, { useId } from "react";
import { TRAIL_COLORS } from "@/components/trail/trail-mark";

const TILE_WIDTH = 1600;
const ART_HEIGHT = 120;

const RIDGE =
  "M0 120 L0 70 L70 50 L130 66 L200 38 L260 62 L330 48 L380 64 L460 30 L520 58 L570 50 L610 62 L690 26 L740 50 " +
  "L800 12 L870 48 L920 36 L960 52 L1030 24 L1090 60 L1150 46 L1200 62 L1270 30 L1330 60 L1390 44 L1440 62 " +
  "L1520 40 L1570 58 L1600 70 L1600 120 Z";

const SHADED_FACES = [
  "200,38 260,62 244,84 216,98 206,64",
  "460,30 520,58 504,80 478,96 466,58",
  "690,26 740,50 726,74 700,92 696,52",
  "800,12 870,48 852,76 822,96 810,50",
  "1030,24 1090,60 1070,84 1044,98 1036,56",
  "1270,30 1330,60 1312,84 1284,98 1276,60",
  "1520,40 1570,58 1556,80 1530,96 1524,64",
];

const RUNS: { d: string; color: string }[] = [
  { d: "M198 42 C 204 62, 188 76, 196 94", color: TRAIL_COLORS.advanced },
  { d: "M458 34 C 450 58, 472 74, 464 94", color: TRAIL_COLORS.easy },
  { d: "M688 30 C 676 52, 656 70, 648 94", color: TRAIL_COLORS.easy },
  { d: "M798 16 C 786 46, 822 64, 806 94", color: TRAIL_COLORS.intermediate },
  { d: "M1028 30 C 1036 54, 1016 72, 1028 94", color: TRAIL_COLORS.advanced },
  { d: "M1268 34 C 1260 58, 1284 74, 1276 94", color: TRAIL_COLORS.intermediate },
];

function MountainRange({ treesId, treesBackId }: { treesId: string; treesBackId: string }) {
  return (
    <>
      <path d={RIDGE} fill="#ffffff" stroke="#a9bccb" strokeWidth={1} />
      {SHADED_FACES.map((points) => (
        <polygon key={points} points={points} fill="#c9d6e2" />
      ))}
      {RUNS.map((run) => (
        <path key={run.d} d={run.d} fill="none" stroke={run.color} strokeWidth={2.2} strokeDasharray="5 4" />
      ))}
      <line x1={870} y1={98} x2={916} y2={40} stroke="#4a4f45" strokeWidth={1.2} />
      <line x1={885} y1={79} x2={885} y2={86} stroke="#4a4f45" strokeWidth={1.2} />
      <line x1={900} y1={60} x2={900} y2={67} stroke="#4a4f45" strokeWidth={1.2} />
      <rect x={912} y={36} width={8} height={5} fill="#4a4f45" />
      <rect x={0} y={84} width={TILE_WIDTH} height={14} fill={`url(#${treesBackId})`} />
      <rect x={0} y={94} width={TILE_WIDTH} height={16} fill={`url(#${treesId})`} />
      <path d="M0 120 L0 109 L400 107 L800 110 L1200 107 L1600 109 L1600 120 Z" fill="currentColor" />
    </>
  );
}

/**
 * Sky band with a repeating trail-map mountain panorama along the bottom. The panorama
 * tiles horizontally at a fixed pixel height, so the peaks are never cropped at any width.
 */
export function TrailHero({ children }: { children: React.ReactNode }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const panoramaId = `trail-panorama-${id}`;
  const treesId = `trail-trees-${id}`;
  const treesBackId = `trail-trees-back-${id}`;

  return (
    <section className="relative overflow-hidden bg-linear-to-b from-alpine-sky via-alpine-haze via-55% to-slate-100">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-32">{children}</div>
      <svg
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 w-full text-slate-100"
        height={ART_HEIGHT}
      >
        <defs>
          <pattern id={treesId} width={16} height={16} patternUnits="userSpaceOnUse">
            <polygon points="8,1 14,15 2,15" fill="#2f5d43" />
          </pattern>
          <pattern id={treesBackId} x={5} width={10} height={14} patternUnits="userSpaceOnUse">
            <polygon points="5,2 9,13 1,13" fill="#4f7a5e" />
          </pattern>
          <pattern id={panoramaId} x="50%" width={TILE_WIDTH} height={ART_HEIGHT} patternUnits="userSpaceOnUse">
            <g transform={`translate(${-TILE_WIDTH / 2} 0)`}>
              <MountainRange treesId={treesId} treesBackId={treesBackId} />
            </g>
            <g transform={`translate(${TILE_WIDTH / 2} 0)`}>
              <MountainRange treesId={treesId} treesBackId={treesBackId} />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height={ART_HEIGHT} fill={`url(#${panoramaId})`} />
      </svg>
    </section>
  );
}
