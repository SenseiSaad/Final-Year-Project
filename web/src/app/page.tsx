import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { Closing } from "@/components/landing/Closing";
import { Faq } from "@/components/landing/Faq";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProductTour } from "@/components/landing/ProductTour";
import { Roles } from "@/components/landing/Roles";
import { SectionHead } from "@/components/landing/SectionHead";
import { Security } from "@/components/landing/Security";
import { WorkspaceSection } from "@/components/landing/WorkspaceSection";
import { facts } from "@/lib/facts";

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <section id="product" aria-labelledby="product-title" className="section-fit border-y border-line bg-deep">
        <div className="container-page w-full">
          <SectionHead
            id="product-title"
            title="How answers stay grounded"
            lead="Four short walk-throughs of retrieval, refusal, access and the audit chain. They run on sample data in your browser; the workspace itself uses the live backend."
          />
          <ProductTour facts={facts} />
        </div>
      </section>
      <Roles />
      <Security maxFileMb={facts.maxFileMb} />
      <WorkspaceSection />
      <Faq maxFileMb={facts.maxFileMb} />
      <Closing />
      <ScrollReveal />
    </>
  );
}
