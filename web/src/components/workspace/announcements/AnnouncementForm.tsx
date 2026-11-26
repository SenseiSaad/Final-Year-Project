"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, type Announcement } from "@/lib/workspace-api";

import { ErrorNote } from "../ui";
import { useWorkspace } from "../WorkspaceContext";

/* Create or edit an announcement. Only people with the announcements permission reach this. */
export function AnnouncementForm({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Announcement | null;
  onSaved: (announcement: Announcement) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} label={initial ? "Edit announcement" : "New announcement"} className="top-[8vh] mt-0 w-[min(560px,calc(100vw-24px))]">
      <FormBody key={initial?.id ?? "new"} initial={initial} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function FormBody({ initial, onClose, onSaved }: { initial?: Announcement | null; onClose: () => void; onSaved: (a: Announcement) => void }) {
  const { request } = useWorkspace();
  const { notify } = useToast();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [level, setLevel] = useState(initial?.level === "important" ? 1 : 0);
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError("Enter a title.");
    setBusy(true);
    setError(null);
    try {
      const json = { title, body, level: level === 1 ? "important" : "info", pinned };
      const data = initial
        ? await request<{ announcement: Announcement }>(`/announcements/${initial.id}/`, { method: "PATCH", json })
        : await request<{ announcement: Announcement }>("/announcements/", { method: "POST", json });
      onSaved(data.announcement);
      notify(initial ? "Announcement updated" : "Announcement posted");
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 rounded-[20px] border border-line-strong bg-surface p-6 shadow-window sm:p-8">
      <h2 className="font-serif text-[28px] leading-tight tracking-[-0.02em]">{initial ? "Edit announcement" : "New announcement"}</h2>
      <Field htmlFor="ann-title" label="Title">
        <Input id="ann-title" value={title} maxLength={160} autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="What should everyone know" />
      </Field>
      <Field htmlFor="ann-body" label="Message" hint="Optional">
        <Textarea id="ann-body" rows={5} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented label="Level" options={["Notice", "Important"]} value={level} onChange={setLevel} />
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink-2">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="size-4 accent-[var(--ink)]" />
          Pin to the top
        </label>
      </div>
      {error && <ErrorNote message={error} />}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          {initial ? "Save changes" : "Post announcement"}
        </Button>
      </div>
    </form>
  );
}
