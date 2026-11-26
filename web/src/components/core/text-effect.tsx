"use client";

import { animate, stagger, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type Per = "char" | "word" | "line";
type Preset = "rotate" | "fade" | "slide";

type TextEffectProps = {
  children: string;
  per?: Per;
  preset?: Preset;
  delay?: number;
  /** Seconds between units. Shorter for long headlines. */
  staggerSeconds?: number;
  className?: string;
};

/*
  Per-unit entrance built on motion: rotate tips each unit back 90deg,
  fade only changes opacity, slide lifts it. Plays when the text enters
  the viewport, so below-the-fold headings show it too.
  The moving units are hidden from assistive tech; give the parent an
  `aria-label` with the full sentence (as the hero h1 does).
*/
export function TextEffect({
  children,
  per = "char",
  preset = "rotate",
  delay = 0,
  staggerSeconds = 0.05,
  className,
}: TextEffectProps) {
  const root = useRef<HTMLSpanElement>(null);
  const inView = useInView(root, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>("[data-text-item]");
    if (!items.length) return;

    if (reduced) {
      el.style.visibility = "visible";
      return;
    }

    if (!inView) return;

    el.style.visibility = "visible";
    const keyframes =
      preset === "fade"
        ? { opacity: [0, 1] }
        : preset === "slide"
          ? { opacity: [0, 1], y: [14, 0] }
          : { opacity: [0, 1], rotateX: [90, 0], y: [10, 0] };

    animate(items, keyframes, {
      duration: 0.2,
      delay: stagger(staggerSeconds, { startDelay: delay }),
      ease: "easeOut",
    });
  }, [inView, reduced, preset, delay, staggerSeconds]);

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