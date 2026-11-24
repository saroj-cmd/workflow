import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

// Simple data-fetching hook with reload + optimistic local updates.
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const seq = useRef(0);
  const load = useCallback(async () => {
    if (!path) return;
    const id = ++seq.current;
    setLoading(true);
    try {
      const d = await api.get<T>(path);
      if (id === seq.current) { setData(d); setError(null); }
    } catch (e) {
      if (id === seq.current) setError((e as Error).message);
    } finally {
      if (id === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { data, setData, error, loading, reload: load };
}

// Loads a protected file into an object URL.
const cache = new Map<string, string>();
export function useAuthedFile(path: string | null) {
  const [url, setUrl] = useState<string | null>(path ? cache.get(path) ?? null : null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    if (cache.has(path)) { setUrl(cache.get(path)!); return; }
    let alive = true;
    api.blob(path).then((b) => {
      const u = URL.createObjectURL(b);
      cache.set(path, u);
      if (alive) setUrl(u);
    }).catch(() => alive && setUrl(null));
    return () => { alive = false; };
  }, [path]);
  return url;
}
export const bustFileCache = (prefix: string) => {
  for (const k of cache.keys()) if (k.startsWith(prefix)) { URL.revokeObjectURL(cache.get(k)!); cache.delete(k); }
};

export async function openProtectedFile(path: string) {
  const w = window.open("", "_blank");
  try {
    const b = await api.blob(path);
    const u = URL.createObjectURL(b);
    if (w) w.location.href = u; else window.location.href = u;
  } catch (e) {
    w?.close();
    throw e;
  }
}
