"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState } from "react";

import { Segmented } from "@/components/landing/Segmented";
import type { Facts } from "@/lib/facts";
import { searchSamples } from "@/lib/samples";

gsap.registerPlugin(useGSAP);

export function SearchDemo({ facts }: { facts: Facts }) {
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const sample = searchSamples[index];

  const rows = sample.rows
    .map((row) => {
      const keyword = row.keyword * facts.keywordWeight;
      const meaning = row.meaning * facts.meaningWeight;
      return { ...row, keyword, meaning, total: keyword + meaning };
    })
    .sort((a, b) => b.total - a.total);

  useGSAP(
    () => {
      gsap.fromTo(
        "[data-bar]",
        { scaleX: 0 },
        { scaleX: 1, duration: 0.8, ease: "power3.out", stagger: 0.06, transformOrigin: "left center" },
      );
      gsap.utils.toArray<HTMLElement>("[data-score]").forEach((el) => {
        const target = Number(el.dataset.score);
        const counter = { v: 0 };
        gsap.to(counter, {
          v: target,
          duration: 0.8,
          ease: "power3.out",
          onUpdate: () => (el.textContent = counter.v.toFixed(2)),
        });
      });
    },
    { scope: root, dependencies: [index] },
  );

  return (
    <div ref={root}>
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

      <ol className="mt-5 divide-y divide-line border-y border-line">
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
                  <span data-bar className="h-full bg-accent" style={{ width: `${row.meaning * 100}%` }} />
                  <span data-bar className="h-full bg-ink-3/50" style={{ width: `${row.keyword * 100}%` }} />
                </div>
                <span data-score={row.total.toFixed(2)} className="w-9 text-right font-mono text-[12px] tabular-nums text-ink">
                  {row.total.toFixed(2)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-[13px] text-ink-3">
        The top {facts.topK} passages go to the model. Anything scoring under {facts.minScore} is left out.
      </p>
    </div>
  );
}
