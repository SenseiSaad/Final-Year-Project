"use client";

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
import { TextMorph } from "@/components/core/text-morph";
import { TextScramble } from "@/components/core/text-scramble";

import { RequestForm } from "./RequestForm";

const defaultTrigger =
  "inline-flex h-11 items-center justify-center rounded-[10px] bg-btn px-5 text-[15px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98]";

export function EarlyAccessDialog({
  label = "Join the waitlist",
  triggerClassName,
}: {
  label?: string;
  triggerClassName?: string;
}) {
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <Dialog>
      <DialogTrigger className={triggerClassName ?? defaultTrigger}>{label}</DialogTrigger>
      <DialogContent className="max-h-[min(92dvh,860px)] w-[min(calc(100vw-2rem),620px)] overflow-y-auto">
        <div className="p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-[22px] tracking-[-0.02em]">
              <TextMorph as="span">{sent ? "You're on the list" : "Create your early-access profile"}</TextMorph>
            </DialogTitle>
            <DialogDescription className="mt-1 text-[14.5px] leading-[24px]">
              Your name appears below as you type. We keep the request on our own server and reply by email.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 rounded-xl border border-line bg-bg px-4 py-3">
            <span className="font-mono text-[10px] text-ink-3">Profile preview</span>
            <TextScramble
              className="mt-1 text-[24px] font-medium leading-none tracking-[-0.02em] text-ink"
              duration={0.5}
              speed={0.03}
            >
              {name.trim() || "Your name"}
            </TextScramble>
          </div>

          <div className="mt-5">
            <RequestForm onNameChange={setName} onSuccess={() => setSent(true)} />
          </div>
        </div>
        <DialogClose className="text-ink-2" />
      </DialogContent>
    </Dialog>
  );
}