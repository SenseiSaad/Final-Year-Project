"use client";

import { CornerDownLeft, FileText, Hash, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  nowTime,
  teamChannels,
  type RoleProfile,
  type TeamMessage,
} from "./dashboardData";

type Props = {
  isAdmin: boolean;
  profile: RoleProfile;
  messages: TeamMessage[];
  onSendMessage: (msg: TeamMessage) => void;
};

export function TeamChatView({ isAdmin, profile, messages, onSendMessage }: Props) {
  const allowedChannels = teamChannels.filter((ch) => isAdmin || !ch.adminOnly);
  const [channelId, setChannelId] = useState<string>(allowedChannels[0].id);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const activeChannel =
    allowedChannels.find((c) => c.id === channelId) ?? allowedChannels[0];
  const channelMessages = messages.filter((m) => m.channelId === activeChannel.id);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [channelMessages.length, activeChannel.id]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSendMessage({
      id: `tm-${messages.length + 1}-${text.length}`,
      channelId: activeChannel.id,
      author: profile.name,
      initials: profile.initials,
      role: profile.department,
      time: nowTime(),
      text,
    });
    setDraft("");
  }

  return (
    <div className="mx-auto grid h-full w-full max-w-[1040px] gap-6 lg:grid-cols-[200px_1fr] lg:gap-8">
      {/* Open channel rail separated by one hairline */}
      <div className="border-b border-line pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
        <p className="pb-2 text-[13px] font-medium text-ink-3">Channels</p>
        <div className="flex gap-1 overflow-x-auto lg:flex-col">
          {allowedChannels.map((ch) => {
            const active = ch.id === activeChannel.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChannelId(ch.id)}
                className={`flex h-9 shrink-0 items-center justify-between gap-2 rounded-lg px-3 text-[14px] transition-colors duration-150 ${
                  active ? "bg-btn font-medium text-on-btn" : "text-ink-2 hover:bg-raised hover:text-ink"
                }`}
              >
                <span className="flex items-center gap-2">
                  {ch.adminOnly ? (
                    <Lock className="size-3.5" strokeWidth={1.5} />
                  ) : (
                    <Hash className="size-3.5" strokeWidth={1.5} />
                  )}
                  {ch.name}
                </span>
                <span className={`text-[12px] tabular-nums ${active ? "opacity-80" : "text-ink-3"}`}>
                  {messages.filter((m) => m.channelId === ch.id).length}
                </span>
              </button>
            );
          })}
        </div>
        {!isAdmin && (
          <p className="mt-4 hidden text-[13px] leading-[19px] text-ink-3 lg:block">
            Private HR channels stay hidden in Employee view.
          </p>
        )}
      </div>

      {/* Open message flow directly on canvas */}
      <div className="flex min-h-[440px] flex-col">
        <div className="flex items-baseline justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="flex items-center gap-1.5 text-[16px] font-semibold text-ink">
              <Hash className="size-4 text-ink-3" strokeWidth={1.5} />
              {activeChannel.name}
            </h2>
            <p className="text-[13px] text-ink-3">{activeChannel.description}</p>
          </div>
          <span className="text-[13px] font-medium text-ink-3">{activeChannel.scope}</span>
        </div>

        <div className="flex-1 divide-y divide-line overflow-y-auto py-2">
          {channelMessages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-3 py-4 animate-[fade-up_200ms_var(--ease-out-soft)]">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-medium text-ink">
                {msg.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[15px] font-semibold text-ink">{msg.author}</span>
                  <span className="text-[13px] text-ink-3">{msg.role}</span>
                  <span className="ml-auto text-[12px] tabular-nums text-ink-3">{msg.time}</span>
                </div>
                <p className="mt-1 text-[15px] leading-[24px] text-ink-2">{msg.text}</p>
                {msg.attachment && (
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
                    <FileText className="size-3.5 text-ink-3" strokeWidth={1.5} />
                    {msg.attachment}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="mt-4 flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3.5 py-2"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message #${activeChannel.name}...`}
            className="h-9 flex-1 bg-transparent px-2 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-btn px-4 text-[13px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98]"
          >
            Send
            <CornerDownLeft className="size-3.5" strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
