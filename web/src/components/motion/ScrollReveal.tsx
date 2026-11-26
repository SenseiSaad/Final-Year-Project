"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/*
  Scroll choreography for a page.
    [data-split]   headings: each line rises out of a mask
    [data-reveal]  blocks fade and lift once, in small staggered batches
  Everything shows at once for reduced motion. Text is always real text, so reading
  order, selection and screen readers are unaffected.
*/
export function ScrollReveal() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
        gsap.set(el, { visibility: "visible" });
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 108,
              duration: 1,
              ease: "power4.out",
              stagger: 0.09,
              scrollTrigger: { trigger: el, start: "top 90%", once: true },
            }),
        });
      });

      const blocks = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      gsap.set(blocks, { autoAlpha: 0, y: 24 });
      ScrollTrigger.batch(blocks, {
        start: "top 90%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, overwrite: true }),
      });
    });
    return () => mm.revert();
  });
  return null;
}
