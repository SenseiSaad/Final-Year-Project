"use client";

import { Moon, Sun } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/cn";

import { useLiquidTheme } from "./useLiquidTheme";

/* One click flips between liquid black and white; the change spreads out from this button */
export function ThemeToggle({ className }: { className?: string }) {
  const { dark, next, toggle } = useLiquidTheme();
  const button = useRef<HTMLButtonElement>(null);

  function onClick() {
    const rect = button.current?.getBoundingClientRect();
    toggle(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined);
  }

  return (
    <button
      ref={button}
      type="button"
      onClick={onClick}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn(
        "relative grid size-10 place-items-center rounded-[10px] text-ink-2 transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-ink active:scale-95",
        className,
      )}
    >
      <Sun className={cn("absolute size-[18px] transition-[opacity,transform] duration-300 ease-soft", dark ? "scale-100 opacity-100" : "scale-50 -rotate-90 opacity-0")} strokeWidth={1.5} />
      <Moon className={cn("absolute size-[18px] transition-[opacity,transform] duration-300 ease-soft", dark ? "scale-50 rotate-90 opacity-0" : "scale-100 opacity-100")} strokeWidth={1.5} />
    </button>
  );
}
