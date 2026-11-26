import { MessageSquare, SearchCheck, Upload } from "lucide-react";

import { SectionHead } from "./SectionHead";

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
  return (
    <section id="how" aria-labelledby="how-title" className="section-fit">
      <div className="container-page w-full">
        <SectionHead id="how-title" title="From files to answers you can verify" />
        <ol className="relative mt-10 grid gap-8 md:grid-cols-3 md:gap-8 lg:mt-14">
          <span aria-hidden="true" className="absolute left-0 right-0 top-[19px] hidden h-px bg-line md:block" />
          {steps.map((step, i) => (
            <li key={step.title} data-reveal className="group relative -m-4 rounded-xl p-4 transition-colors duration-200 before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:border before:border-transparent before:transition-colors before:duration-200 before:content-[''] hover:bg-surface hover:before:border-line">
              <div className="flex items-center gap-3">
                <span className="relative grid size-10 place-items-center rounded-[10px] border border-line bg-surface text-ink-2">
                  <step.icon className="size-[18px]" strokeWidth={1.5} />
                </span>
                <span className="bg-bg pr-3 font-mono text-[12px] text-ink-3">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-[18px] font-medium">{step.title}</h3>
              <p className="mt-2 max-w-[24rem] text-[15px] leading-[24px] text-ink-2">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
