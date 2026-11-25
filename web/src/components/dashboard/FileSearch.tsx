"use client";

import { ArrowLeft, Search } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import { useRef, useState } from "react";

import useClickOutside from "@/hooks/useClickOutside";

export function FileSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    onChange("");
  }

  useClickOutside(ref, () => {
    if (open) close();
  });

  return (
    <MotionConfig transition={{ type: "spring", bounce: 0.1, duration: 0.25 }}>
      <div ref={ref}>
        <motion.div
          initial={false}
          animate={{ width: open ? 264 : 40 }}
          className="h-10 overflow-hidden rounded-lg border border-line bg-surface"
        >
          {open ? (
            <div className="flex h-10 items-center gap-1 pl-1 pr-2">
              <button
                type="button"
                onClick={close}
                aria-label="Close file search"
                className="grid size-8 shrink-0 place-items-center rounded-md text-ink-2 transition-colors hover:bg-raised hover:text-ink"
              >
                <ArrowLeft className="size-4" strokeWidth={1.5} />
              </button>
              <input
                autoFocus
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Search files"
                className="h-8 w-full bg-transparent text-[14px] text-ink placeholder:text-ink-3 focus:outline-none"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Search files"
              className="grid size-10 place-items-center text-ink-2 transition-colors hover:text-ink"
            >
              <Search className="size-4" strokeWidth={1.5} />
            </button>
          )}
        </motion.div>
      </div>
    </MotionConfig>
  );
}