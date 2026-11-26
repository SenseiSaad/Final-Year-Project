import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { SiteSearchProvider } from "@/components/search/SiteSearch";
import { EarlyAccessDialog } from "@/components/landing/EarlyAccess";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { Footer } from "@/components/site/Footer";
import { Nav } from "@/components/site/Nav";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <SiteSearchProvider>
      <SmoothScroll />
      <AnnouncementBar />
      <Nav />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <EarlyAccessDialog />
    </SiteSearchProvider>
  );
}
