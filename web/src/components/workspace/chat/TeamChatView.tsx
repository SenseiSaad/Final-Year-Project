"use client";

import { ArrowDown, ArrowLeft, Hash, Lock, MessagesSquare, Plus, Settings2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { Button } from "@/components/ui/Button";
import { useResource } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { errorMessage, type Bootstrap, type Room, type RoomMessage } from "@/lib/workspace-api";

import { EmptyState, ErrorNote, Skeleton } from "../ui";
import { useWorkspace } from "../WorkspaceContext";
import { Composer } from "./Composer";
import { RoomEditor, type EditorTarget } from "./RoomEditor";
import { groupMessages, RoomMessages } from "./RoomMessages";
import { useStaggerIn } from "./useStaggerIn";

const POLL_MS = 4000;
const NEAR_BOTTOM = 96;

export function TeamChatView() {
  const { boot } = useWorkspace();
  if (!boot) return <TeamSkeleton />;
  return <TeamScreen boot={boot} />;
}

function TeamSkeleton() {
  return (
    <div className="grid h-[calc(100dvh-3.5rem)] min-h-[520px] grid-cols-1 lg:grid-cols-[288px_minmax(0,1fr)]" aria-busy="true">
      <div className="hidden border-r border-line p-4 lg:grid lg:content-start lg:gap-2">
        <Skeleton className="h-8 w-24" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
      <div className="p-6">
        <Skeleton className="h-6 w-48" />
      </div>
    </div>
  );
}

function scopeText(room: Room) {
  if (room.scope === "department" && room.department) return `${room.department.name} department`;
  if (room.scope === "members") return `${room.member_ids.length} selected ${room.member_ids.length === 1 ? "member" : "members"}`;
  return "Everyone";
}

function TeamScreen({ boot }: { boot: Bootstrap }) {
  const { request } = useWorkspace();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [view, setView] = useState<"list" | "room">("list");
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const loadRooms = useCallback((signal: AbortSignal) => request<{ rooms: Room[] }>("/rooms/", { signal }).then((r) => r.rooms), [request]);
  const rooms = useResource(loadRooms);
  const list = rooms.data ?? [];
  const active = list.find((room) => room.id === activeId) ?? list[0];

  useStaggerIn(listRef, "[data-row]", rooms.data !== undefined);

  const canCreate = boot.capabilities.create_rooms;

  return (
    <div className="grid h-[calc(100dvh-3.5rem)] min-h-[520px] grid-cols-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[288px_minmax(0,1fr)]">
      <aside aria-label="Rooms" className={cn("min-h-0 min-w-0 flex-col border-line lg:flex lg:border-r", view === "list" ? "flex" : "hidden")}>
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line px-4">
          <h1 className="text-[16px] font-medium">Team chat</h1>
          {canCreate && (
            <Button variant="secondary" size="sm" onClick={() => setEditor("new")}>
              <Plus className="size-4" strokeWidth={1.5} />
              Add room
            </Button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {rooms.error && <ErrorNote message={rooms.error} onRetry={rooms.reload} />}
          {rooms.data === undefined && !rooms.error && (
            <div className="grid gap-1" aria-busy="true">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          )}
          <ul ref={listRef} className="grid gap-0.5">
            {list.map((room) => (
              <li key={room.id} data-row="">
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(room.id);
                    setView("room");
                  }}
                  aria-current={room.id === active?.id ? "true" : undefined}
                  className={cn(
                    "flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[14px] transition-colors duration-150",
                    room.id === active?.id ? "bg-raised font-medium text-ink" : "text-ink-2 hover:bg-hover hover:text-ink",
                  )}
                >
                  {room.scope === "workspace" ? <Hash className="size-4 shrink-0" strokeWidth={1.5} /> : <Lock className="size-4 shrink-0" strokeWidth={1.5} />}
                  <span className="truncate">{room.name}</span>
                </button>
              </li>
            ))}
          </ul>
          {!canCreate && rooms.data !== undefined && (
            <p className="px-3 pt-4 text-[13px] leading-[20px] text-ink-3">Your role can read and post in rooms it belongs to. Managers and administrators add rooms.</p>
          )}
        </div>
      </aside>

      <section aria-label="Room conversation" className={cn("min-h-0 min-w-0 flex-col lg:flex", view === "room" ? "flex" : "hidden")}>
        {active ? (
          <RoomPanel key={active.id} room={active} userId={boot.user.id} onBack={() => setView("list")} onManage={() => setEditor(active)} />
        ) : (
          <>
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-5 lg:hidden">
              <Button variant="ghost" size="icon" className="-ml-1" aria-label="Back to rooms" onClick={() => setView("list")}>
                <ArrowLeft className="size-[18px]" strokeWidth={1.5} />
              </Button>
            </div>
            {rooms.data !== undefined && <EmptyState icon={MessagesSquare} title="No rooms available" text="Rooms you can read and post in appear here." className="flex-1" />}
          </>
        )}
      </section>

      <RoomEditor
        target={editor}
        onClose={() => setEditor(null)}
        onSaved={(room) => {
          setEditor(null);
          setActiveId(room.id);
          setView("room");
          rooms.setData((previous) => (previous?.some((r) => r.id === room.id) ? previous.map((r) => (r.id === room.id ? room : r)) : [...(previous ?? []), room]));
          rooms.reload();
        }}
        onDeleted={(room) => {
          setEditor(null);
          setActiveId(null);
          setView("list");
          rooms.setData((previous) => (previous ?? []).filter((r) => r.id !== room.id));
          rooms.reload();
        }}
      />
    </div>
  );
}

function RoomPanel({ room, userId, onBack, onManage }: { room: Room; userId: number; onBack: () => void; onManage: () => void }) {
  const { request } = useWorkspace();
  const reduced = useReducedMotion();
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [fresh, setFresh] = useState<ReadonlySet<number>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const lastId = useRef(0);
  const seen = useRef(new Set<number>());
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const forceScroll = useRef(false);
  const firstLoad = useRef(true);

  const append = useCallback((incoming: RoomMessage[], own: boolean) => {
    const added = incoming.filter((m) => !seen.current.has(m.id));
    if (!added.length) return;
    added.forEach((m) => seen.current.add(m.id));
    setMessages((previous) => [...previous, ...added]);
    if (!firstLoad.current) {
      setFresh((current) => new Set([...current, ...added.map((m) => m.id)]));
      if (!own && !stick.current) setUnseen((count) => count + added.length);
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const result = await request<{ messages: RoomMessage[] }>(`/rooms/${room.id}/messages/?after=${lastId.current}`);
      if (result.messages.length) {
        lastId.current = Math.max(lastId.current, result.messages[result.messages.length - 1].id);
        append(result.messages, false);
      }
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      firstLoad.current = false;
      setLoaded(true);
    }
  }, [request, room.id, append]);

  useEffect(() => {
    const first = window.setTimeout(() => void poll(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [poll]);

  // Follow new messages only when the reader is already at the bottom (or just sent one)
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (stick.current || forceScroll.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: !loaded || reduced || !forceScroll.current ? "auto" : "smooth" });
      forceScroll.current = false;
    }
  }, [messages, loaded, reduced]);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM;
    if (stick.current) setUnseen(0);
  }

  function jumpToLatest() {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }

  async function send(content: string) {
    if (sending) return false;
    setSending(true);
    try {
      const result = await request<{ message: RoomMessage }>(`/rooms/${room.id}/messages/`, { method: "POST", json: { content } });
      lastId.current = Math.max(lastId.current, result.message.id);
      forceScroll.current = true;
      append([result.message], true);
      setError(null);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setSending(false);
    }
  }

  const days = useMemo(() => groupMessages(messages, userId), [messages, userId]);

  return (
    <div className="flex min-h-0 flex-1 animate-[fade-in_300ms_var(--ease-soft)_both] flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-5">
        <Button variant="ghost" size="icon" className="-ml-1 lg:hidden" aria-label="Back to rooms" onClick={onBack}>
          <ArrowLeft className="size-[18px]" strokeWidth={1.5} />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-[15px] font-medium">
            {room.scope === "workspace" ? <Hash className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} /> : <Lock className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} />}
            <span className="truncate">{room.name}</span>
          </h2>
          <p className="truncate text-[13px] leading-[16px] text-ink-3">
            {scopeText(room)}
            {room.description ? `, ${room.description}` : ""}
          </p>
        </div>
        {room.can_manage && (
          <Button variant="secondary" size="sm" onClick={onManage}>
            <Settings2 className="size-4" strokeWidth={1.5} />
            Manage
          </Button>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={scroller} onScroll={onScroll} role="log" aria-live={loaded ? "polite" : "off"} aria-label={`${room.name} messages`} className="h-full overflow-y-auto overscroll-contain">
          {!loaded && (
            <div className="mx-auto grid w-full max-w-[46rem] gap-4 px-5 py-8 sm:px-8" role="status" aria-label="Loading messages">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          )}
          {loaded && messages.length === 0 && <EmptyState icon={MessagesSquare} title="No messages yet" text={`Start the conversation in ${room.name}.`} />}
          {messages.length > 0 && <RoomMessages days={days} fresh={fresh} />}
        </div>
        {unseen > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <Button variant="secondary" size="sm" className="pointer-events-auto animate-[rise-in_320ms_var(--ease-soft)_both] bg-bg" onClick={jumpToLatest}>
              <ArrowDown className="size-4" strokeWidth={1.5} />
              {unseen === 1 ? "1 new message" : `${unseen} new messages`}
            </Button>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line">
        <div className="mx-auto grid w-full max-w-[46rem] gap-3 px-5 pb-4 pt-3 sm:px-8">
          {error && <ErrorNote message={error} />}
          <Composer id="room-message" label={`Message ${room.name}`} placeholder={`Message ${room.name}`} sendLabel="Send message" busyLabel="Sending message" busy={sending} onSend={send} />
        </div>
      </div>
    </div>
  );
}
