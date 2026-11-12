"use client";

import React from "react";
import { BookOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Disclosure } from "@/components/snotel/disclosure";
import { GLOSSARY, GlossaryKey } from "@/lib/snotel/glossary";

/** Inline jargon with a dotted underline; hover or focus shows the plain-language definition. */
export function Term({ k, children }: { k: GlossaryKey; children?: React.ReactNode }) {
  const entry = GLOSSARY[k];
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span tabIndex={0} />}
        className="underline decoration-dotted decoration-slate-500 underline-offset-2 cursor-help"
      >
        {children ?? entry.term}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs leading-relaxed">
        <span>
          <strong>{entry.term}:</strong> {entry.definition}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

export function GlossaryPanel() {
  return (
    <Disclosure
      title="Glossary"
      summary="What SWE, ONI, % of median and the other terms on this page mean"
      icon={<BookOpen className="w-4 h-4 text-sky-400" />}
    >
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
        {Object.values(GLOSSARY).map((g) => (
          <div key={g.term}>
            <dt className="font-semibold text-slate-100">{g.term}</dt>
            <dd className="text-slate-400 leading-relaxed mt-0.5">{g.definition}</dd>
          </div>
        ))}
      </dl>
    </Disclosure>
  );
}
