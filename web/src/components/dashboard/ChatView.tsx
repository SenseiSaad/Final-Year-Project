"use client";

import { CircleSlash, CornerDownLeft, FileText, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { TextShimmer } from "@/components/core/text-shimmer";
import { Mark } from "@/components/site/Logo";

import {
  nowTime,
  qaCases,
  type ChatTurn,
  type QaCase,
  type RoleProfile,
  type WorkspaceDoc,
} from "./dashboardData";

type Props = {
  profile: RoleProfile;
  visibleDocs: WorkspaceDoc[];
  turns: ChatTurn[];
  onAppendTurn: (turn: ChatTurn) => void;
  onClearTurns: () => void;
};

export function ChatView({ profile, visibleDocs, turns, onAppendTurn, onClearTurns }: Props) {
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pending]);

  function ask(question: string, preset?: QaCase) {
    if (pending) return;
    const estimate = estimateMs(preset?.question ?? question);

    // Under three seconds, answer immediately. Only slower questions show a search state.
    if (estimate < 3000) {
      onAppendTurn(resolveAnswer(question, preset));
      return;
    }

    setPending(true);
    window.setTimeout(() => {
      onAppendTurn(resolveAnswer(question, preset));
      setPending(false);
    }, estimate);
  }

  function resolveAnswer(questionText: string, preset?: QaCase): ChatTurn {
    const id = `t-${turns.length + 1}-${questionText.length}`;
    const lower = questionText.toLowerCase();
    const matched =
      preset ?? qaCases.find((c) => c.keywords.some((kw) => lower.includes(kw)));

    const uploadedHit = visibleDocs.find(
      (d) =>
        d.id.startsWith("upload-") &&
        lower.includes(d.name.replace(/\.[^.]+$/, "").toLowerCase()),
    );
    if (!matched && uploadedHit) {
      return {
        id,
        question: questionText,
        answer: `Indexed content from your uploaded file is available in search for permitted members (${uploadedHit.visibility} visibility, ${uploadedHit.chunks} chunks).`,
        files: [uploadedHit.name],
        refused: false,
        time: nowTime(),
      };
    }

    const chosen = matched ?? qaCases[qaCases.length - 1];
    const canRead =
      chosen.requiredDocId !== null && visibleDocs.some((d) => d.id === chosen.requiredDocId);

    if (!canRead) {
      return {
        id,
        question: questionText,
        answer: chosen.refusal,
        files: [],
        refused: true,
        time: nowTime(),
      };
    }

    const okfActive =
      Boolean(chosen.okfDocId) &&
      visibleDocs.some((d) => d.id === chosen.okfDocId && d.isOkf);

    return {
      id,
      question: questionText,
      answer: okfActive && chosen.okfAnswerText ? chosen.okfAnswerText : chosen.answerText,
      files: okfActive && chosen.okfSourceFiles ? chosen.okfSourceFiles : chosen.sourceFiles,
      refused: false,
      time: nowTime(),
    };
  }

  function askPreset(item: QaCase) {
    ask(item.question, item);
  }

  

  return (
    <div className="mx-auto flex h-full w-full max-w-[780px] flex-col">
      {/* Open quick prompt strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick prompts">
          {qaCases.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => askPreset(item)}
              className="h-8 rounded-lg bg-deep px-3 text-[13px] font-medium text-ink-2 transition-colors duration-150 hover:bg-raised hover:text-ink"
            >
              {item.label}
            </button>
          ))}
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={onClearTurns}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-ink-3 transition-colors hover:bg-raised hover:text-ink"
          >
            <RotateCcw className="size-3.5" strokeWidth={1.5} />
            New thread
          </button>
        )}
      </div>

      {/* Open frameless conversation flow */}
      <div className="flex-1 divide-y divide-line overflow-y-auto pr-1">
        {turns.map((turn) => (
          <div key={turn.id} className="space-y-4 py-6 animate-[fade-up_200ms_var(--ease-out-soft)]">
            <div className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-medium text-ink">
                {profile.initials}
              </span>
              <p className="min-w-0 flex-1 pt-0.5 text-[15px] font-medium leading-[23px] text-ink">
                {turn.question}
              </p>
              <span className="pt-1 text-[12px] tabular-nums text-ink-3">{turn.time}</span>
            </div>

            <div className="flex items-start gap-3">
              <Mark className="size-7 shrink-0" />
              <div className="min-w-0 flex-1 pt-0.5">
                {turn.refused ? (
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
                      <CircleSlash className="size-4 text-ink-2" strokeWidth={1.5} />
                      No permitted source matched
                    </p>
                    <p className="text-[15px] leading-[24px] text-ink-2">{turn.answer}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[15px] leading-[26px] text-ink-2">{turn.answer}</p>
                    {turn.files.length > 0 && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-3">
                        {turn.files.map((fileName) => {
                          const docMatch = visibleDocs.find((d) => d.name === fileName);
                          return (
                            <span
                              key={fileName}
                              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink"
                            >
                              <FileText className="size-3.5 shrink-0 text-ink-3" strokeWidth={1.5} />
                              {fileName}
                              {docMatch?.isOkf && (
                                <span className="rounded bg-btn px-1.5 py-0.5 text-[11px] font-medium text-on-btn">
                                  OKF
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex items-start gap-3 py-6">
            <Mark className="size-7 shrink-0" />
            <TextShimmer className="pt-0.5 font-mono text-[12px]" duration={1.2}>
              Searching documents…
            </TextShimmer>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Single clean input bar (border only where typing happens) */}
      <Composer onAsk={ask} documentCount={visibleDocs.length} disabled={pending} />
    </div>
  );
}

/** Rough answer time. Only the slow, multi-document questions get a search state. */
function estimateMs(question: string) {
  const words = question.trim().split(/\s+/).length;
  const complex = /(compare|summari[sz]e|across all|all documents|every (policy|document)|audit)/i.test(question);
  return 450 + words * 45 + (complex ? 2600 : 0);
}

function Composer({
  onAsk,
  documentCount,
  disabled,
}: {
  onAsk: (question: string) => void;
  documentCount: number;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onAsk(trimmed);
    setValue("");
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3.5 py-2"
    >
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={`Ask across ${documentCount} permitted documents (English or Roman Urdu)...`}
        className="h-10 flex-1 bg-transparent px-2 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-btn px-4 text-[14px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        Send
        <CornerDownLeft className="size-3.5" strokeWidth={1.5} />
      </button>
    </form>
  );
}
