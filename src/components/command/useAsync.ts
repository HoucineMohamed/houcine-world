import { useCallback, useEffect, useState } from "react";

/** Load something, with loading, error and reload; `deps` decide when to load again. */
export const useAsync = <T>(load: () => Promise<T>, deps: unknown[]) => {
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    load()
      .then((v) => { if (!cancelled) { setValue(v); setError(null); } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load."); });
    return () => { cancelled = true; };
  }, [...deps, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { value, error, reload };
};

/** Run a write; returns an error message or null. */
export const attempt = async (fn: () => Promise<unknown>): Promise<string | null> => {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "The change could not be saved.";
  }
};
