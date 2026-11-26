"use client";

import { ArrowRight } from "lucide-react";

import { LiquidField } from "@/components/field/LiquidField";
import { TransitionLink } from "@/components/motion/TransitionLink";
import { Button, buttonStyles } from "@/components/ui/Button";
import { openEarlyAccess } from "@/lib/early-access";

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="relative isolate overflow-hidden border-t border-line py-32 md:py-44">
      {/* Lines fade out behind the text so nothing competes with reading it */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_52%_46%_at_50%_50%,transparent_0%,transparent_55%,#000_100%)]"
      >
        <LiquidField scale={1.2} lines={11} />
      </div>
      <div className="container-page flex flex-col items-center text-center">
        <h2 id="closing-title" data-split className="display text-[40px] sm:text-[64px] lg:text-[80px]">
          Try it with your own test files
        </h2>
        <p data-reveal className="lead mt-6 text-center">
          Upload a document, ask a question, and open the audit log to see every step recorded. Synthetic data only.
        </p>
        <div data-reveal className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <TransitionLink href="/login" className={buttonStyles({ size: "lg" })}>
            Open workspace
            <ArrowRight className="size-4" strokeWidth={1.5} />
          </TransitionLink>
          <Button variant="secondary" size="lg" onClick={openEarlyAccess}>
            Request early access
          </Button>
        </div>
      </div>
    </section>
  );
}
