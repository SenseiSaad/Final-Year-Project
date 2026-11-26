"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

import { LiquidField } from "@/components/field/LiquidField";
import { TransitionLink } from "@/components/motion/TransitionLink";
import { buttonStyles } from "@/components/ui/Button";

import { AskPreview } from "./AskPreview";
import { RotatingWord } from "./RotatingWord";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const WORDS = ["documents", "policies", "handbooks", "contracts", "meeting notes", "PDFs"];

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set("[data-hero]", { visibility: "visible" });
        const title = root.current!.querySelector<HTMLElement>("[data-title]")!;
        const split = SplitText.create(title, { type: "lines", mask: "lines" });
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        tl.from(".hero-field", { autoAlpha: 0, duration: 2.2, ease: "power2.out" }, 0)
          .from(split.lines, { yPercent: 110, duration: 1.1, stagger: 0.1 }, 0.15)
          .from("[data-hero-fade]", { autoAlpha: 0, y: 18, duration: 0.9, stagger: 0.1 }, 0.55)
          .from("[data-hero-window]", { autoAlpha: 0, y: 56, duration: 1.3 }, 0.4);

        // The preview drifts up slightly as the page scrolls past it
        gsap.to("[data-hero-window]", {
          yPercent: -4,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 },
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="hero-title" className="relative isolate -mt-16 overflow-hidden pt-16">
      <div className="hero-field absolute inset-0 -z-10">
        <LiquidField scale={1.5} lines={13} calm={[0.55, 0.3]} />
      </div>

      <div className="container-page grid max-w-[1520px] items-center gap-10 pb-20 pt-14 md:pt-20 xl:min-h-[calc(100svh-2.5rem)] xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] xl:gap-14 xl:py-12">
        <div>
          <h1 id="hero-title" data-hero data-title className="display text-[48px] sm:text-[64px] xl:text-[60px] 2xl:text-[72px]">
            <span className="sr-only">Ask your documents anything.</span>
            <span aria-hidden="true">
              Ask your <RotatingWord words={WORDS} /> anything.
            </span>
          </h1>
          <p data-hero data-hero-fade className="lead mt-7">
            Answers come only from the files each person is allowed to open, with the passage they came from attached.
          </p>
          <div data-hero data-hero-fade className="mt-10 flex flex-wrap items-center gap-3">
            <TransitionLink href="/login" className={buttonStyles({ size: "lg" })}>
              Open workspace
              <ArrowRight className="size-4" strokeWidth={1.5} />
            </TransitionLink>
            <TransitionLink href="/#how" className={buttonStyles({ variant: "ghost", size: "lg" })}>
              See how it works
            </TransitionLink>
          </div>
        </div>

        <div data-hero data-hero-window className="min-w-0">
          <AskPreview />
          <p className="mt-3 text-center text-[12px] text-ink-3 xl:text-left">Sample documents. Press a file name to see what was taken from it.</p>
        </div>
      </div>
    </section>
  );
}
