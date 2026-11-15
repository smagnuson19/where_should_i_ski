import { cn } from "@/lib/utils";

export type TrailLevel = "easy" | "intermediate" | "advanced";

export const TRAIL_COLORS: Record<TrailLevel, string> = {
  easy: "#2e8b57",
  intermediate: "#1d5fbf",
  advanced: "#1c2a21",
};

const SHAPE: Record<TrailLevel, string> = {
  easy: "size-2.5 rounded-full",
  intermediate: "size-2.5",
  advanced: "size-2 mx-px rotate-45",
};

/** Ski-trail difficulty symbol: green circle, blue square, black diamond. */
export function TrailMark({ level, className }: { level: TrailLevel; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0", SHAPE[level], className)}
      style={{ backgroundColor: TRAIL_COLORS[level] }}
    />
  );
}
