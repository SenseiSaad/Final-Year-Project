"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ArrowRight, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LiquidField } from "@/components/field/LiquidField";
import { useTransitionRouter } from "@/components/motion/TransitionProvider";
import { TransitionLink } from "@/components/motion/TransitionLink";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { apiRequest, DEMO_PERSONA, type Bootstrap } from "@/lib/workspace-api";

import { signIn, signOut, useSession } from "../session";
import { Avatar } from "../ui";

gsap.registerPlugin(useGSAP, SplitText);

/*
  Sign-in page. Sign-in is open in this demo: everyone enters as the Administrator.
  The page says so plainly instead of pretending to check a password.
*/
export function LoginView() {
  const { go } = useTransitionRouter();
  const session = useSession();
  const root = useRef<HTMLDivElement>(null);
  const [admin, setAdmin] = useState<Bootstrap["user"] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Bootstrap>("/bootstrap/", { persona: DEMO_PERSONA, signal: controller.signal }).then(
      (data) => setAdmin(data.user),
      () => undefined,
    );
    return () => controller.abort();
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create("[data-login-title]", { type: "lines", mask: "lines" });
        gsap
          .timeline({ defaults: { ease: "power4.out" } })
          .from(".login-art", { autoAlpha: 0, scale: 1.04, duration: 2, ease: "power2.out" }, 0)
          .from(split.lines, { yPercent: 110, duration: 1, stagger: 0.1 }, 0.1)
          .from("[data-login-in]", { autoAlpha: 0, y: 16, duration: 0.8, stagger: 0.08 }, 0.4)
          .from("[data-login-quote]", { autoAlpha: 0, y: 24, duration: 1.1 }, 0.8);
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  function enter() {
    setBusy(true);
    signIn();
    window.setTimeout(() => go("/workspace"), 380);
  }

  const name = admin?.display_name ?? "Administrator";
  const signedIn = session === "in";

  return (
    <div ref={root} className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex min-h-dvh flex-col px-6 py-6 sm:px-12 lg:min-h-0 lg:px-16">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>

        <div className="my-auto w-full max-w-[420px] py-14">
          <h1 data-login-title className="display text-[40px] sm:text-[48px]">
            {signedIn ? "You are signed in" : "Sign in to the workspace"}
          </h1>
          <p data-login-in className="mt-4 text-[15px] leading-[24px] text-ink-2">
            This is a demo workspace with sample data. Sign-in is open: everyone enters as the Administrator, with full control. No password is needed.
          </p>

          <div data-login-in className="mt-8 flex items-center gap-4 rounded-[14px] border border-line-strong p-4">
            <Avatar name={name} className="size-11 text-[13px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{name}</p>
              <p className="truncate text-[13px] text-ink-3">{admin ? `${admin.role.name} · ${admin.department?.name ?? "All departments"}` : "Administrator · Full workspace control"}</p>
            </div>
          </div>

          <div data-login-in className="mt-5 grid gap-3">
            <Button size="lg" onClick={enter} loading={busy} className="w-full">
              {signedIn ? "Open workspace" : "Enter the workspace"}
              {!busy && <ArrowRight className="size-4" strokeWidth={1.5} />}
            </Button>
            {signedIn && (
              <Button variant="secondary" size="lg" className="w-full" onClick={signOut}>
                <LogOut className="size-4" strokeWidth={1.5} />
                Sign out
              </Button>
            )}
          </div>

          <p data-login-in className="mt-6 text-[13px] text-ink-3">
            Use synthetic documents only.{" "}
            <TransitionLink href="/" className="text-ink-2 underline underline-offset-[3px] hover:text-ink">
              Back to the website
            </TransitionLink>
          </p>
        </div>

        <p className="flex gap-5 text-[13px] text-ink-3">
          <TransitionLink href="/privacy" className="hover:text-ink">
            Privacy policy
          </TransitionLink>
          <TransitionLink href="/terms" className="hover:text-ink">
            Terms of service
          </TransitionLink>
        </p>
      </div>

      <div className="login-art relative order-first h-36 overflow-hidden border-b border-line bg-deep lg:order-none lg:h-auto lg:border-b-0 lg:border-l">
        {/* The lines fade out toward the corner where the text sits */}
        <div aria-hidden="true" className="absolute inset-0 [mask-image:linear-gradient(to_top,transparent_0%,transparent_26%,#000_64%)] max-lg:[mask-image:none]">
          <LiquidField scale={1.25} lines={17} strength={1.15} />
        </div>
        <div data-login-quote className="absolute inset-x-12 bottom-14 hidden max-w-[28rem] lg:block">
          <p className="font-serif text-[44px] leading-[1.08] tracking-[-0.02em]">Every answer has a source</p>
          <p className="mt-4 text-[14px] leading-[22px] text-ink-2">Sample workspace of a logistics company, with documents, chats and an audit log you can verify.</p>
        </div>
      </div>
    </div>
  );
}
