"use client";

import { useTheme } from "next-themes";
import { useCallback, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import { liquidKeyframes } from "./liquid";

const subscribe = () => () => {};

/* Theme state plus a toggle that floods the new theme in from a point on screen */
export function useLiquidTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = mounted ? resolvedTheme === "dark" : true;
  const next = dark ? "light" : "dark";

  const toggle = useCallback(
    (origin?: { x: number; y: number }) => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!document.startViewTransition || reduce) {
        setTheme(next);
        return;
      }
      const x = origin?.x ?? innerWidth / 2;
      const y = origin?.y ?? innerHeight / 2;
      const corner = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const transition = document.startViewTransition(() => {
        flushSync(() => setTheme(next));
      });
      transition.ready.then(() => {
        document.documentElement.animate(liquidKeyframes(x, y, corner), {
          duration: 1000,
          easing: "linear",
          pseudoElement: "::view-transition-new(root)",
        });
      });
    },
    [next, setTheme],
  );

  return { dark, next, toggle };
}
