"use client";

import { useInView } from "motion/react";
import { useRef } from "react";

import { AnimatedNumber } from "@/components/core/animated-number";

const items = [
  { value: 50, suffix: "", label: "documents per person" },
  { value: 10, suffix: " MB", label: "per file" },
  { value: 3, suffix: "", label: "permission roles" },
  { value: 4, suffix: "", label: "file types" },
];

export function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <section aria-label="Product facts" className="border-b border-line">
      <div ref={ref} className="container-page grid grid-cols-2 gap-x-8 gap-y-10 py-12 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} data-reveal>
            <p className="font-mono text-[11px] text-ink-3">{item.label}</p>
            <p className="mt-2 flex items-baseline gap-1 text-[40px] font-medium leading-none tracking-[-0.03em] text-ink">
              <AnimatedNumber
                value={inView ? item.value : 0}
                springOptions={{ bounce: 0, duration: 1400 }}
              />
              {item.suffix && <span className="text-[18px] text-ink-2">{item.suffix}</span>}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}