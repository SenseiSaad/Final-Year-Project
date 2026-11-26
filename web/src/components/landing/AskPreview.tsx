"use client";

import { CornerDownLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { Mark } from "@/components/site/Logo";
import { cn } from "@/lib/cn";
import { askSamples } from "@/lib/samples";


type Phase = "typing" | "thinking" | "streaming" | "done";

/* Splits the plain answer into words so it can stream in like the real chat. Sources are shown after it, never inside it. */
function tokenize(answer: (string | { cite: string })[]) {
  const text = answer.filter((piece): piece is string => typeof piece === "string").join("").replace(/\s+([.,])/g, "$1");
  return text.match(/\S+\s*|\s+/g) ?? [];
}

const fileOf = (ref: string) => ref.split(" | ")[0];

export function AskPreview({ startDelay = 1400 }: { startDelay?: number }) {
  const reduce = useReducedMotion();
  const [sampleIndex, setSampleIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [active, setActive] = useState<string | null>(null);
  const firstRun = useRef(true);

  const sample = askSamples[sampleIndex];
  const tokens = useMemo(() => tokenize(sample.answer), [sample]);
  const fileNames = useMemo(() => [...new Set(Object.keys(sample.sources).map(fileOf))], [sample]);

  useEffect(() => {
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const firstCite = fileOf(Object.keys(sample.sources)[0]);

    if (reduce) {
      later(() => {
        setTyped(sample.question.length);
        setShown(tokens.length);
        setPhase("done");
        setActive(firstCite);
      }, 0);
      return () => timers.forEach(clearTimeout);
    }

    let t = firstRun.current ? startDelay : 150;
    firstRun.current = false;
    for (let i = 1; i <= sample.question.length; i++) {
      t += 22;
      later(() => setTyped(i), t);
    }
    later(() => setPhase("thinking"), (t += 200));
    t += 700;
    later(() => setPhase("streaming"), t);
    tokens.forEach((_, index) => {
      t += 40;
      later(() => setShown(index + 1), t);
    });
    later(() => setPhase("done"), (t += 100));
    later(() => setActive(firstCite), (t += 500));
    return () => timers.forEach(clearTimeout);
  }, [sample, tokens, reduce, startDelay]);

  function pick(index: number) {
    if (index === sampleIndex) return;
    setTyped(0);
    setShown(0);
    setPhase("typing");
    setActive(null);
    setSampleIndex(index);
  }

  const visible = tokens.slice(0, shown).join("");

  return (
    <div className="overflow-hidden rounded-[20px] border border-line-strong bg-surface shadow-window">
      <div className="flex h-12 items-center justify-between border-b border-line px-5">
        <span className="text-[13px] font-medium">Ask</span>
        <span className="flex items-center gap-2 font-mono text-[12px] text-ink-3">
          <span className="size-1.5 rounded-full bg-ok" aria-hidden="true" />
          Local model · sample workspace
        </span>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-h-[220px] space-y-5 p-5 sm:p-6" aria-live="polite">
          <div className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-[8px] border border-line-strong font-mono text-[12px] text-ink" aria-label="You">
              U
            </span>
            <p className="pt-0.5 text-[15px] leading-[24px] text-ink">
              {sample.question.slice(0, typed)}
              {phase === "typing" && typed < sample.question.length && (
                <span className="ml-px inline-block h-4 w-px translate-y-[3px] bg-ink-2" aria-hidden="true" />
              )}
            </p>
          </div>

          <div className="flex gap-3">
            <Mark className="size-7" />
            <div className="min-w-0 flex-1 pt-0.5">
              {phase === "thinking" && <p className="font-mono text-[12px] leading-[24px] text-ink-3">Searching documents you can open</p>}
              {(phase === "streaming" || phase === "done") && (
                <p className="text-[15px] leading-[27px] text-ink-2">
                  {visible}
                </p>
              )}
              {phase === "done" && (
                <ul className="mt-4 flex animate-[rise-in_340ms_var(--ease-soft)_both] flex-wrap gap-2" aria-label="Source files">
                  {fileNames.map((name) => (
                    <li key={name}>
                      <button type="button" className="cite" aria-pressed={active === name} onClick={() => setActive(name)}>
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className={cn("mt-3 font-mono text-[12px] text-ink-3 transition-opacity duration-300", phase === "done" ? "opacity-100" : "opacity-0")}>
                {sample.meta}
              </p>
            </div>
          </div>
        </div>

        <aside className="border-t border-line bg-deep/60 p-5 md:border-l md:border-t-0" aria-label="Sources">
          <p className="text-[13px] font-medium">Sources</p>
          {phase === "done" ? (
            <ul className="mt-3 grid grid-cols-1 gap-3">
              {fileNames.map((name) => {
                const passages = Object.values(sample.sources).filter((p) => fileOf(p.ref) === name);
                return (
                  <li key={name} className={cn("animate-[rise-in_340ms_var(--ease-soft)_both] border-l-2 pl-3 transition-colors duration-300", active === name ? "border-ink" : "border-line")}>
                    <p className="font-mono text-[12px] leading-[18px] text-ink">{name}</p>
                    <p className="mt-1 text-[13px] leading-[20px] text-ink-3">{sample.files[name]}</p>
                    <p className="mt-2 text-[12px] text-ink-3">Used in the answer</p>
                    {passages.map((p) => (
                      <p key={p.ref} className="mt-1 text-[13px] leading-[20px] text-ink-2">
                        <span className="font-mono text-[11px] text-ink-3">p. {p.ref.split(" | ")[1]} </span>
                        {p.text.split(p.highlight)[0]}
                        <mark className="rounded-[3px] bg-mark px-0.5 text-ink">{p.highlight}</mark>
                        {p.text.split(p.highlight)[1]}
                      </p>
                    ))}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] leading-[21px] text-ink-3">Once the answer finishes, each file it used is listed here with what it contains and the passage taken from it.</p>
          )}
        </aside>
      </div>

      <div className="flex items-center gap-3 border-t border-line px-4 py-3">
        <div className="flex gap-1" role="group" aria-label="Sample question">
          {askSamples.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={i === sampleIndex}
              className={cn(
                "h-8 rounded-[8px] px-3 text-[13px] transition-colors duration-150",
                i === sampleIndex ? "bg-raised text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="hidden flex-1 truncate text-[13px] text-ink-3 sm:block">Ask in English or Roman Urdu</span>
        <span className="kbd ml-auto" aria-hidden="true">
          <CornerDownLeft className="size-3.5" strokeWidth={1.5} />
        </span>
      </div>
    </div>
  );
}
