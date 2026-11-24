"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { AskPreview } from "./AskPreview";

gsap.registerPlugin(useGSAP);

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.fromTo(".hero-light", { autoAlpha: 0, scale: 1.15 }, { autoAlpha: 1, scale: 1, duration: 1.8, ease: "power2.out" }, 0)
          .fromTo("[data-hero]", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.09 }, 0.1)
          .fromTo("[data-hero-window]", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.1 }, 0.35);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="hero-title" className="relative -mt-16 overflow-hidden pt-16">
      {/* A soft pool of light, like a desk lamp over the records; one neutral tone, no hue */}
      <div
        aria-hidden="true"
        className="hero-light pointer-events-none absolute inset-x-0 top-0 h-[760px]"
        style={{ background: "radial-gradient(60% 70% at 20% 0%, var(--hero-light), transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-line"
      />

      <div className="container-page relative grid items-center gap-12 pb-24 pt-16 md:pt-24 lg:min-h-[calc(100dvh-64px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-20">
        <div>
          <p data-hero className="flex items-center gap-2 text-[13px] text-ink-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Early access · test live with Admin or Employee
          </p>
          <h1 id="hero-title" data-hero className="display mt-6 text-[44px] sm:text-[52px] xl:text-[58px]">
            Answers from your team&apos;s documents, with the source attached
          </h1>
          <p data-hero className="mt-6 max-w-[36rem] text-[18px] leading-[30px] text-ink-2">
            DocuTrust AI reads the policies, handbooks and notes your team already keeps. Each person gets answers only
            from files they are allowed to open, and it all runs on your own machine.
          </p>
          <div data-hero className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/admin"
              className="inline-flex h-11 items-center rounded-[10px] bg-btn px-5 text-[15px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98]"
            >
              Test as Admin
            </Link>
            <Link
              href="/dashboard/employee"
              className="inline-flex h-11 items-center rounded-[10px] border border-line-strong bg-surface px-5 text-[15px] font-medium text-ink transition-[background-color,transform] duration-150 hover:bg-raised active:scale-[0.98]"
            >
              Test as Employee
            </Link>
            <Link
              href="#product"
              className="group inline-flex h-11 items-center gap-2 rounded-[10px] px-3 text-[15px] text-ink-2 transition-colors duration-150 hover:text-ink"
            >
              See it work
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        <div data-hero-window className="[.js-motion_&]:invisible">
          <AskPreview />
          <p className="mt-3 text-center text-[12px] text-ink-3 lg:text-left">
            Interactive preview with sample documents. Switch between English and Roman Urdu below.
          </p>
        </div>
      </div>
    </section>
  );
}
