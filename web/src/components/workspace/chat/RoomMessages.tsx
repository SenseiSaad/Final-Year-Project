"use client";

import { cn } from "@/lib/cn";
import { formatTime, type RoomMessage } from "@/lib/workspace-api";

import { Avatar } from "../ui";

const GAP = 10 * 60_000;

type Run = { key: number; sender: string; own: boolean; time: string; messages: RoomMessage[] };
type Day = { key: string; label: string; runs: Run[] };

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (dayKey(date) === dayKey(today)) return "Today";
  if (dayKey(date) === dayKey(yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) });
}

/* Messages grouped by day, then by consecutive sender */
export function groupMessages(messages: RoomMessage[], userId: number | undefined): Day[] {
  const days: Day[] = [];
  let previous: RoomMessage | null = null;
  for (const message of messages) {
    const date = new Date(message.created_at);
    const key = dayKey(date);
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      day = { key, label: dayLabel(date), runs: [] };
      days.push(day);
      previous = null;
    }
    const run = day.runs[day.runs.length - 1];
    const sameRun =
      run && previous && previous.sender_id === message.sender_id && previous.sender === message.sender && date.getTime() - new Date(previous.created_at).getTime() < GAP;
    if (sameRun) run.messages.push(message);
    else
      day.runs.push({
        key: message.id,
        sender: message.sender,
        own: userId !== undefined && message.sender_id === userId,
        time: message.created_at,
        messages: [message],
      });
    previous = message;
  }
  return days;
}

export function RoomMessages({ days, fresh }: { days: Day[]; fresh: ReadonlySet<number> }) {
  return (
    <ol className="mx-auto w-full max-w-[46rem] px-5 pb-4 sm:px-8">
      {days.map((day) => (
        <li key={day.key}>
          <div className="flex items-center gap-4 py-5" role="separator" aria-label={day.label}>
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
            <span aria-hidden="true" className="text-[13px] text-ink-3">
              {day.label}
            </span>
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
          </div>
          <ol className="grid grid-cols-1 gap-4">
            {day.runs.map((run) => (
              <li key={run.key} className={cn("flex gap-3", run.own && "justify-end")}>
                {!run.own && <Avatar name={run.sender} className="mt-0.5" />}
                <div className={cn("min-w-0", run.own ? "max-w-[min(34rem,88%)]" : "flex-1")}>
                  <p className={cn("flex items-baseline gap-2", run.own && "justify-end")}>
                    <span className="truncate text-[14px] font-medium">{run.own ? "You" : run.sender}</span>
                    <time dateTime={run.time} className="shrink-0 font-mono text-[12px] text-ink-3">
                      {formatTime(run.time)}
                    </time>
                  </p>
                  <div className={cn("mt-1 grid gap-1", run.own && "justify-items-end")}>
                    {run.messages.map((message) => (
                      <p
                        key={message.id}
                        className={cn(
                          "whitespace-pre-wrap break-words text-[15px] leading-[24px]",
                          run.own ? "text-ink" : "text-ink-2",
                          fresh.has(message.id) && "animate-[rise-in_320ms_var(--ease-soft)_both]",
                        )}
                      >
                        {message.content}
                      </p>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}
