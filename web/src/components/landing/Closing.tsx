import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { EarlyAccessDialog } from "./EarlyAccessDialog";

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="py-24 md:py-32">
      <div data-reveal className="container-page flex flex-col items-center text-center">
        <h2 id="closing-title" className="display text-[40px] sm:text-[56px]">
          Every answer has a source
        </h2>
        <p className="mt-4 text-[17px] text-ink-2">Jump straight into the workspace and test every feature.</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="group inline-flex h-11 items-center gap-2 rounded-[10px] bg-btn px-6 text-[15px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98]"
          >
            Open workspace
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
          </Link>
          <EarlyAccessDialog triggerClassName="inline-flex h-11 items-center rounded-[10px] border border-line-strong px-5 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-raised" />
        </div>
      </div>
    </section>
  );
}
