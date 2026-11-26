"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { pauseSmoothScroll, resumeSmoothScroll } from "@/components/motion/SmoothScroll";
import { cn } from "@/lib/cn";

/*
  A modal built on the native <dialog>, so focus is trapped, Escape closes it, the page
  behind is inert and focus returns to whatever opened it. Clicking the dim area closes it.
*/
export function Modal({
  open,
  onClose,
  label,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      pauseSmoothScroll();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => resumeSmoothScroll();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={cn("modal fixed inset-0 m-auto", className)}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}
