"use client";

import { FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Mark } from "@/components/site/Logo";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { askSamples } from "@/lib/samples";

type Phase = "typing" | "thinking" | "streaming" | "done";

/* Joins only the plain text pieces so no file names appear inside the answer */
function plainAnswer(answer: (string | { cite: string })[]): string {
  return answer
    .filter((piece): piece is string => typeof piece === "string")
    .join("")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

/* Extracts unique source filenames with extension (e.g. leave-policy.pdf) */
function uniqueFiles(sources: Record<string, unknown>): string[] {
  const seen = new Set<string>();
  for (const key of Object.keys(sources)) {
    const file = key.split(" | ")[0].trim();
    if (file) seen.add(file);
  }
  return Array.from(seen);
}

export function AskPreview({ startDelay = 900 }: { startDelay?: number }) {
  const reduce = useReducedMotion();
  const [sampleIndex, setSampleIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const firstRun = useRef(true);

  const sample = askSamples[sampleIndex];
  const words = useMemo(() => plainAnswer(sample.answer).match(/\S+\s*|\s+/g) ?? [], [sample]);
  const files = useMemo(() => uniqueFiles(sample.sources), [sample]);

  useEffect(() => {
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

    if (reduce) {
      later(() => {
        setTyped(sample.question.length);
        setShown(words.length);
        setPhase("done");
      }, 0);
      return () => timers.forEach(clearTimeout);
    }

    const delay = firstRun.current ? startDelay : 150;
    firstRun.current = false;
    let t = delay;
    for (let i = 1; i <= sample.question.length; i++) {
      t += 20;
      later(() => setTyped(i), t);
    }
    later(() => setPhase("thinking"), (t += 180));
    t += 620;
    later(() => setPhase("streaming"), t);
    words.forEach((_, i) => {
      t += 38;
      later(() => setShown(i + 1), t);
    });
    later(() => setPhase("done"), (t += 100));
    return () => timers.forEach(clearTimeout);
  }, [sample, words, reduce, startDelay]);

  function pick(index: number) {
    if (index === sampleIndex) return;
    setTyped(0);
    setShown(0);
    setPhase("typing");
    setSampleIndex(index);
  }

  return (
    <div className="border-y border-line-strong py-6">
      {/* Top strip: language switcher without boxed chrome */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-5">
        <span className="text-[13px] font-semibold text-ink">Sample chat preview</span>
        <div className="flex gap-1" role="group" aria-label="Sample question">
          {askSamples.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={i === sampleIndex}
              className={`h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150 ${
                i === sampleIndex ? "bg-btn text-on-btn" : "text-ink-3 hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Open vertical flow: Question -> Full Answer -> Source files beneath */}
      <div className="min-h-[224px] space-y-5 border-t border-line pt-5" aria-live="polite">
        <div className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-medium text-ink" aria-hidden="true">
            U
          </span>
          <p className="pt-0.5 text-[15px] font-medium leading-[23px] text-ink">
            {sample.question.slice(0, typed)}
            {phase === "typing" && typed < sample.question.length && (
              <span className="ml-px inline-block h-4 w-px translate-y-[3px] bg-ink" aria-hidden="true" />
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <Mark className="size-7 shrink-0" />
          <div className="min-w-0 flex-1 pt-0.5">
            {phase === "thinking" && (
              <p className="text-[14px] leading-[22px] text-ink-3">Searching documents you can open…</p>
            )}
            {(phase === "streaming" || phase === "done") && (
              <p className="text-[15px] leading-[25px] text-ink-2">{words.slice(0, shown).join("")}</p>
            )}

            {phase === "done" && (
              <div
                className="mt-4 flex flex-wrap items-center gap-3 animate-[fade-up_260ms_var(--ease-out-soft)]"
                aria-label="Source files"
              >
                {files.map((file) => (
                  <span
                    key={file}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink"
                  >
                    <FileText className="size-3.5 shrink-0 text-ink-3" strokeWidth={1.5} aria-hidden="true" />
                    {file}
                  </span>
                ))}
              </div>
            )}

            <p
              className={`mt-3 text-[13px] text-ink-3 transition-opacity duration-300 ${
                phase === "done" ? "opacity-100" : "opacity-0"
              }`}
            >
              Sample response · illustrative content
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
