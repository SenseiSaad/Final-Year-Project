"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { AccessDemo } from "@/components/tour/AccessDemo";
import { LedgerDemo } from "@/components/tour/LedgerDemo";
import { RefuseDemo } from "@/components/tour/RefuseDemo";
import { SearchDemo } from "@/components/tour/SearchDemo";
import type { Facts } from "@/lib/facts";

const tabs = [
  { id: "search", title: "Search walkthrough", text: "How sample passages are ranked" },
  { id: "refuse", title: "Sample refusal", text: "What happens when evidence is thin" },
  { id: "access", title: "Access preview", text: "Who could open which sample file" },
  { id: "ledger", title: "Audit chain demo", text: "Edit an entry and watch the chain break" },
];

export function ProductTour({ facts }: { facts: Facts }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

      {/* key={active} replays the panel's fade-up when the tab changes */}
      <div
        key={active}
        role="tabpanel"
        id={`panel-${tabs[active].id}`}
        aria-labelledby={`tab-${tabs[active].id}`}
        tabIndex={0}
        className="min-h-[420px] animate-[fade-up_380ms_var(--ease-out-soft)] border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
      >
        {active === 0 && <SearchDemo facts={facts} />}
        {active === 1 && <RefuseDemo facts={facts} />}
        {active === 2 && <AccessDemo />}
        {active === 3 && <LedgerDemo />}
      </div>
      <p className="mt-5 text-[13px] leading-[21px] text-ink-3 lg:col-start-2">
        Sample data, computed in your browser. Open the workspace to try the same ideas on your own files.
      </p>
    </div>
  );
}