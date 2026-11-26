import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

export const controlStyles =
  "w-full rounded-[10px] border border-line-strong bg-transparent px-3.5 text-[15px] text-ink placeholder:text-ink-3 transition-[border-color,background-color] duration-150 hover:border-ink-3 focus:border-ink focus:outline-none aria-[invalid=true]:border-danger disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlStyles, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlStyles, "min-h-24 resize-y py-3 leading-[22px]", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(controlStyles, "h-11 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.5} />
    </div>
  );
}

/* Label, control and message. The control must carry the same id as `htmlFor`. */
export function Field({
  htmlFor,
  label,
  hint,
  error,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-3 text-[14px] text-ink">
        {label}
        {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
