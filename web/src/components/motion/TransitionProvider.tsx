"use client";

import gsap from "gsap";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

import { Mark } from "@/components/site/Logo";

import { useReducedMotion } from "./useReducedMotion";

/*
  Page transitions. Moving between the website, the sign-in page and the workspace
  pulls a liquid curtain up over the screen, swaps the route underneath, and lets it
  drain away upward. Moving between workspace screens skips the curtain: those pages
  fade in on their own. With reduced motion every navigation is immediate.
*/

type Transition = { go: (href: string, options?: { replace?: boolean }) => void };
const TransitionContext = createContext<Transition | null>(null);

export function useTransitionRouter() {
  const value = useContext(TransitionContext);
  if (!value) throw new Error("useTransitionRouter must be used inside TransitionProvider");
  return value;
}

const POINTS = 56;
const FROM = 112;
const TO = -16;

/* Region between a wavy top edge and a wavy bottom edge, in a 100 x 100 box */
function curtainPath(top: number, bottom: number, phase: number) {
  const span = FROM - TO;
  const wave = (edge: number, offset: number) => 8 * Math.sin(Math.PI * Math.min(1, Math.max(0, (FROM - edge) / span))) * Math.sin(offset);
  let d = "";
  for (let i = 0; i <= POINTS; i++) {
    const x = (i / POINTS) * 100;
    const y = top + wave(top, (x / 100) * Math.PI * 2.4 + phase);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  for (let i = POINTS; i >= 0; i--) {
    const x = (i / POINTS) * 100;
    const y = bottom + wave(bottom, (x / 100) * Math.PI * 2.1 + phase + 1.4);
    d += `L${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return `${d}Z`;
}

const inWorkspace = (path: string) => path === "/workspace" || path.startsWith("/workspace/");

export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const state = useRef({ top: FROM, bottom: FROM + 8, phase: 0 });
  const busy = useRef(false);
  const waiting = useRef(false);
  const failsafe = useRef<number | undefined>(undefined);
  const current = useRef(pathname);

  useEffect(() => {
    current.current = pathname;
  }, [pathname]);

  const draw = useCallback(() => {
    const s = state.current;
    path.current?.setAttribute("d", curtainPath(s.top, s.bottom, s.phase));
  }, []);

  const reveal = useCallback(() => {
    window.clearTimeout(failsafe.current);
    waiting.current = false;
    document.getElementById("main")?.focus({ preventScroll: true });
    gsap.to(mark.current, { autoAlpha: 0, duration: 0.2 });
    gsap.to(state.current, {
      bottom: TO,
      phase: "+=2.4",
      duration: 0.7,
      ease: "power3.inOut",
      onUpdate: draw,
      onComplete: () => {
        gsap.set(root.current, { visibility: "hidden" });
        state.current = { top: FROM, bottom: FROM + 8, phase: 0 };
        busy.current = false;
      },
    });
  }, [draw]);

  // The route has changed underneath the curtain: let it drain away
  useEffect(() => {
    if (waiting.current) {
      const frame = requestAnimationFrame(reveal);
      return () => cancelAnimationFrame(frame);
    }
  }, [pathname, reveal]);

  const go = useCallback<Transition["go"]>(
    (href, options) => {
      const push = () => (options?.replace ? router.replace(href) : router.push(href));
      let target: URL;
      try {
        target = new URL(href, window.location.href);
      } catch {
        return push();
      }
      const samePage = target.pathname === current.current;
      const insideApp = inWorkspace(target.pathname) && inWorkspace(current.current);
      if (reduced || samePage || insideApp || busy.current) return push();

      busy.current = true;
      state.current = { top: FROM, bottom: FROM + 8, phase: 0 };
      gsap.set(root.current, { visibility: "visible" });
      gsap.set(mark.current, { autoAlpha: 0 });
      draw();
      gsap.to(state.current, {
        top: TO,
        phase: "+=2.4",
        duration: 0.62,
        ease: "power3.inOut",
        onUpdate: draw,
        onComplete: () => {
          gsap.to(mark.current, { autoAlpha: 1, duration: 0.18 });
          waiting.current = true;
          push();
          // If the next page never arrives, do not leave the screen covered
          failsafe.current = window.setTimeout(reveal, 3000);
        },
      });
    },
    [draw, reduced, reveal, router],
  );

  const value = useMemo(() => ({ go }), [go]);

  return (
    <TransitionContext.Provider value={value}>
      {children}
      <div ref={root} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] invisible">
        <svg className="size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path ref={path} fill="var(--ink)" />
        </svg>
        <div ref={mark} className="absolute inset-0 grid place-items-center text-bg invisible">
          <Mark className="size-12" tone="inverse" />
        </div>
      </div>
    </TransitionContext.Provider>
  );
}
