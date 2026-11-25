"use client";

import { Megaphone } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/core/dialog";

export function AdminAnnouncement({ onAnnounce }: { onAnnounce: (text: string) => void }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  function close() {
    setText("");
    setOpen(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onAnnounce(value);
    close();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink transition-colors duration-150 hover:bg-raised">
        <Megaphone className="size-3.5" strokeWidth={1.5} />
        Announcement
      </DialogTrigger>

      <DialogContent className="w-[min(calc(100vw-2rem),520px)]">
        <div className="p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-[19px] tracking-[-0.02em]">Post an announcement</DialogTitle>
            <DialogDescription className="mt-1 text-[13.5px] leading-[22px]">
              This appears in #general as you, and is written to the audit log.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="mt-4">
            <textarea
              autoFocus
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write a short note for the team…"
              className="h-[150px] w-full resize-none rounded-lg border border-line bg-bg px-3 py-2.5 text-[14px] leading-[22px] text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-[12px] text-ink-3">{text.trim().length} characters</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex h-9 items-center rounded-lg border border-line-strong px-3 text-[13px] font-medium text-ink transition-colors hover:bg-raised"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-lg bg-btn px-3.5 text-[13px] font-medium text-on-btn transition-colors hover:bg-btn-hover disabled:opacity-50"
                  disabled={!text.trim()}
                >
                  Post to #general
                </button>
              </div>
            </div>
          </form>
        </div>
        <DialogClose className="text-ink-2" />
      </DialogContent>
    </Dialog>
  );
}