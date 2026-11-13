"use client";
import { useEffect, useRef, useState } from "react";

/**
 * GET a project sub-resource and keep the answer. A response is applied unless the project changed while it was in flight,
 * so a parent that re-renders often cannot cancel it before it lands (which left panels blank). Failures are returned, not hidden.
 */
export function useProjectGet<T>(path: string, version: number) {
  const [state, setState] = useState<{ path: string; data?: T; error?: string }>({ path });
  const latest = useRef(path);
  useEffect(() => {
    latest.current = path;
    const timer = setTimeout(() => {
      fetch(path, { cache: "no-store" })
        .then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
          return body as T;
        })
        .then((data) => latest.current === path && setState({ path, data }))
        .catch((e: Error) => latest.current === path && setState((s) => ({ path, data: s.path === path ? s.data : undefined, error: e.message })));
    }, 0);
    return () => clearTimeout(timer);
  }, [path, version]);
  return state.path === path ? { data: state.data, error: state.error } : {};
}
