"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useToast } from "@/components/ui/Toast";

/* Copies a value. The icon turns into a check for a moment so the click is acknowledged. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      notify("Could not copy to the clipboard", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : label}
      className="grid size-8 shrink-0 place-items-center rounded-[8px] text-ink-3 transition-colors duration-150 hover:bg-hover hover:text-ink"
    >
      {copied ? <Check className="size-4" strokeWidth={1.5} /> : <Copy className="size-4" strokeWidth={1.5} />}
    </button>
  );
}
