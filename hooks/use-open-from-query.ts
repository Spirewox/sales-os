'use client';

import { useEffect, useRef } from 'react';

/**
 * Runs `open` once on mount when the URL has `?key=value` (e.g. `/sales?new=1`),
 * then removes that param so a refresh or back navigation does not reopen it.
 * Lets other pages link straight to a create form or a filtered view.
 */
export function useOpenFromQuery(key: string, value: string, open: () => void) {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get(key) !== value) return;
    open();
    params.delete(key);
    const qs = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, [key, value, open]);
}
