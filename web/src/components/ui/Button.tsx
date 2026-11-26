import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-on-ink hover:bg-ink-hover",
  secondary: "border border-line-strong text-ink hover:bg-hover",
  ghost: "text-ink-2 hover:bg-hover hover:text-ink",
  danger: "border border-line-strong text-danger hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-10 gap-2 px-4 text-[14px]",
  lg: "h-11 gap-2 px-5 text-[15px]",
  icon: "size-10",
};

/* Class names shared by buttons and links that look like buttons */
export function buttonStyles({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[10px] font-medium transition-[background-color,color,border-color,transform] duration-150 ease-soft active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonStyles({ variant, size, className })} {...props}>
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
