import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { Closing } from "@/components/landing/Closing";
import { Faq } from "@/components/landing/Faq";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProductTour } from "@/components/landing/ProductTour";
import { Roles } from "@/components/landing/Roles";
import { SectionHead } from "@/components/landing/SectionHead";
import { Security } from "@/components/landing/Security";
import { Stats } from "@/components/landing/Stats";
import { WorkspaceSection } from "@/components/landing/WorkspaceSection";
import { facts } from "@/lib/facts";

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <HowItWorks facts={facts} />
      <section id="product" aria-labelledby="product-title" className="border-y border-line bg-deep py-24 md:py-32">
        <div className="container-page">
          <SectionHead
            id="product-title"
            title="See how it decides what to tell you"
            lead="A working preview with sample documents. Pick a tab and try it."
          />
          <ProductTour facts={facts} />
        </div>
      </section>
      <Roles facts={facts} />
      <Security facts={facts} />
      <WorkspaceSection />
      <Faq facts={facts} />
      <Closing />
      <ScrollReveal />
    </>
  );
}
