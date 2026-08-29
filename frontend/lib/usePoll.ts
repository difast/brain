"use client";

import { useEffect, useState } from "react";

/**
 * Poll an async loader on an interval; returns data, error and loading.
 * Pass `deps` (e.g. the current page offset or a filter) to re-run the loader
 * immediately when they change, not only on the next interval tick.
 */
export function usePoll<T>(
  loader: () => Promise<T>,
  intervalMs = 4000,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function tick() {
      try {
        const result = await loader();
        if (active) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return { data, error, loading };
}
