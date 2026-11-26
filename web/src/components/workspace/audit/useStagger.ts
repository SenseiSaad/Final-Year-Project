"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

gsap.registerPlugin(useGSAP);

/*
  Lists enter once: when `ready` first turns true, every element matching `selector`
  inside `scope` rises and fades in with a short stagger. Content is visible at rest and
  nothing runs for people who ask for less motion.
*/
export function useStaggerIn(scope: RefObject<HTMLElement | null>, ready: boolean, selector: string) {
  useGSAP(
    () => {
      if (!ready || !scope.current) return;
      const targets = gsap.utils.selector(scope)(selector);
      if (targets.length === 0) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(targets, {
          opacity: 0,
          y: 10,
          duration: 0.5,
          ease: "power3.out",
          stagger: { amount: Math.min(0.5, targets.length * 0.04) },
          clearProps: "opacity,transform",
        });
      });
      return () => mm.revert();
    },
    { scope, dependencies: [ready] },
  );
}
