import { useCallback, useEffect, useRef, useState } from "react";
import type { SafeError } from "../../shared/api.js";
import type { BridgeResult } from "../../shared/ipc.js";

export type Loadable<T> =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly error: SafeError }
  | { readonly status: "ready"; readonly data: T };

/** Loads a bridge call and exposes loading, error and ready states plus a reload function. */
export function useBridgeQuery<T>(load: () => Promise<BridgeResult<T>>, deps: readonly unknown[]): [Loadable<T>, () => void] {
  const [state, setState] = useState<Loadable<T>>({ status: "loading" });
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    setState((current) => (current.status === "ready" ? current : { status: "loading" }));
    loadRef
      .current()
      .then((result) => {
        if (!cancelled) setState(result.ok ? { status: "ready", data: result.data } : { status: "error", error: result.error });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", error: { code: "internal_error", message: "Something went wrong." } });
      });
    return () => {
      cancelled = true;
    };
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return [state, reload];
}
