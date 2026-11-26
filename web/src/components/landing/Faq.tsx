"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import type { Facts } from "@/lib/facts";
import { FAQ } from "@/lib/faq";

import { SectionHead } from "./SectionHead";

export function Faq({ facts }: { facts: Facts }) {
  const [open, setOpen] = useState<Set<number>>(new Set([0]));

  // The search bar can open a specific question
  useEffect(() => {
    const onOpen = (event: Event) => {
      const index = (event as CustomEvent<number>).detail;
      setOpen((current) => new Set(current).add(index));
      window.setTimeout(() => document.getElementById(`faq-q-${index}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 80);
    };
    window.addEventListener("faq:open", onOpen);
    return () => window.removeEventListener("faq:open", onOpen);
  }, []);

  function toggle(index: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <section id="faq" aria-labelledby="faq-title" className="py-28 md:py-36">
      <div className="container-page grid gap-14 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-20">
        <SectionHead id="faq-title" title="Questions teams ask first" lead="Straight answers about models, files and access." />
        <div data-reveal className="border-t border-line">
          {FAQ.map((item, i) => {
            const isOpen = open.has(i);
            return (
              <div key={item.q} className="border-b border-line">
                <h3>
                  <button
                    type="button"
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => toggle(i)}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left text-[17px] font-medium leading-[1.4] text-ink"
                  >
                    {item.q}
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong text-ink-2 transition-colors duration-200 group-hover:bg-ink group-hover:text-on-ink">
                      <Plus className={cn("size-4 transition-transform duration-300 ease-soft", isOpen && "rotate-45")} strokeWidth={1.5} />
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-a-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  inert={!isOpen}
                  className={cn("grid transition-[grid-template-rows,opacity] duration-400 ease-soft", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-[40rem] pb-7 text-[15px] leading-[26px] text-ink-2">{item.a(facts)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
