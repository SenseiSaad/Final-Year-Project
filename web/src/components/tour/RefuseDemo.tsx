"use client";

import { CircleSlash } from "lucide-react";
import { useState } from "react";

import { Cited } from "@/components/landing/Cited";
import { Segmented } from "@/components/landing/Segmented";
import { useCountUp } from "@/hooks/useCountUp";
import type { Facts } from "@/lib/facts";
import { refuseSamples } from "@/lib/samples";

export function RefuseDemo({ facts }: { facts: Facts }) {
  const [index, setIndex] = useState(0);
  const sample = refuseSamples[index];
  const score = useCountUp(sample.score, 900);

  return (
    <div>
      <Segmented label="Sample question" options={refuseSamples.map((s) => s.label)} value={index} onChange={setIndex} />

      {/* key={index} replays the fill, answer and score together */}
      <div key={index}>
        <p className="mt-6 text-[15px] text-ink">“{sample.question}”</p>

        <div
          className={`mt-5 animate-[fade-up_500ms_var(--ease-out-soft)] rounded-xl border p-4 text-[14px] leading-[24px] [animation-delay:200ms] ${
            sample.answered ? "border-line bg-bg/50 text-ink-2" : "border-line-strong bg-raised text-ink"
          }`}
        >
          {!sample.answered && (
            <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-ink">
              <CircleSlash className="size-4 text-ink-2" strokeWidth={1.5} />
              Not enough evidence in your files
            </p>
          )}
          <Cited pieces={sample.answer} />
        </div>

        <div className="mt-8">
          <div className="relative h-1.5 rounded-full bg-raised">
            <span
              style={{ width: `${sample.score * 100}%` }}
              className={`absolute inset-y-0 left-0 origin-left animate-[grow-x_900ms_var(--ease-out-soft)] rounded-full ${
                sample.answered ? "bg-accent" : "bg-ink-3"
              }`}
            />
            <span
              aria-hidden="true"
              className="absolute -top-1.5 h-[18px] w-px bg-ink"
              style={{ left: `${facts.minScore * 100}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between font-mono text-[12px] text-ink-3">
            <span>
              Best match <span className="tabular-nums text-ink">{score.toFixed(2)}</span>
            </span>
            <span>Minimum to answer {facts.minScore}</span>
          </div>
        </div>
      </div>
      <p className="mt-6 text-[13px] text-ink-3">
        This sample shows how a weak match could lead to a refusal instead of an unsupported answer. No model is queried.
      </p>
    </div>
  );
}