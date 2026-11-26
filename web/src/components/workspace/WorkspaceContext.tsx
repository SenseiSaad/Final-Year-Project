"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiRequest, DEMO_PERSONA, errorMessage, type Bootstrap, type RequestOptions } from "@/lib/workspace-api";

type Request = <T>(path: string, options?: Omit<RequestOptions, "persona">) => Promise<T>;

type WorkspaceContextValue = {
  /** Always the seeded Administrator: sign-in is open in this demo */
  persona: string;
  /** Null until the first load finishes */
  boot: Bootstrap | null;
  error: string | null;
  request: Request;
  refresh: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Bootstrap>("/bootstrap/", { persona: DEMO_PERSONA, signal: controller.signal }).then(
      (data) => {
        if (controller.signal.aborted) return;
        setBoot(data);
        setError(null);
      },
      (failure: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(failure));
      },
    );
    return () => controller.abort();
  }, [tick]);

  const request = useCallback<Request>((path, options) => apiRequest(path, { ...options, persona: DEMO_PERSONA }), []);
  const refresh = useCallback(() => setTick((value) => value + 1), []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({ persona: DEMO_PERSONA, boot, error, request, refresh }),
    [boot, error, request, refresh],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
