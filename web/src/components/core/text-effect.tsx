"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Per = "char" | "word" | "line";
type Preset = "rotate" | "fade" | "slide";

type TextEffectProps = {
  children: string;
  per?: Per;
  preset?: Preset;
  delay?: number;
  /** Seconds between units. Shorter for long headlines. */
  stagger?: number;
  className?: string;
};

/*
  Per-unit entrance: rotate tips each unit back 90deg, fade only changes opacity.
  Animates when the text enters the viewport, so below-the-fold headings show it too.
  The moving units are hidden from assistive tech; give the parent an `aria-label`
  with the full sentence. The `.js-motion` gate keeps the text hidden before paint,
  and the 3s fallback in layout.tsx reveals it if scripts fail.
*/
export function TextEffect({
  children,
  per = "char",
  preset = "rotate",
  delay = 0,
  stagger = 0.05,
  className,
}: TextEffectProps) {
  const root = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const items = root.current?.querySelectorAll<HTMLElement>("[data-text-item]");
      if (!items?.length) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(root.current, { visibility: "visible" });

        const from =
          preset === "fade"
            ? { autoAlpha: 0 }
            : preset === "slide"
              ? { autoAlpha: 0, y: 14 }
              : { autoAlpha: 0, rotateX: 90, y: 10, transformPerspective: 800, transformOrigin: "50% 50%" };
        const to =
          preset === "fade"
            ? { autoAlpha: 1 }
            : preset === "slide"
              ? { autoAlpha: 1, y: 0 }
              : { autoAlpha: 1, rotateX: 0, y: 0 };

        const tl = gsap.timeline({
          delay,
          scrollTrigger: { trigger: root.current, start: "top 88%", once: true },
        });
        tl.fromTo(items, from, { ...to, duration: 0.2, stagger, ease: "power2.out" });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(root.current, { visibility: "visible" });
        gsap.set(items, { clearProps: "all", autoAlpha: 1 });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <span ref={root} data-text-effect className={className} style={{ perspective: "800px" }}>
      <span aria-hidden="true">{renderUnits(children, per)}</span>
    </span>
  );
}

function renderUnits(text: string, per: Per) {
  if (per === "line") {
    return text.split("\n").map((line, index) => (
      <span key={index} data-text-item className="block">
        {line}
      </span>
    ));
  }

  const parts = text.split(/(\s+)/).filter(Boolean);

  return parts.map((part, index) => {
    if (/^\s+$/.test(part)) {
      return <span key={index}>{part}</span>;
    }

    if (per === "word") {
      return (
        <span key={index} data-text-item className="inline-block">
          {part}
        </span>
      );
    }

    return (
      <span key={index} className="inline-block whitespace-nowrap">
        {Array.from(part).map((char, charIndex) => (
          <span key={charIndex} data-text-item className="inline-block will-change-transform">
            {char}
          </span>
        ))}
      </span>
    );
  });
}