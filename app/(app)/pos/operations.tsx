'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosGet } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import type { PosRow, PosSection } from './pos-utils';

type OperationsPage = { data: PosRow[]; nextCursor: string | null };

/** Build the query string for `pos/operations/{section}`, dropping empty values. */
export function operationsQuery(filters: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  return query.toString();
}

/** One page of a POS operations list. The API pages with a cursor (`before`). */
export function useOperationsList(section: PosSection, filters: Record<string, string | null | undefined>, options: { enabled?: boolean; refetchInterval?: number | false } = {}) {
  const { user } = useAuth();
  const encoded = operationsQuery(filters);
  return useQuery({
    queryKey: ['pos-operations', user?.id, user?.visibleHubIds, user?.permissions, section, encoded],
    enabled: Boolean(user) && (options.enabled ?? true),
    queryFn: async () => (await axiosGet(`pos/operations/${section}?${encoded}`, true)) as OperationsPage,
    refetchInterval: options.refetchInterval ?? 30_000,
    placeholderData: (previous) => previous,
  });
}

/**
 * Cursor pagination shaped for DataTable's `pagination` prop. Pages already visited keep their
 * cursor, so Previous and the numbered pages work; the next page appears once the API reports one.
 * Returns to page 1 whenever `resetKey` (the active filters) changes.
 */
export function useCursorPages(resetKey: string) {
  const [state, setState] = useState({ key: resetKey, page: 1, cursors: [] as string[] });
  const current = state.key === resetKey ? state : { key: resetKey, page: 1, cursors: [] };
  if (current !== state) setState(current);
  const before = current.page > 1 ? current.cursors[current.page - 2] : undefined;
  const pagination = (nextCursor: string | null | undefined) => ({
    page: current.page,
    totalPages: Math.max(current.cursors.length + 1, nextCursor ? current.page + 1 : current.page),
    onPageChange: (page: number) => setState((s) => {
      const cursors = [...s.cursors];
      if (page === s.page + 1 && nextCursor && !cursors[s.page - 1]) cursors[s.page - 1] = nextCursor;
      return cursors[page - 2] || page === 1 ? { ...s, page, cursors } : s;
    }),
  });
  return { before, pagination };
}

