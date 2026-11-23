'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Read and write page state (tab, filters, open record) in the URL so views can be
 * linked, refreshed and shared. Writes replace history and never scroll.
 */
export function useUrlState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const get = useCallback((key: string) => params.get(key), [params]);

  const set = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      // Merge with the live URL, not the last render's params, so two quick writes don't overwrite each other.
      const next = new URLSearchParams(typeof window === 'undefined' ? params.toString() : window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '') next.delete(k);
        else next.set(k, v);
      }
      const s = next.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [params, router, pathname],
  );

  return { params, get, set };
}
