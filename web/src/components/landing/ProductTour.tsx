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
      gsap.fromTo(panel.current, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.38, ease: "power3.out" });
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
    <div data-reveal className="mt-14 grid gap-10 lg:grid-cols-[290px_1fr] lg:gap-12">
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
              className={`relative py-3.5 pl-4 pr-3 text-left transition-colors duration-150 ${
                selected ? "text-ink" : "text-ink-3 hover:text-ink"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-y-2.5 left-0 w-[2px] bg-ink transition-opacity duration-150 ${
                  selected ? "opacity-100" : "opacity-0"
                }`}
              />
              <span className={`block text-[15px] font-medium ${selected ? "text-ink" : "text-ink-2"}`}>{tab.title}</span>
              <span className="mt-0.5 block text-[13px] text-ink-3">{tab.text}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={panel}
        role="tabpanel"
        id={`panel-${tabs[active].id}`}
        aria-labelledby={`tab-${tabs[active].id}`}
        tabIndex={0}
        className="min-h-[420px] border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
      >
        {active === 0 && <SearchDemo facts={facts} />}
        {active === 1 && <RefuseDemo facts={facts} />}
        {active === 2 && <AccessDemo />}
        {active === 3 && <LedgerDemo />}
      </div>
    </div>
  );
}
