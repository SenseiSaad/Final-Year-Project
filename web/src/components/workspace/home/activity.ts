import type { AuditEventItem } from "@/lib/workspace-api";

/* Plain-language description of one audit entry: "uploaded Leave policy" */
const VERBS: Record<string, string> = {
  "document.upload": "uploaded",
  "document.delete": "deleted",
  "document.download": "downloaded",
  "document.view": "opened",
  "document.search": "searched documents for",
  "document.access.update": "changed access to",
  "chat.question": "asked",
  "chat.thread.create": "started a chat",
  "chat.thread.delete": "deleted a chat",
  "team.message.create": "posted in",
  "team.room.create": "created the room",
  "announcement.create": "announced",
  "announcement.update": "edited the announcement",
  "announcement.delete": "removed the announcement",
  "member.create": "added",
  "member.update": "updated",
  "department.create": "created the department",
  "department.update": "updated the department",
  "role.update": "updated the role",
  "audit.verify": "verified the audit chain",
  "audit.history.view": "opened the history of",
};

const text = (value: unknown) => (typeof value === "string" ? value : "");

export function describeEvent(event: AuditEventItem): { verb: string; subject: string } {
  const d = event.details ?? {};
  const subject = text(d.title) || text(d.room) || text(d.name) || text(d.viewed) || text(d.query) || text(d.question) || text(d.filename);
  const verb = VERBS[event.event_type] ?? event.event_type.replace(/[._]/g, " ");
  return { verb, subject: subject.length > 70 ? `${subject.slice(0, 70)}…` : subject };
}
