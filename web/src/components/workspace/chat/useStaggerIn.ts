"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

gsap.registerPlugin(useGSAP);

/*
  Items inside `scope` matching `selector` rise in once, the first time `ready` turns true.
  They are visible at rest; nothing animates for people who prefer reduced motion.
*/
export function useStaggerIn(scope: RefObject<HTMLElement | null>, selector: string, ready: boolean) {
  useGSAP(
    () => {
      if (!ready) return;
      const items = gsap.utils.toArray<HTMLElement>(selector, scope.current).slice(0, 14);
      if (!items.length) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(items, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", stagger: 0.04, clearProps: "opacity,transform" });
      });
      return () => mm.revert();
    },
    { scope, dependencies: [ready] },
  );
}
