import type { AuditEventItem } from "@/lib/workspace-api";

/* Event types as plain text. Anything unknown falls back to the raw type. */
const labels: Record<string, string> = {
  "chat.question": "Asked a question",
  "chat.thread.create": "Started a chat",
  "chat.thread.delete": "Deleted a chat",
  "document.search": "Searched documents",
  "document.upload": "Uploaded a document",
  "document.access.update": "Changed document access",
  "document.delete": "Deleted a document",
  "document.view": "Opened a document",
  "document.download": "Downloaded a document",
  "team.message.create": "Posted in a room",
  "team.room.create": "Created a room",
  "team.room.update": "Changed a room",
  "team.room.delete": "Deleted a room",
  "department.create": "Created a department",
  "department.update": "Changed a department",
  "department.delete": "Deleted a department",
  "member.create": "Added a person",
  "member.update": "Changed a person",
  "role.create": "Created a role",
  "role.update": "Changed a role",
  "role.delete": "Deleted a role",
  "announcement.create": "Posted an announcement",
  "announcement.update": "Changed an announcement",
  "announcement.delete": "Deleted an announcement",
  "audit.verify": "Verified the audit chain",
  "audit.history.view": "Opened a person's timeline",
};

export function eventLabel(type: string): string {
  return labels[type] ?? type;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

/* The one line shown beside the label in the ledger */
export function eventSummary(event: AuditEventItem): string {
  const d = event.details;
  switch (event.event_type) {
    case "chat.question":
      return text(d.question);
    case "document.search":
      return d.query ? `“${text(d.query)}”` : "";
    case "document.access.update":
      return [text(d.title), d.previous_access && d.access ? `${text(d.previous_access)} to ${text(d.access)}` : ""].filter(Boolean).join(", ");
    case "team.message.create":
      return text(d.room);
    case "audit.verify":
      return d.valid ? "Chain intact" : "Chain broken";
    case "audit.history.view":
      return text(d.viewed);
    default:
      return text(d.title) || text(d.name) || text(d.username) || text(d.code) || text(d.room);
  }
}

export function keyLabel(key: string): string {
  const spaced = key.replace(/[._]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/* Details values as readable text: lists joined, flags as Yes and No, objects as JSON */
export function valueText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    return value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") return String(item);
        if (item && typeof item === "object" && typeof (item as { title?: unknown }).title === "string") return (item as { title: string }).title;
        return JSON.stringify(item);
      })
      .join(", ");
  }
  return JSON.stringify(value);
}
