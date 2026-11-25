"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";

import { AnimatedBackground } from "@/components/core/animated-background";
import { EarlyAccessDialog } from "@/components/landing/EarlyAccessDialog";

import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/#product", label: "Product" },
  { href: "/#how", label: "How it works" },
  { href: "/#security", label: "Security" },
  { href: "/#workspace", label: "Workspace" },
  { href: "/#faq", label: "FAQ" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-[background-color,border-color] duration-200 ${
        scrolled || open ? "border-line bg-bg" : "border-transparent bg-transparent"
      }`}
    >
      <div className="container-page flex h-16 items-center gap-8">
        <Logo />
        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          <AnimatedBackground
            defaultValue={links[0].href}
            className="rounded-lg bg-raised"
            transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
            enableHover
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-id={link.href}
                className="rounded-lg px-3 py-2 text-[14px] font-medium text-ink-2 transition-colors duration-150 hover:text-ink"
              >
                {link.label}
              </Link>
            )) as unknown as ReactElement<{ "data-id": string }>[]}
          </AnimatedBackground>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          <EarlyAccessDialog
            label="Join early access"
            triggerClassName="hidden h-9 items-center rounded-lg border border-line-strong px-3.5 text-[14px] font-medium text-ink transition-colors duration-150 hover:bg-raised lg:inline-flex"
          />
          <Link
            href="/dashboard"
            className="hidden h-9 items-center rounded-lg bg-btn px-4 text-[14px] font-medium text-on-btn transition-colors duration-150 hover:bg-btn-hover sm:inline-flex"
          >
            Open workspace
          </Link>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-raised md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-[18px]" strokeWidth={1.5} /> : <Menu className="size-[18px]" strokeWidth={1.5} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="container-page grid gap-1 pb-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-[15px] text-ink-2 hover:bg-raised hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <EarlyAccessDialog
            label="Join early access"
            triggerClassName="mt-2 inline-flex h-10 items-center justify-center rounded-lg border border-line-strong px-4 text-[14px] font-medium text-ink"
          />
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-btn px-4 text-[14px] font-medium text-on-btn"
          >
            Open workspace
          </Link>
        </nav>
      )}
    </header>
  );
}
