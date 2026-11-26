"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

import { useTransitionRouter } from "./TransitionProvider";

/* A Next.js link that plays the page transition. Modified clicks and new-tab links behave normally. */
export function TransitionLink({ href, onClick, target, ...props }: ComponentProps<typeof Link>) {
  const { go } = useTransitionRouter();

  function handle(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target && target !== "_self") return;
    const url = typeof href === "string" ? href : (href.pathname ?? "");
    if (/^[a-z]+:/i.test(url) && !url.startsWith(window.location.origin)) return;
    event.preventDefault();
    go(url);
  }

  return <Link href={href} target={target} onClick={handle} {...props} />;
}
