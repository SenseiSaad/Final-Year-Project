"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { errorMessage, type Room } from "@/lib/workspace-api";

import { ConfirmModal, ErrorNote } from "../ui";
import { useWorkspace } from "../WorkspaceContext";

const SCOPES: { value: Room["scope"]; label: string }[] = [
  { value: "workspace", label: "Everyone" },
  { value: "department", label: "One department" },
  { value: "members", label: "Selected members" },
];

export type EditorTarget = "new" | Room;

/* Create a room, or manage one. The form mounts only while the dialog is open, so it always starts fresh. */
export function RoomEditor({
  target,
  onClose,
  onSaved,
  onDeleted,
}: {
  target: EditorTarget | null;
  onClose: () => void;
  onSaved: (room: Room) => void;
  onDeleted: (room: Room) => void;
}) {
  const room = target && target !== "new" ? target : null;
  return (
    <Modal open={target !== null} onClose={onClose} label={room ? `Manage ${room.name}` : "Add a room"} className="w-[min(520px,calc(100vw-24px))]">
      {target && <RoomForm key={room?.id ?? "new"} room={room} onClose={onClose} onSaved={onSaved} onDeleted={onDeleted} />}
    </Modal>
  );
}

function RoomForm({ room, onClose, onSaved, onDeleted }: { room: Room | null; onClose: () => void; onSaved: (room: Room) => void; onDeleted: (room: Room) => void }) {
  const { boot, request } = useWorkspace();
  const departments = boot?.departments ?? [];
  const people = boot?.personas ?? [];
  const [name, setName] = useState(room?.name ?? "");
  const [description, setDescription] = useState(room?.description ?? "");
  const [scope, setScope] = useState<Room["scope"]>(room?.scope ?? "workspace");
  const [departmentId, setDepartmentId] = useState(room?.department ? String(room.department.id) : "");
  const [memberIds, setMemberIds] = useState<number[]>(room?.member_ids ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    setDeleting(true);
    try {
      await request(`/rooms/${room.id}/`, { method: "DELETE" });
      onDeleted(room);
    } catch (e) {
      setConfirmDelete(false);
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="max-h-[calc(100dvh-48px)] overflow-y-auto rounded-[20px] border border-line-strong bg-surface p-6 shadow-window"
        hidden={confirmDelete}
      >
        <h2 className="text-[18px] font-medium">{room ? `Manage ${room.name}` : "Add a room"}</h2>
        <p className="mt-1 text-[14px] leading-[22px] text-ink-2">Choose who can see and post in this room.</p>

        <div className="mt-6 grid gap-4">
          <Field htmlFor="room-name" label="Room name">
            <Input id="room-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required autoComplete="off" />
          </Field>
          <Field htmlFor="room-description" label="Description" hint="Optional">
            <Input id="room-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} autoComplete="off" />
          </Field>
          <div className="grid gap-2">
            <p className="text-[14px]">Who can join</p>
            <Segmented
              label="Who can join"
              options={SCOPES.map((s) => s.label)}
              value={SCOPES.findIndex((s) => s.value === scope)}
              onChange={(index) => setScope(SCOPES[index].value)}
            />
          </div>
          {scope === "department" && (
            <Field htmlFor="room-department" label="Department" hint="Its members and the managers assigned to it">
              <Select id="room-department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                <option value="">Choose a department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {scope === "members" && (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-[14px]">Members</legend>
              <ul className="grid max-h-48 gap-0.5 overflow-y-auto rounded-[10px] border border-line-strong p-1">
                {people.map((person) => (
                  <li key={person.id}>
                    <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-[8px] px-3 text-[14px] transition-colors hover:bg-hover">
                      <input
                        type="checkbox"
                        checked={memberIds.includes(person.id)}
                        onChange={() => setMemberIds((prev) => (prev.includes(person.id) ? prev.filter((id) => id !== person.id) : [...prev, person.id]))}
                        className="size-4 accent-ink"
                      />
                      <span className="min-w-0 truncate">
                        {person.display_name} <span className="text-ink-3">{person.role.name}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="text-[12px] leading-[16px] text-ink-3">You are always included as the creator of the room.</p>
            </fieldset>
          )}
          {error && <ErrorNote message={error} />}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {room ? (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete room
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={!name.trim() || (scope === "department" && !departmentId)}>
              {room ? "Save room" : "Add room"}
            </Button>
          </div>
        </div>
      </form>
      <ConfirmModal
        open={confirmDelete}
        title={`Delete ${room?.name ?? "room"}?`}
        text="All messages in the room are removed."
        confirmLabel="Delete room"
        busy={deleting}
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
