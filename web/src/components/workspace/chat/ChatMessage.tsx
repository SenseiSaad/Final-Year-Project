"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CircleSlash } from "lucide-react";
import { Fragment, useRef, useState, type ReactNode } from "react";

import { Cite } from "@/components/ui/Cite";
import { cn } from "@/lib/cn";
import type { ChatMessage, Citation, ProviderInfo } from "@/lib/workspace-api";

gsap.registerPlugin(useGSAP);

const STOP = new Set(["what", "when", "where", "which", "who", "whom", "how", "does", "with", "that", "this", "from", "have", "your", "about", "there", "their", "would", "could", "should", "into", "than", "then", "they", "them", "will"]);

/* Words from the question that are worth marking inside a passage */
function queryTerms(question: string) {
  return [...new Set(question.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [])].filter((word) => !STOP.has(word)).slice(0, 12);
}

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "giu");
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-[3px] bg-mark px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function citeLabel(citation: Citation) {
  const title = citation.title.length > 30 ? `${citation.title.slice(0, 29)}…` : citation.title;
  return citation.page ? `${title} | ${citation.page}` : title;
}

/* The answer as running text, with each [Source n] marker turned into a citation tag */
function AnswerText({ message, animate }: { message: ChatMessage; animate: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);

  // Words fade in once, quickly. The full text is already in the DOM, so nothing waits on this.
  useGSAP(
    () => {
      if (!animate) return;
      const words = gsap.utils.toArray<HTMLElement>("[data-w]", ref.current);
      if (!words.length) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(words, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power3.out", stagger: Math.min(0.03, 1.4 / words.length), clearProps: "opacity" });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [animate] },
  );

  const word = (text: string, key: string): ReactNode =>
    animate
      ? text.split(/(\s+)/).map((token, i) =>
          token === "" || /^\s+$/.test(token) ? (
            token
          ) : (
            <span key={`${key}-${i}`} data-w="">
              {token}
            </span>
          ),
        )
      : text;

  return (
    <p ref={ref} className="whitespace-pre-wrap break-words text-[15px] leading-[28px] text-ink">
      {word(message.content.replace(/[ \t]*\[Source \d+\]/g, "").trim(), "a")}
    </p>
  );
}

/* One source on the right: file name first, the matched passage beside or below it */
function SourceCard({ citation, terms, active }: { citation: Citation; terms: string[]; active: boolean }) {
  return (
    <li id={`source-${citation.source}`} className={cn("rounded-[10px] border p-3 transition-colors duration-300", active ? "border-ink" : "border-line")}>
      <p className="flex flex-wrap items-baseline gap-x-3 text-[14px] font-medium">
        <span className="min-w-0 break-words">{citation.title}</span>
        {citation.page && <span className="font-mono text-[12px] font-normal text-ink-3">page {citation.page}</span>}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-[14px] leading-[22px] text-ink-2">
        <Highlighted text={citation.snippet} terms={terms} />
      </p>
    </li>
  );
}

export function AnswerMessage({
  message,
  question,
  provider,
  fresh,
}: {
  message: ChatMessage;
  question: string;
  provider: ProviderInfo | undefined;
  fresh: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);

  function toggle(number: number) {
    setOpen((current) => (current === number ? null : number));
  }

  if (message.status === "refused") {
    return (
      <div className={cn("border-l border-line-strong pl-4", fresh && "animate-[rise-in_320ms_var(--ease-soft)_both]")}>
        <p className="flex items-center gap-2 text-[15px] font-medium">
          <CircleSlash className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} />
          No permitted source matched
        </p>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-[24px] text-ink-2">{message.content}</p>
        <p className="mt-2 text-[13px] leading-[20px] text-ink-3">Answers only come from documents this account may open.</p>
      </div>
    );
  }

  const terms = queryTerms(question);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-10">
      <div className="min-w-0">
        <AnswerText message={message} animate={fresh} />
        {message.citations.length > 0 && (
          <ul className={cn("mt-4 flex flex-wrap gap-2", fresh && "animate-[fade-in_400ms_var(--ease-soft)_600ms_both]")} aria-label="Source documents">
            {message.citations.map((citation) => (
              <li key={citation.source}>
                <Cite pressed={open === citation.source} onPress={() => toggle(citation.source)}>
                  {citeLabel(citation)}
                </Cite>
              </li>
            ))}
          </ul>
        )}
        {message.provider && (
          <p className="mt-3 text-[12px] text-ink-3">
            {provider?.label ?? message.provider} · <span className="font-mono">{message.model}</span>
          </p>
        )}
      </div>
      {message.citations.length > 0 && (
        <ul className="grid min-w-0 grid-cols-1 content-start gap-3" aria-label="Where the answer comes from">
          {message.citations.map((citation) => (
            <SourceCard key={citation.source} citation={citation} terms={terms} active={open === citation.source} />
          ))}
        </ul>
      )}
    </div>
  );
}
