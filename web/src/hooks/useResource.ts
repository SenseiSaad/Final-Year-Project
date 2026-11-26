"use client";

import { useCallback, useEffect, useState } from "react";

import { errorMessage } from "@/lib/workspace-api";

type Settled<T> = { source: unknown; data?: T; error?: string };

/*
  Loads data whenever `load` changes (so wrap it in useCallback). Refreshing
  keeps the previous data on screen instead of flashing a loading state.
*/
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<Settled<T>>({ source: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ source: load, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState((prev) => ({ ...prev, source: load, error: errorMessage(error) }));
      },
    );
    return () => controller.abort();
  }, [load, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  const setData = useCallback(
    (update: (previous: T | undefined) => T) => setState((prev) => ({ ...prev, error: undefined, data: update(prev.data) })),
    [],
  );

  return {
    data: state.data,
    error: state.source === load ? state.error : undefined,
    loading: state.source !== load,
    reload,
    setData,
  };
}
