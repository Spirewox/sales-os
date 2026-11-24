'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Read and write page state (tab, filters, open record) in the URL so views can be
 * linked, refreshed and shared. Writes replace history and never scroll.
 */
export function useUrlState() {
  const params = useSearchParams();

  const get = useCallback((key: string) => params.get(key), [params]);

  const set = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const url = new URL(window.location.href);
      const next = url.searchParams;
      const previous = next.toString();
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '') next.delete(k);
        else next.set(k, v);
      }
      if (next.toString() === previous) return;
      // Next observes native history updates without fetching a new route.
      window.history.replaceState(null, '', url);
    },
    [],
  );

  return { params, get, set };
}

/** Keep a text field responsive while debouncing its URL-backed filter. */
export function useDebouncedUrlField(
  key: string,
  value: string,
  set: ReturnType<typeof useUrlState>['set'],
) {
  const [draft, setDraft] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    if (draft.trim() !== value) setDraft(value);
  }

  useEffect(() => {
    const next = draft.trim();
    if (next === value) return;
    const timer = setTimeout(() => {
      const current = new URLSearchParams(window.location.search).get(key) ?? '';
      if (current === value) set({ [key]: next || null });
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, key, set, value]);

  return [draft, setDraft] as const;
}
