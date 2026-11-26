"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export function RotatingWord({
  words,
  interval = 2600,
  className = "",
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const longest = words.reduce((a, b) => (a.length >= b.length ? a : b), words[0] ?? "");

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => window.clearInterval(timer);
  }, [interval, words.length]);

  return (
    <span className={`relative inline-grid overflow-hidden align-baseline ${className}`} aria-hidden="true">
      <span className="invisible col-start-1 row-start-1 whitespace-nowrap">{longest}</span>
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={words[index]}
          initial={reduced ? false : { y: "105%", opacity: 0.2 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 1 } : { y: "-105%", opacity: 0.2 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="col-start-1 row-start-1 whitespace-nowrap italic"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}