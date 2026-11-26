"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/components/motion/useReducedMotion";

/* Cycles through words, each rising out of a mask. Hidden from screen readers: the heading carries the plain sentence. */
export function RotatingWord({ words, interval = 2800 }: { words: string[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  const longest = words.reduce((a, b) => (a.length >= b.length ? a : b), words[0] ?? "");

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => window.clearInterval(timer);
  }, [interval, reduced, words.length]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    gsap.fromTo(ref.current, { yPercent: 105 }, { yPercent: 0, duration: 0.7, ease: "power4.out" });
  }, [index, reduced]);

  return (
    <span aria-hidden="true" className="relative inline-grid overflow-hidden align-bottom">
      <span className="invisible col-start-1 row-start-1 whitespace-nowrap">{longest}</span>
      <span ref={ref} className="col-start-1 row-start-1 whitespace-nowrap">
        {words[index]}
      </span>
    </span>
  );
}
