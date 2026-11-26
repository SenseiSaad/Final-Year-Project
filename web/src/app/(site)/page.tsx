import { Closing } from "@/components/landing/Closing";
import { Faq } from "@/components/landing/Faq";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProductTour } from "@/components/landing/ProductTour";
import { Roles } from "@/components/landing/Roles";
import { SectionHead } from "@/components/landing/SectionHead";
import { Security } from "@/components/landing/Security";
import { WorkspaceSection } from "@/components/landing/WorkspaceSection";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { facts } from "@/lib/facts";

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <section id="product" aria-labelledby="product-title" className="border-y border-line bg-deep py-28 md:py-36">
        <div className="container-page">
          <SectionHead
            id="product-title"
            title="How answers stay grounded"
            lead="Four short walk-throughs of retrieval, refusal, access and the audit chain. They run on sample data in your browser; the workspace itself uses the live backend."
          />
          <ProductTour facts={facts} />
        </div>
      </section>
      <Roles />
      <WorkspaceSection />
      <Security maxFileMb={facts.maxFileMb} />
      <Faq facts={facts} />
      <Closing />
      <ScrollReveal />
    </>
  );
}
