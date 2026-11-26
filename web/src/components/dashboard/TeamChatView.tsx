"use client";

import { ArrowUp, Hash, Lock, Plus, Settings2, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useResource } from "@/hooks/useResource";
import {
  errorMessage,
  formatTime,
  type Room,
  type RoomMessage,
} from "@/lib/workspace-api";

import { Avatar, btnGhost, btnPrimary, btnSecondary, ConfirmModal, EmptyState, ErrorNote, Field, inputClass, Modal } from "./ui";
import { useWorkspace } from "./WorkspaceContext";

const scopeLabel: Record<Room["scope"], string> = {
  workspace: "Everyone",
  department: "One department",
  members: "Selected members",
};

export function TeamChatView() {
  const { boot, request } = useWorkspace();
  const b = boot!;
  const [activeId, setActiveId] = useState<number | null>(null);
  const [editor, setEditor] = useState<"new" | Room | null>(null);

  const loadRooms = useCallback((signal: AbortSignal) => request<{ rooms: Room[] }>("/rooms/", { signal }).then((r) => r.rooms), [request]);
  const rooms = useResource(loadRooms);
  const list = rooms.data ?? [];
  const active = list.find((room) => room.id === activeId) ?? list[0];

  return (
    <div className="mx-auto grid h-full w-full max-w-[1100px] gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6">
      <aside className="flex min-h-0 flex-col md:border-r md:border-line md:pr-4" aria-label="Rooms">
        <div className="flex items-center justify-between gap-2 pb-2">
          <h2 className="text-[13px] font-medium text-ink-2">Rooms</h2>
          {b.capabilities.create_rooms && (
            <button type="button" onClick={() => setEditor("new")} className={btnGhost}>
              <Plus className="size-3.5" strokeWidth={1.5} />
              Add room
            </button>
          )}
        </div>
        {rooms.error && <ErrorNote onRetry={rooms.reload}>{rooms.error}</ErrorNote>}
        <ul className="flex gap-1 overflow-x-auto pb-1 md:grid md:overflow-visible md:pb-0">
          {list.map((room) => (
            <li key={room.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveId(room.id)}
                aria-current={room.id === active?.id ? "true" : undefined}
                className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-[14px] transition-colors ${
                  room.id === active?.id ? "bg-btn font-medium text-on-btn" : "text-ink-2 hover:bg-raised hover:text-ink"
                }`}
              >
                {room.scope === "workspace" ? <Hash className="size-3.5 shrink-0" strokeWidth={1.5} /> : <Lock className="size-3.5 shrink-0" strokeWidth={1.5} />}
                <span className="truncate">{room.name}</span>
              </button>
            </li>
          ))}
        </ul>
        {!b.capabilities.create_rooms && (
          <p className="mt-3 hidden text-[12px] leading-[18px] text-ink-3 md:block">
            Your role can read and post in rooms it belongs to. Managers and administrators add rooms.
          </p>
        )}
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col" aria-label="Room conversation">
        {active ? (
          <RoomPanel key={active.id} room={active} onManage={() => setEditor(active)} />
        ) : (
          !rooms.loading && <EmptyState title="No rooms available" />
        )}
      </section>

      <RoomEditor
        target={editor}
        onClose={() => setEditor(null)}
        onSaved={(room) => {
          setEditor(null);
          if (room) setActiveId(room.id);
          rooms.reload();
        }}
        onDeleted={() => {
          setEditor(null);
          setActiveId(null);
          rooms.reload();
        }}
      />
    </div>
  );
}

function RoomPanel({ room, onManage }: { room: Room; onManage: () => void }) {
  const { boot, request } = useWorkspace();
  const b = boot!;
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    try {
      const result = await request<{ messages: RoomMessage[] }>(`/rooms/${room.id}/messages/?after=${lastId.current}`);
      if (result.messages.length) {
        lastId.current = result.messages[result.messages.length - 1].id;
        setMessages((prev) => [...prev, ...result.messages.filter((m) => !prev.some((p) => p.id === m.id))]);
      }
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoaded(true);
    }
  }, [request, room.id]);

  useEffect(() => {
    void poll();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [poll]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const result = await request<{ message: RoomMessage }>(`/rooms/${room.id}/messages/`, { method: "POST", json: { content } });
      lastId.current = Math.max(lastId.current, result.message.id);
      setMessages((prev) => (prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message]));
      setDraft("");
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  const scopeText =
    room.scope === "department" && room.department
      ? `${room.department.name} department`
      : room.scope === "members"
        ? `${room.member_ids.length} selected ${room.member_ids.length === 1 ? "member" : "members"}`
        : "Everyone";

  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-[16px] font-semibold">
            <Hash className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} />
            <span className="truncate">{room.name}</span>
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-3">
            <Users className="size-3.5 shrink-0" strokeWidth={1.5} />
            <span className="truncate">
              {scopeText}
              {room.description ? ` · ${room.description}` : ""}
            </span>
          </p>
        </div>
        {room.can_manage && (
          <button type="button" onClick={onManage} className={btnSecondary}>
            <Settings2 className="size-4" strokeWidth={1.5} />
            Manage
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" role="log" aria-live="polite" aria-label={`${room.name} messages`}>
        {!loaded && <p className="py-10 text-center text-[14px] text-ink-3">Loading messages…</p>}
        {loaded && messages.length === 0 && <EmptyState title="No messages yet">Start the conversation in {room.name}.</EmptyState>}
        <ul className="divide-y divide-line">
          {messages.map((message) => (
            <li key={message.id} className="flex items-start gap-3 py-3.5">
              <Avatar name={message.sender} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2">
                  <span className="truncate text-[14px] font-semibold">{message.sender}</span>
                  <span className="ml-auto shrink-0 text-[12px] tabular-nums text-ink-3">{formatTime(message.created_at)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-[23px] text-ink-2">{message.content}</p>
              </div>
            </li>
          ))}
        </ul>
        <div ref={endRef} />
      </div>

      <div className="shrink-0 pt-3">
        {error && (
          <div className="mb-2">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface p-2"
        >
          <label htmlFor="room-message" className="sr-only">
            Message {room.name}
          </label>
          <input
            id="room-message"
            value={draft}
            maxLength={4000}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Message ${room.name}`}
            autoComplete="off"
            className="h-10 min-w-0 flex-1 bg-transparent px-2 text-[15px] placeholder:text-ink-3 focus:outline-none"
          />
          <button type="submit" disabled={sending || !draft.trim() || !b} aria-label="Send message" className={`${btnPrimary} size-10 px-0`}>
            <ArrowUp className="size-4" strokeWidth={2} />
          </button>
        </form>
      </div>
    </>
  );
}

function RoomEditor({
  target,
  onClose,
  onSaved,
  onDeleted,
}: {
  target: "new" | Room | null;
  onClose: () => void;
  onSaved: (room: Room | null) => void;
  onDeleted: () => void;
}) {
  const { boot, request } = useWorkspace();
  const b = boot!;
  const room = target && target !== "new" ? target : null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<Room["scope"]>("workspace");
  const [departmentId, setDepartmentId] = useState("");
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [seeded, setSeeded] = useState<typeof target>(null);

  if (target !== seeded) {
    setSeeded(target);
    setError(null);
    setName(room?.name ?? "");
    setDescription(room?.description ?? "");
    setScope(room?.scope ?? "workspace");
    setDepartmentId(room?.department ? String(room.department.id) : "");
    setMemberIds(room?.member_ids ?? []);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const json = {
      name,
      description,
      scope,
      department_id: scope === "department" ? Number(departmentId) || null : null,
      member_ids: scope === "members" ? memberIds : [],
    };
    try {
      const result = room
        ? await request<{ room: Room }>(`/rooms/${room.id}/`, { method: "PATCH", json })
        : await request<{ room: Room }>("/rooms/", { method: "POST", json });
      onSaved(result.room);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!room) return;
    try {
      await request(`/rooms/${room.id}/`, { method: "DELETE" });
      setConfirmDelete(false);
      onDeleted();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <>
      <Modal
        open={target !== null && !confirmDelete}
        onClose={onClose}
        title={room ? `Manage ${room.name}` : "Add a room"}
        description="Choose who can see and post in this room."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="grid gap-4"
        >
          <Field label="Room name" htmlFor="room-name">
            <input id="room-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required className={inputClass} />
          </Field>
          <Field label="Description (optional)" htmlFor="room-description">
            <input id="room-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className={inputClass} />
          </Field>
          <Field label="Who can join" htmlFor="room-scope">
            <select id="room-scope" value={scope} onChange={(e) => setScope(e.target.value as Room["scope"])} className={inputClass}>
              {(Object.keys(scopeLabel) as Room["scope"][]).map((key) => (
                <option key={key} value={key}>
                  {scopeLabel[key]}
                </option>
              ))}
            </select>
          </Field>
          {scope === "department" && (
            <Field label="Department" htmlFor="room-department" hint="Members of this department and managers assigned to it.">
              <select id="room-department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required className={inputClass}>
                <option value="">Choose a department</option>
                {b.departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {scope === "members" && (
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium">Members</legend>
              <ul className="grid max-h-48 gap-0.5 overflow-y-auto rounded-lg border border-line p-1.5">
                {b.personas.map((person) => (
                  <li key={person.id}>
                    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-[14px] hover:bg-raised">
                      <input
                        type="checkbox"
                        checked={memberIds.includes(person.id)}
                        onChange={() =>
                          setMemberIds((prev) => (prev.includes(person.id) ? prev.filter((id) => id !== person.id) : [...prev, person.id]))
                        }
                        className="size-4 accent-[var(--accent)]"
                      />
                      <span className="min-w-0 truncate">
                        {person.display_name} · {person.role.name}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[12px] text-ink-3">You are always included as the room&apos;s creator.</p>
            </fieldset>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {room ? (
              <button type="button" onClick={() => setConfirmDelete(true)} className={btnGhost}>
                Delete room
              </button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={onClose} className={btnSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={busy || !name.trim()} className={btnPrimary}>
                {busy ? "Saving…" : room ? "Save room" : "Add room"}
              </button>
            </div>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        open={confirmDelete}
        title={`Delete ${room?.name ?? "room"}?`}
        description="All messages in the room are removed."
        confirmLabel="Delete room"
        error={error}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
