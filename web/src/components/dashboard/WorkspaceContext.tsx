"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  apiRequest,
  errorMessage,
  type Bootstrap,
  type RequestOptions,
} from "@/lib/workspace-api";

type Request = <T>(path: string, options?: Omit<RequestOptions, "persona">) => Promise<T>;

type WorkspaceContextValue = {
  persona: string;
  setPersona: (username: string) => void;
  /** Data for the most recently loaded persona; check `switching` before trusting it. */
  boot: Bootstrap | null;
  switching: boolean;
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

type Loaded = { persona: string; data: Bootstrap | null; error: string | null };

export function WorkspaceProvider({ initialPersona, children }: { initialPersona: string; children: ReactNode }) {
  const [persona, setPersona] = useState(initialPersona);
  const [loaded, setLoaded] = useState<Loaded>({ persona: "", data: null, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Bootstrap>("/bootstrap/", { persona, signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) setLoaded({ persona, data, error: null });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setLoaded((prev) => ({ persona, data: prev.data, error: errorMessage(error) }));
      },
    );
    return () => controller.abort();
  }, [persona, tick]);

  const request = useCallback<Request>((path, options) => apiRequest(path, { ...options, persona }), [persona]);
  const refresh = useCallback(() => setTick((value) => value + 1), []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      persona,
      setPersona,
      boot: loaded.data,
      switching: loaded.persona !== persona,
      error: loaded.persona === persona ? loaded.error : null,
      request,
      refresh,
    }),
    [persona, loaded, request, refresh],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
