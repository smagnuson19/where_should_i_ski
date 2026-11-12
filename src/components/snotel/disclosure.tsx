"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface DisclosureProps {
  title: React.ReactNode;
  summary?: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Collapsible card; children mount only while open so hidden charts cost nothing. */
export function Disclosure({ title, summary, icon, defaultOpen = false, children }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800/40 rounded-xl transition"
      >
        <span className="flex items-start gap-2 min-w-0">
          {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">{title}</span>
            {summary && <span className="block text-xs text-slate-400 mt-0.5">{summary}</span>}
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
          {open ? "Hide" : "Show"}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
