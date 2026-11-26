"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useReducedMotion } from "./useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

let instance: Lenis | null = null;

/* Used by dialogs so the page behind them does not scroll */
export function pauseSmoothScroll() {
  instance?.stop();
}
export function resumeSmoothScroll() {
  instance?.start();
}

/*
  Eased wheel scrolling for the website. Keyboard, touch and assistive technology
  scroll natively. Anchor links glide to their target and move focus there.
  Off for reduced motion, and never used inside the workspace, which scrolls in panes.
*/
export function SmoothScroll() {
  const reduced = useReducedMotion();
  const pathname = usePathname();

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95, anchors: false });
    instance = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const link = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (!url.hash || url.pathname !== window.location.pathname || url.origin !== window.location.origin) return;
      const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!el) return;
      event.preventDefault();
      event.stopPropagation();
      lenis.scrollTo(el, { offset: -72, duration: 1.3, easing: (t) => 1 - Math.pow(1 - t, 4) });
      history.pushState(null, "", url.hash);
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    };
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      gsap.ticker.remove(tick);
      lenis.destroy();
      instance = null;
    };
  }, [reduced, pathname]);

  return null;
}
