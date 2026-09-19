"use client";

import { useEffect, useState } from "react";

/** Returns `value`, delayed by `delayMs` after it last changed. Used by `SearchInput` for the 300ms search debounce (`docs/UI_SPEC.md` §2.4). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
