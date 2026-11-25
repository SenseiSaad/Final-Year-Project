import { MessageSquare, SearchCheck, Upload } from "lucide-react";

import type { Facts } from "@/lib/facts";

import { SectionHead } from "./SectionHead";

export function HowItWorks({ facts }: { facts: Facts }) {
  const steps = [
    {
      icon: Upload,
      title: "Upload",
      text: `Add PDF, Word, Markdown or plain text files up to ${facts.maxFileMb} MB each. DocuTrust splits them into short passages and indexes them locally.`,
    },
    {
      icon: MessageSquare,
      title: "Ask",
      text: "Ask in English or Roman Urdu. Search covers only your own files, your department's files and anything shared with you.",
    },
    {
      icon: SearchCheck,
      title: "Check",
      text: "Every statement links to the passage behind it. When the documents do not hold the answer, DocuTrust says so instead of guessing.",
    },
  ];

  return (
    <section id="how" aria-labelledby="how-title" className="py-24 md:py-32">
      <div className="container-page">
        <SectionHead
          id="how-title"
          textEffect
          title="From a folder of files to answers you can check"
          lead="Three steps, all on your own hardware. Nothing leaves the building unless an administrator turns on cloud chat."
        />
        <ol className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          {/* The thread that joins the steps */}
          <span aria-hidden="true" className="absolute left-0 right-0 top-[19px] hidden h-px bg-line md:block" />
          {steps.map((step, i) => (
            <li key={step.title} data-reveal className="relative">
              <div className="flex items-center gap-3">
                <span className="relative grid size-10 place-items-center rounded-[10px] border border-line bg-surface text-ink-2">
                  <step.icon className="size-[18px]" strokeWidth={1.5} />
                </span>
                <span className="bg-bg pr-3 font-mono text-[12px] text-ink-3">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-[18px] font-medium">{step.title}</h3>
              <p className="mt-2 max-w-[22rem] text-[15px] leading-[24px] text-ink-2">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
