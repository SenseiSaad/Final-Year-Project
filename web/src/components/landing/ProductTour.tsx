"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

import { AccessDemo } from "@/components/tour/AccessDemo";
import { LedgerDemo } from "@/components/tour/LedgerDemo";
import { RefuseDemo } from "@/components/tour/RefuseDemo";
import { SearchDemo } from "@/components/tour/SearchDemo";
import { cn } from "@/lib/cn";
import type { Facts } from "@/lib/facts";

gsap.registerPlugin(useGSAP);

const tabs = [
  { id: "search", title: "Search walkthrough", text: "How sample passages are ranked" },
  { id: "refuse", title: "Sample refusal", text: "What happens when evidence is thin" },
  { id: "access", title: "Access preview", text: "Who could open which sample file" },
  { id: "ledger", title: "Audit chain demo", text: "Edit an entry and watch the chain break" },
];

export function ProductTour({ facts }: { facts: Facts }) {
  const [active, setActive] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [bar, setBar] = useState({ top: 0, height: 0 });

  // The marker beside the tabs slides to the selected one
  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[active];
      if (el) setBar({ top: el.offsetTop, height: el.offsetHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  useGSAP(
    () => {
      gsap.fromTo(panel.current, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out" });
    },
    { dependencies: [active], scope: panel },
  );

  function onKey(event: KeyboardEvent) {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = (active + keys[event.key] + tabs.length) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div data-reveal className="mt-14 grid gap-6 lg:grid-cols-[300px_1fr] lg:gap-12">
      <div ref={list} role="tablist" aria-label="Walk-throughs" aria-orientation="vertical" onKeyDown={onKey} className="relative grid grid-cols-2 content-start gap-1 lg:grid-cols-1">
        <span
          aria-hidden="true"
          className="absolute left-0 hidden w-0.5 rounded-full bg-ink transition-[transform,height] duration-500 ease-soft lg:block"
          style={{ height: bar.height - 24, transform: `translateY(${bar.top + 12}px)` }}
        />
        {tabs.map((tab, i) => {
          const selected = i === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "rounded-[12px] px-4 py-3.5 text-left transition-colors duration-200 lg:pl-5",
                selected ? "bg-raised max-lg:ring-1 max-lg:ring-line-strong" : "hover:bg-raised/60",
              )}
            >
              <span className={cn("block text-[15px] font-medium", selected ? "text-ink" : "text-ink-2")}>{tab.title}</span>
              <span className="mt-0.5 block text-[13px] leading-[19px] text-ink-3">{tab.text}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[500px] min-w-0 overflow-hidden rounded-[20px] border border-line-strong bg-surface shadow-window">
        <div className="flex h-12 items-center justify-between border-b border-line px-5">
          <span className="text-[13px] font-medium">{tabs[active].title}</span>
          <span className="font-mono text-[12px] text-ink-3">sample data</span>
        </div>
        <div ref={panel} role="tabpanel" id={`panel-${tabs[active].id}`} aria-labelledby={`tab-${tabs[active].id}`} tabIndex={0} className="p-5 sm:p-6">
          {active === 0 && <SearchDemo facts={facts} />}
          {active === 1 && <RefuseDemo facts={facts} />}
          {active === 2 && <AccessDemo />}
          {active === 3 && <LedgerDemo />}
        </div>
      </div>
    </div>
  );
}
