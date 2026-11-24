"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState, type KeyboardEvent } from "react";

import { AccessDemo } from "@/components/tour/AccessDemo";
import { LedgerDemo } from "@/components/tour/LedgerDemo";
import { RefuseDemo } from "@/components/tour/RefuseDemo";
import { SearchDemo } from "@/components/tour/SearchDemo";
import type { Facts } from "@/lib/facts";

gsap.registerPlugin(useGSAP);

const tabs = [
  { id: "search", title: "Finds the right passages", text: "Keyword and meaning search, ranked together" },
  { id: "refuse", title: "Refuses to guess", text: "Weak evidence gets an honest reply" },
  { id: "access", title: "Respects who can see what", text: "Permissions apply before search begins" },
  { id: "ledger", title: "Keeps a record nobody can quietly edit", text: "Every action chained with SHA-256" },
];

export function ProductTour({ facts }: { facts: Facts }) {
  const [active, setActive] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useGSAP(
    () => {
      gsap.fromTo(panel.current, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out" });
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
    <div data-reveal className="mt-14 grid gap-6 lg:grid-cols-[300px_1fr] lg:gap-10">
      <div role="tablist" aria-label="Product tour" aria-orientation="vertical" onKeyDown={onKey} className="grid content-start gap-1">
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
              className={`relative rounded-xl px-4 py-3.5 text-left transition-colors duration-200 ${
                selected ? "bg-surface shadow-[0_0_0_1px_var(--line)]" : "hover:bg-surface/60"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-y-3 left-0 w-0.5 rounded-full bg-accent transition-opacity duration-200 ${
                  selected ? "opacity-100" : "opacity-0"
                }`}
              />
              <span className={`block text-[15px] font-medium ${selected ? "text-ink" : "text-ink-2"}`}>{tab.title}</span>
              <span className="mt-0.5 block text-[13px] text-ink-3">{tab.text}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[480px] overflow-hidden rounded-2xl border border-line bg-surface shadow-window">
        <div className="flex h-11 items-center justify-between border-b border-line px-5">
          <span className="text-[13px] font-medium">{tabs[active].title}</span>
          <span className="font-mono text-[12px] text-ink-3">sample workspace</span>
        </div>
        <div
          ref={panel}
          role="tabpanel"
          id={`panel-${tabs[active].id}`}
          aria-labelledby={`tab-${tabs[active].id}`}
          tabIndex={0}
          className="p-5 sm:p-6"
        >
          {active === 0 && <SearchDemo facts={facts} />}
          {active === 1 && <RefuseDemo facts={facts} />}
          {active === 2 && <AccessDemo />}
          {active === 3 && <LedgerDemo />}
        </div>
      </div>
    </div>
  );
}
