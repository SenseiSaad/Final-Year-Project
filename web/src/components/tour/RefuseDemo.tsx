"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CircleSlash } from "lucide-react";
import { useRef, useState } from "react";

import { Cited } from "@/components/landing/Cited";
import { Segmented } from "@/components/landing/Segmented";
import type { Facts } from "@/lib/facts";
import { refuseSamples } from "@/lib/samples";

gsap.registerPlugin(useGSAP);

export function RefuseDemo({ facts }: { facts: Facts }) {
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const sample = refuseSamples[index];

  useGSAP(
    () => {
      gsap.fromTo("[data-fill]", { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.out", transformOrigin: "left center" });
      gsap.fromTo("[data-answer]", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.2 });
      const el = root.current?.querySelector<HTMLElement>("[data-best]");
      if (el) {
        const counter = { v: 0 };
        gsap.to(counter, { v: sample.score, duration: 0.9, ease: "power3.out", onUpdate: () => (el.textContent = counter.v.toFixed(2)) });
      }
    },
    { scope: root, dependencies: [index] },
  );

  return (
    <div ref={root}>
      <Segmented label="Sample question" options={refuseSamples.map((s) => s.label)} value={index} onChange={setIndex} />

      <p className="mt-6 text-[15px] text-ink">“{sample.question}”</p>

      <div
        data-answer
        className={`mt-5 rounded-xl border p-4 text-[14px] leading-[24px] ${
          sample.answered ? "border-line bg-bg/50 text-ink-2" : "border-line-strong bg-raised text-ink"
        }`}
      >
        {!sample.answered && (
          <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-ink">
            <CircleSlash className="size-4 text-ink-2" strokeWidth={1.5} />
            Not enough evidence
          </p>
        )}
        <Cited pieces={sample.answer} />
      </div>

      <div className="mt-8">
        <div className="relative h-1.5 rounded-full bg-raised">
          <span
            data-fill
            className={`absolute inset-y-0 left-0 rounded-full ${sample.answered ? "bg-accent" : "bg-ink-3"}`}
            style={{ width: `${sample.score * 100}%` }}
          />
          <span
            aria-hidden="true"
            className="absolute -top-1.5 h-[18px] w-px bg-ink"
            style={{ left: `${facts.minScore * 100}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between font-mono text-[12px] text-ink-3">
          <span>
            Best match <span data-best className="tabular-nums text-ink">{sample.score.toFixed(2)}</span>
          </span>
          <span>Minimum to answer {facts.minScore}</span>
        </div>
      </div>
      <p className="mt-6 text-[13px] text-ink-3">
        Below the minimum, DocuTrust declines instead of filling the gap from general knowledge.
      </p>
    </div>
  );
}
