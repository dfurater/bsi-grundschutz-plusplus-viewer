import { useEffect, useState } from "react";

/**
 * Debounces changing values for instant-search behavior.
 * REQ: PD-04, US-03, PERF-01, K-01
 */
export function useDebouncedValue<T>(value: T, delayMs: number) {
  /* REQ: PD-04, US-03, PERF-01 */
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [value, delayMs]);

  return debounced;
}
