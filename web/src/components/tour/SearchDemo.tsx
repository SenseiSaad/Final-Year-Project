"use client";

import { useState } from "react";

import { Segmented } from "@/components/landing/Segmented";
import { useCountUp } from "@/hooks/useCountUp";
import type { Facts } from "@/lib/facts";
import { searchSamples } from "@/lib/samples";

function Score({ value, delay }: { value: number; delay: number }) {
  const score = useCountUp(value, 800, delay);
  return <span className="w-9 text-right font-mono text-[12px] tabular-nums text-ink">{score.toFixed(2)}</span>;
}

export function SearchDemo({ facts }: { facts: Facts }) {
  const [index, setIndex] = useState(0);
  const sample = searchSamples[index];

  const rows = sample.rows
    .map((row) => {
      const keyword = row.keyword * facts.keywordWeight;
      const meaning = row.meaning * facts.meaningWeight;
      return { ...row, keyword, meaning, total: keyword + meaning };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented label="Sample question" options={searchSamples.map((s) => s.label)} value={index} onChange={setIndex} />
        <div className="flex gap-4 text-[12px] text-ink-3">
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-[2px] bg-accent" /> Meaning × {facts.meaningWeight}
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-[2px] bg-ink-3/50" /> Keyword × {facts.keywordWeight}
          </span>
        </div>
      </div>

      <p className="mt-6 text-[15px] text-ink">“{sample.query}”</p>

      {/* key={index} replays the bars and scores together */}
      <ol key={index} className="mt-5 divide-y divide-line border-y border-line">
        {rows.map((row, i) => {
          const used = i < facts.topK && row.total >= facts.minScore;
          return (
            <li key={row.ref} className={`grid gap-2 py-3 sm:grid-cols-[1fr_200px] sm:items-center sm:gap-6 ${used ? "" : "opacity-45"}`}>
              <div className="min-w-0">
                <span className="cite">{row.ref}</span>
                <p className="mt-1.5 truncate text-[13px] text-ink-2">{row.snippet}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                  <span
                    style={{ width: `${row.meaning * 100}%`, animationDelay: `${i * 60}ms` }}
                    className="h-full origin-left animate-[grow-x_800ms_var(--ease-out-soft)] bg-accent"
                  />
                  <span
                    style={{ width: `${row.keyword * 100}%`, animationDelay: `${i * 60}ms` }}
                    className="h-full origin-left animate-[grow-x_800ms_var(--ease-out-soft)] bg-ink-3/50"
                  />
                </div>
                <Score value={row.total} delay={i * 60} />
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-[13px] text-ink-3">
        This sample highlights the top {facts.topK} passages as possible context. Matches below {facts.minScore} are left out; no model is called.
      </p>
    </div>
  );
}