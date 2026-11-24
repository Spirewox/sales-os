'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * Package-only stand-in for the app's Next.js `useUrlState`: reads and writes query params with
 * the History API, so SectionTabs keeps its tab in the URL in any React app. Next.js 14.1+ syncs
 * its router with history.replaceState, so it also works inside a Next app.
 */
const CHANGE = 'fudfarmer-ui:urlchange';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

const readSearch = () => window.location.search;
const serverSearch = () => '';

export function useUrlState() {
  const search = useSyncExternalStore(subscribe, readSearch, serverSearch);
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const get = useCallback((key: string) => params.get(key), [params]);

  const set = useCallback((patch: Record<string, string | null | undefined>) => {
    // Merge with the live URL so two quick writes don't overwrite each other.
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${s ? `?${s}` : ''}${window.location.hash}`);
    window.dispatchEvent(new Event(CHANGE));
  }, []);

  return { params, get, set };
}
