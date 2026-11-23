'use client';

import { createElement, useState, type ReactNode } from 'react';
import { usePageSize } from '@/hooks/use-page-size';
import { TableFooter } from './data-table';

/**
 * Client paging for lists that aren't a DataTable (drawer lists, card lists): returns the
 * current page of items and the same footer the table uses (rows per page, range, pages).
 * The page-size choice is remembered per `key`. Pass `resetKey` to go back to page 1 on filter changes.
 */
export function usePagedList<T>(items: T[], key: string, defaultSize = 10, resetKey?: string): { pageItems: T[]; pager: ReactNode } {
  const [size, setSize] = usePageSize(key, defaultSize);
  const [page, setPage] = useState(1);
  const [seen, setSeen] = useState(resetKey);
  if (seen !== resetKey) {
    setSeen(resetKey);
    setPage(1);
  }
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, totalPages);
  const pageItems = items.slice((current - 1) * size, current * size);
  const pager = createElement(TableFooter, {
    page: current,
    totalPages,
    onPageChange: setPage,
    pageSize: size,
    onPageSizeChange: (n: number) => { setSize(n); setPage(1); },
    total: items.length,
    shown: pageItems.length,
    hidden: items.length === 0,
  });
  return { pageItems, pager };
}
