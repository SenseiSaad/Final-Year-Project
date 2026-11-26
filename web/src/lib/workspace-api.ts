/*
  Browser client for the Django workspace API. The base URL is public by design
  (NEXT_PUBLIC_*); provider keys live only on the Django server.
  The X-Demo-User header picks a synthetic persona. It is not authentication.
*/

export const API_BASE = (
  process.env.NEXT_PUBLIC_WORKSPACE_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8300" : "")
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export type RequestOptions = {
  persona: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  json?: unknown;
  signal?: AbortSignal;
};

async function readError(response: Response): Promise<ApiError> {
  let data: Record<string, unknown> = {};
  try {
    data = await response.json();
  } catch {
    /* non-JSON error body */
  }
  const message = typeof data.error === "string" ? data.error : `The server answered ${response.status}.`;
  return new ApiError(message, response.status, data);
}

export async function apiRequest<T>(path: string, { persona, method = "GET", json, signal }: RequestOptions): Promise<T> {
  if (!API_BASE) {
    throw new ApiError("The workspace backend is not configured for this deployment (NEXT_PUBLIC_WORKSPACE_API_URL).", 0);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/workspace${path}`, {
      method,
      signal,
      cache: "no-store",
      headers: {
        "X-Demo-User": persona,
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Could not reach the workspace backend. Check that the Django server is running.", 0);
  }
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

/* XMLHttpRequest gives real upload progress, which fetch cannot. */
export function uploadRequest<T>(
  path: string,
  persona: string,
  form: FormData,
  onProgress: (fraction: number) => void,
  onUploaded: () => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!API_BASE) {
      reject(new ApiError("The workspace backend is not configured for this deployment.", 0));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/workspace${path}`);
    xhr.setRequestHeader("X-Demo-User", persona);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.upload.onload = onUploaded;
    xhr.onerror = () => reject(new ApiError("Could not reach the workspace backend.", 0));
    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON body */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new ApiError(typeof data.error === "string" ? data.error : `Upload failed (${xhr.status}).`, xhr.status, data));
    };
    xhr.send(form);
  });
}

export async function downloadDocument(id: number, filename: string, persona: string) {
  if (!API_BASE) throw new ApiError("The workspace backend is not configured.", 0);
  const response = await fetch(`${API_BASE}/api/workspace/documents/${id}/file/`, { headers: { "X-Demo-User": persona } });
  if (!response.ok) throw await readError(response);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------- types */

export type Department = { id: number; name: string; parent_id: number | null; description: string };
export type Role = {
  id: number;
  code: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
};
export type Member = {
  id: number;
  username: string;
  display_name: string;
  role: { id: number; code: string; name: string };
  department: Department | null;
  reports_to_id: number | null;
  managed_department_ids: number[];
  is_active: boolean;
  is_protected: boolean;
};
export type Capabilities = {
  upload_scope: boolean;
  create_rooms: boolean;
  manage_departments: boolean;
  manage_members: boolean;
  manage_roles: boolean;
  view_audit: boolean;
};
export type ProviderInfo = {
  id: "local" | "gemini" | "hosted";
  label: string;
  kind: "local" | "cloud";
  external: boolean;
  status: string;
  available: boolean;
  note: string;
  models: string[];
  default_model: string;
};
export type ModelCatalog = { providers: ProviderInfo[]; selected: { provider: string; model: string } };
export type Bootstrap = {
  user: {
    id: number;
    username: string;
    display_name: string;
    role: { code: string; name: string; permissions: string[] };
    department: Department | null;
  };
  capabilities: Capabilities;
  personas: Member[];
  departments: Department[];
  roles: Role[];
  permission_catalog: { key: string; label: string; description: string }[];
  models: ModelCatalog;
  limits: { max_upload_bytes: number; extensions: string[] };
  demo_notice: string;
};
export type DocumentItem = {
  id: number;
  title: string;
  filename: string;
  size_bytes: number;
  owner: string;
  department: Department | null;
  access_mode: "rbac" | "scope";
  access_summary: string;
  chunk_count: number;
  created_at: string;
  can_edit: boolean;
  can_delete: boolean;
  grants?: { roles: number[]; departments: number[]; personas: number[] };
};
export type SearchHit = { document_id: number; title: string; page: number | null; snippet: string };
export type Citation = { source: number; document_id: number; title: string; page: number | null; snippet: string };
export type ChatThread = { id: number; title: string; provider: string; model: string; updated_at: string };
export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  status: "" | "answered" | "refused";
  citations: Citation[];
  provider: string;
  model: string;
  created_at: string;
};
export type Room = {
  id: number;
  name: string;
  description: string;
  scope: "workspace" | "department" | "members";
  department: Department | null;
  is_general: boolean;
  member_ids: number[];
  created_by: string;
  can_manage: boolean;
};
export type RoomMessage = { id: number; sender: string; sender_id: number | null; content: string; created_at: string };
export type AuditEventItem = {
  sequence: number;
  timestamp: string;
  actor_id: number | null;
  actor: string;
  role: string;
  department: string;
  event_type: string;
  object_type: string;
  object_id: string;
  details: Record<string, unknown>;
  previous_hash: string;
  event_hash: string;
};
export type AuditPerson = Member & {
  events: number;
  last_active: string | null;
  searches: number;
  uploads: number;
  shares: number;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
