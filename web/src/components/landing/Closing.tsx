import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="section-fit">
      <div data-reveal className="container-page flex flex-col items-center text-center">
        <h2 id="closing-title" className="display text-[34px] sm:text-[52px]">
          Try it with your own test files
        </h2>
        <p className="mt-4 max-w-[36rem] text-[17px] leading-[27px] text-ink-2">
          Upload a document, ask a question, then switch persona and watch the sources change. Demo personas, synthetic
          data only.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="group inline-flex h-11 items-center gap-2 rounded-[10px] bg-btn px-6 text-[15px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98]"
          >
            Open workspace
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}
