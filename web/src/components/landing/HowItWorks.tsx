"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MessageSquare, SearchCheck, Upload } from "lucide-react";
import { useRef } from "react";

import { SectionHead } from "./SectionHead";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const steps = [
  {
    icon: Upload,
    title: "Upload",
    text: "Add PDF, Word, Markdown or text files. Text is extracted and indexed on the server, and you decide who may read each file.",
  },
  {
    icon: MessageSquare,
    title: "Ask",
    text: "Questions are answered only from passages the current role may open, by a Local, Gemini or Hosted model you pick.",
  },
  {
    icon: SearchCheck,
    title: "Verify",
    text: "Each answer lists the passages it came from. When no permitted source matches, you get a refusal instead of a guess.",
  },
];

export function HowItWorks() {
  const root = useRef<HTMLElement>(null);

  // A line draws itself along the steps as you scroll through them
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-progress]",
          { scaleX: 0 },
          { scaleX: 1, ease: "none", transformOrigin: "left center", scrollTrigger: { trigger: "[data-steps]", start: "top 75%", end: "bottom 55%", scrub: 0.5 } },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="how" aria-labelledby="how-title" className="py-28 md:py-36">
      <div className="container-page">
        <SectionHead id="how-title" title="From files to answers you can verify" />
        <ol data-steps className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          <span aria-hidden="true" className="absolute left-0 right-0 top-5 hidden h-px bg-line md:block" />
          <span aria-hidden="true" data-progress className="absolute left-0 right-0 top-5 hidden h-px bg-ink md:block" />
          {steps.map((step, i) => (
            <li key={step.title} data-reveal className="group relative">
              <div className="flex items-center gap-3">
                <span className="relative grid size-10 place-items-center rounded-[10px] border border-line-strong bg-bg text-ink transition-colors duration-300 ease-soft group-hover:bg-ink group-hover:text-on-ink">
                  <step.icon className="size-[18px]" strokeWidth={1.5} />
                </span>
                <span className="bg-bg pr-3 font-mono text-[12px] text-ink-3">0{i + 1}</span>
              </div>
              <h3 className="mt-7 text-[20px] font-medium tracking-[-0.01em]">{step.title}</h3>
              <p className="mt-2 max-w-[24rem] text-[15px] leading-[25px] text-ink-2">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
