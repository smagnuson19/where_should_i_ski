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
    <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-slate-800/40 transition"
      >
        <span className="flex items-start gap-2.5 min-w-0">
          {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white tracking-tight">{title}</span>
            {summary && <span className="block text-xs text-slate-400 mt-0.5 leading-relaxed">{summary}</span>}
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-slate-400 shrink-0 bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded-lg">
          {open ? "Hide" : "Show"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && <div className="px-4 sm:px-5 pb-4 pt-1 border-t border-slate-800/60">{children}</div>}
    </div>
  );
}
