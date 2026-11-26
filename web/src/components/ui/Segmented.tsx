"use client";

import { cn } from "@/lib/cn";

export function Segmented({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: string[];
  value: number;
  onChange: (index: number) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex flex-wrap gap-1 rounded-[10px] bg-raised p-1", className)}>
      {options.map((option, i) => (
        <button
          key={option}
          type="button"
          aria-pressed={i === value}
          onClick={() => onChange(i)}
          className={cn(
            "h-8 rounded-[6px] px-3 text-[13px] transition-[background-color,color,box-shadow] duration-150 ease-soft",
            i === value ? "bg-bg text-ink shadow-[0_0_0_1px_var(--line-strong)]" : "text-ink-2 hover:text-ink",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
