"use client";

import { useEffect } from "react";

/*
  Reveals every [data-reveal] element once as it enters the viewport.
  Elements entering together are staggered. No animation library needed:
  the CSS in globals.css owns the transition, this only toggles `.is-in`.
*/
export function ScrollReveal() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!items.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((entry) => entry.isIntersecting);
        entering.forEach((entry, order) => {
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          window.setTimeout(() => el.classList.add("is-in"), order * 80);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );

    items.forEach((el) => {
      // Already inside the viewport: reveal with the same stagger rhythm.
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add("is-in");
      else io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  return null;
}