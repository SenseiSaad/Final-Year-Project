"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { AskPreview } from "./AskPreview";
import { RotatingWord } from "./RotatingWord";
import { WaterBackground } from "./WaterBackground";

const WORDS = ["documents", "files", "PDFs", "Markdown", ".md files", "DOCX files"];

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="section-fit relative -mt-16 overflow-hidden bg-[#050506] pt-16 text-[#f6f4ef]"
    >
      <WaterBackground />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,6,0.78)_0%,rgba(5,5,6,0.5)_42%,rgba(5,5,6,0.12)_100%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />

      <div className="container-page relative z-10 grid w-full items-center gap-10 pb-16 pt-12 md:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-14 lg:py-14">
        <div>
          <h1
            id="hero-title"
            aria-label="Ask your documents anything, and get the source back"
            className="hero-rise display max-w-[14ch] text-[38px] leading-[1.04] sm:text-[52px] xl:text-[58px]"
          >
            Ask your <RotatingWord words={WORDS} /> anything.
          </h1>
          <div data-reveal className="mt-9 flex flex-wrap items-center gap-3 sm:mt-11 sm:gap-4">
            <Link
              href="/dashboard"
              className="group inline-flex h-12 items-center gap-2 rounded-[10px] bg-[#f6f4ef] px-6 text-[15px] font-medium text-[#0a0a0a] transition-[background-color,transform] duration-150 hover:bg-white active:scale-[0.98]"
            >
              Open workspace
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
            </Link>
            <Link
              href="#how"
              className="inline-flex h-12 items-center px-2 text-[15px] font-medium text-white/70 transition-colors duration-150 hover:text-white"
            >
              See how it works
            </Link>
          </div>
        </div>

        <div data-reveal className="min-w-0 [.js-motion_&]:invisible">
          <AskPreview />
        </div>
      </div>
    </section>
  );
}