"use client";

import { useEffect, useRef, useState } from "react";

/* Counts a number up over `duration` ms with an ease-out curve. */
export function useCountUp(target: number, duration = 800, delay = 0) {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || duration <= 0) {
      timer = window.setTimeout(() => setValue(target), 0);
      return () => window.clearTimeout(timer);
    }

    let start: number | null = null;

    const step = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };

    timer = window.setTimeout(() => {
      frame.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      if (timer) window.clearTimeout(timer);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, duration, delay]);

  return value;
}