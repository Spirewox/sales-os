'use client';

import { useCallback, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Rows-per-page choice for one list, remembered per browser under `key`
 * (e.g. "sales"). Falls back to `fallback` when nothing is stored or storage is blocked.
 */
export function usePageSize(key: string, fallback = 25): [number, (n: number) => void] {
  const storageKey = `fudfarmer_rows:${key}`;
  const [size, setSize] = useState<number>(() => {
    try {
      const v = Number(typeof window === 'undefined' ? NaN : localStorage.getItem(storageKey));
      return (PAGE_SIZE_OPTIONS as readonly number[]).includes(v) ? v : fallback;
    } catch {
      return fallback;
    }
  });
  const update = useCallback(
    (n: number) => {
      setSize(n);
      try {
        localStorage.setItem(storageKey, String(n));
      } catch {
        /* storage blocked: keep the in-memory value */
      }
    },
    [storageKey],
  );
  return [size, update];
}
