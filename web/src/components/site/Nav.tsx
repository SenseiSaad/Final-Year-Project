"use client";

import { Menu, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { TransitionLink } from "@/components/motion/TransitionLink";
import { useSiteSearch } from "@/components/search/SiteSearch";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button, buttonStyles } from "@/components/ui/Button";
import { openEarlyAccess } from "@/lib/early-access";
import { cn } from "@/lib/cn";

import { Logo } from "./Logo";

const links = [
  { id: "how", href: "/#how", label: "How it works" },
  { id: "product", href: "/#product", label: "Product" },
  { id: "workspace", href: "/#workspace", label: "Workspace" },
  { id: "security", href: "/#security", label: "Security" },
  { id: "faq", href: "/#faq", label: "FAQ" },
];

const subscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

export function Nav() {
  const pathname = usePathname();
  const { openSearch } = useSiteSearch();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const mac = useSyncExternalStore(subscribe, isMac, () => false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the link of the section being read
  useEffect(() => {
    if (pathname !== "/") return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        const best = [...visible.entries()].sort((a, b) => b[1] - a[1])[0];
        setActive(best && best[1] > 0 ? best[0] : null);
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.1, 0.5] },
    );
    links.forEach((link) => {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    });
    return () => {
      observer.disconnect();
      setActive(null);
    };
  }, [pathname]);

  useEffect(() => {
    const close = () => setMenu(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300",
        scrolled || menu ? "border-line bg-bg/90 backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center gap-6">
        <Logo />
        <nav aria-label="Main" className="ml-4 hidden items-center gap-0.5 xl:flex">
          {links.map((link) => (
            <TransitionLink
              key={link.id}
              href={link.href}
              aria-current={active === link.id ? "location" : undefined}
              className="group relative rounded-[8px] px-3 py-2 text-[14px] text-ink-2 transition-colors duration-150 hover:text-ink aria-[current=location]:text-ink"
            >
              {link.label}
              <span className="absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-ink transition-transform duration-300 ease-soft group-aria-[current=location]:scale-x-100" />
            </TransitionLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search"
            className="inline-flex h-10 items-center gap-3 rounded-[10px] border border-line-strong px-3 text-[14px] text-ink-3 transition-colors duration-150 hover:bg-hover hover:text-ink max-sm:w-10 max-sm:justify-center max-sm:px-0 sm:min-w-44"
          >
            <Search className="size-4 shrink-0" strokeWidth={1.5} />
            <span className="hidden flex-1 text-left sm:block">Search</span>
            <span className="kbd hidden sm:inline-flex" aria-hidden="true">
              {mac ? "⌘K" : "Ctrl K"}
            </span>
          </button>
          <ThemeToggle />
          <TransitionLink href="/login" className="hidden h-10 items-center rounded-[10px] px-3 text-[14px] text-ink-2 transition-colors hover:text-ink md:inline-flex">
            Sign in
          </TransitionLink>
          <Button className="max-md:hidden" onClick={openEarlyAccess}>
            Request early access
          </Button>
          <button
            type="button"
            aria-expanded={menu}
            aria-controls="mobile-nav"
            aria-label={menu ? "Close menu" : "Open menu"}
            onClick={() => setMenu((v) => !v)}
            className="grid size-10 place-items-center rounded-[10px] text-ink-2 transition-colors hover:bg-hover xl:hidden"
          >
            {menu ? <X className="size-[18px]" strokeWidth={1.5} /> : <Menu className="size-[18px]" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <div id="mobile-nav" className={cn("grid transition-[grid-template-rows] duration-300 ease-soft xl:hidden", menu ? "grid-rows-[1fr]" : "grid-rows-[0fr]")} inert={!menu}>
        <nav aria-label="Mobile" className="overflow-hidden">
          <div className="container-page grid gap-1 pb-5 pt-1">
            {links.map((link) => (
              <TransitionLink key={link.id} href={link.href} onClick={() => setMenu(false)} className="rounded-[10px] px-3 py-3 text-[16px] text-ink-2 hover:bg-hover hover:text-ink">
                {link.label}
              </TransitionLink>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <TransitionLink href="/login" onClick={() => setMenu(false)} className={buttonStyles({ variant: "secondary", size: "lg" })}>
                Sign in
              </TransitionLink>
              <Button
                size="lg"
                onClick={() => {
                  setMenu(false);
                  openEarlyAccess();
                }}
              >
                Request access
              </Button>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
