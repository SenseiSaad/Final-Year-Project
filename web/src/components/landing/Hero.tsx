"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { TextEffect } from "@/components/core/text-effect";

import { AskPreview } from "./AskPreview";

gsap.registerPlugin(useGSAP);

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.fromTo("[data-hero]", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.08 }, 0.05)
          .fromTo("[data-hero-window]", { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.25);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="hero-title" className="relative -mt-16 overflow-hidden pt-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-line" />

      <div className="container-page relative grid items-center gap-14 pb-24 pt-16 md:pt-24 lg:min-h-[calc(100dvh-64px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-16 lg:py-20">
        <div>
          <p data-hero className="text-[14px] font-medium text-ink-3">
            Local-first document workspace
          </p>
          <h1
            id="hero-title"
            aria-label="Answers from your team's documents, with the source attached"
            className="display mt-4 text-[44px] sm:text-[54px] xl:text-[60px]"
          >
            <TextEffect per="char" delay={0.15} stagger={0.012}>
              {"Answers from your team's documents, with the source attached"}
            </TextEffect>
          </h1>
          <p data-hero className="mt-6 max-w-[36rem] text-[18px] leading-[30px] text-ink-2">
            DocuTrust AI reads the policies, handbooks and notes your team already keeps. Each person gets answers only
            from files they are allowed to open, and it all runs on your own machine.
          </p>
          <div data-hero className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="group inline-flex h-11 items-center gap-2 rounded-[10px] bg-btn px-5 text-[15px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98]"
            >
              Open workspace
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
            </Link>
            <Link
              href="#product"
              className="inline-flex h-11 items-center px-2 text-[15px] font-medium text-ink-2 transition-colors duration-150 hover:text-ink"
            >
              See how it works
            </Link>
          </div>
        </div>

        <div data-hero-window className="[.js-motion_&]:invisible">
          <AskPreview />
        </div>
      </div>
    </section>
  );
}
