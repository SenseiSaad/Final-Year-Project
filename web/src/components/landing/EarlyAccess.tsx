"use client";

import { Check, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { requestAccess, type RequestState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { EARLY_ACCESS_EVENT } from "@/lib/early-access";

const initial: RequestState = { status: "idle", errors: {}, values: {} };

const teamSizes = [
  { value: "1-10", label: "1 to 10 people" },
  { value: "11-50", label: "11 to 50 people" },
  { value: "51-200", label: "51 to 200 people" },
  { value: "200+", label: "More than 200 people" },
];

const plans = [
  { value: "pilot", label: "Pilot", text: "Free during early access" },
  { value: "team", label: "Team", text: "Pricing at launch" },
];

function Form({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(requestAccess, initial);
  const [plan, setPlan] = useState("pilot");
  const done = useRef<HTMLDivElement>(null);
  const v = state.values;
  const e = state.errors;
  const invalid = (field: string) => (e[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {});

  useEffect(() => {
    if (state.status === "ok") done.current?.focus();
  }, [state.status]);

  if (state.status === "ok") {
    return (
      <div ref={done} tabIndex={-1} className="grid min-h-[360px] place-content-center justify-items-center text-center outline-none">
        <span className="grid size-12 place-items-center rounded-full bg-ink text-on-ink">
          <Check className="size-5" strokeWidth={1.5} />
        </span>
        <h3 className="mt-6 font-serif text-[28px] leading-tight">Request received</h3>
        <p className="mt-2 max-w-[22rem] text-[15px] leading-[24px] text-ink-2">Thank you. We will reply to the email address you gave us.</p>
        <Button className="mt-8" variant="secondary" onClick={onDone}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="ea-name" label="Full name" error={e.name}>
          <Input id="ea-name" name="name" autoComplete="name" defaultValue={v.name} {...invalid("name")} />
        </Field>
        <Field htmlFor="ea-email" label="Work email" error={e.email}>
          <Input id="ea-email" name="email" type="email" autoComplete="email" defaultValue={v.email} {...invalid("email")} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor="ea-organisation" label="Organisation" error={e.organisation}>
          <Input id="ea-organisation" name="organisation" autoComplete="organization" defaultValue={v.organisation} {...invalid("organisation")} />
        </Field>
        <Field htmlFor="ea-team" label="Team size" error={e.team_size}>
          <Select id="ea-team" name="team_size" defaultValue={v.team_size ?? ""} {...invalid("team_size")}>
            <option value="" disabled>
              Choose a size
            </option>
            {teamSizes.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-[14px]">Interested in</legend>
        <div className="grid grid-cols-2 gap-2">
          {plans.map((option) => (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer rounded-[10px] border px-4 py-3 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                plan === option.value ? "border-ink bg-raised" : "border-line-strong hover:border-ink-3",
              )}
            >
              <input type="radio" name="plan" value={option.value} checked={plan === option.value} onChange={() => setPlan(option.value)} className="sr-only" />
              <span className="block text-[14px] font-medium">{option.label}</span>
              <span className="block text-[12px] text-ink-3">{option.text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field htmlFor="ea-note" label="What would you use it for" hint="Optional">
        <Textarea id="ea-note" name="note" rows={3} maxLength={1000} defaultValue={v.note} placeholder="The documents you want to search, or the problem you want to solve" />
      </Field>

      {/* Hidden from people; most spam bots fill it in */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="ea-website">Website</label>
        <input id="ea-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col-reverse gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-ink-3">
          By sending this you agree to our{" "}
          <a href="/privacy" className="text-ink-2 underline underline-offset-[3px] hover:text-ink">
            privacy policy
          </a>
        </p>
        <Button type="submit" size="lg" loading={pending}>
          {pending ? "Sending" : "Send request"}
        </Button>
      </div>
      {state.message && (
        <p role="alert" className="rounded-[10px] bg-danger-soft px-4 py-3 text-[14px] text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

/* The early-access dialog. Any button on the site opens it with openEarlyAccess(). */
export function EarlyAccessDialog() {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const onOpen = () => {
      setRound((n) => n + 1);
      setOpen(true);
    };
    window.addEventListener(EARLY_ACCESS_EVENT, onOpen);
    return () => window.removeEventListener(EARLY_ACCESS_EVENT, onOpen);
  }, []);

  return (
    <Modal open={open} onClose={() => setOpen(false)} label="Request early access" className="top-[6vh] mt-0 w-[min(620px,calc(100vw-24px))]">
      <div className="relative max-h-[88dvh] overflow-y-auto rounded-[20px] border border-line-strong bg-surface p-6 shadow-window sm:p-8" data-lenis-prevent>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-[10px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
        >
          <X className="size-[18px]" strokeWidth={1.5} />
        </button>
        <h2 className="font-serif text-[32px] leading-[1.1] tracking-[-0.02em]">Request early access</h2>
        <p className="mt-3 max-w-[30rem] text-[15px] leading-[24px] text-ink-2">
          Tell us about your team. We keep the request on our own server, read it ourselves, and reply by email. No payment details are asked for.
        </p>
        <div className="mt-7">
          <Form key={round} onDone={() => setOpen(false)} />
        </div>
      </div>
    </Modal>
  );
}
