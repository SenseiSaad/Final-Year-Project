"use server";

export type RequestState = {
  status: "idle" | "ok" | "error";
  errors: Record<string, string>;
  message?: string;
  values: Record<string, string>;
};

const FIELDS = ["name", "email", "organisation", "team_size", "plan", "note", "website"] as const;
const API =
  process.env.DJANGO_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8300" : undefined);

/* Sends the early-access form to the Django backend, which validates and stores it */
export async function requestAccess(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));

  if (!API) {
    return {
      status: "error",
      errors: {},
      values,
      message: "Early access is not connected in this deployment yet. Set DJANGO_API_URL to the backend URL.",
    };
  }

  try {
    const response = await fetch(`${API}/api/early-access/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = (await response.json()) as { ok: boolean; errors?: Record<string, string[]> };
    if (data.ok) return { status: "ok", errors: {}, values: {} };

    const errors = Object.fromEntries(Object.entries(data.errors ?? {}).map(([k, v]) => [k, v[0]]));
    return { status: "error", errors, values, message: errors.__all__ };
  } catch {
    return {
      status: "error",
      errors: {},
      values,
      message: "We could not send your request just now. Please try again in a few minutes.",
    };
  }
}
