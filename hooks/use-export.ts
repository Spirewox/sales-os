'use client';

import { createElement, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import type { OverflowItem } from '@/components/app';
import {
  buildCsv, collectExportRows, exportFilename, exportToast, saveCsv,
  type ExportColumn, type ExportNoun, type FetchCursor, type FetchPage,
} from '@/lib/export';

export type UseExportOptions<T> = {
  /** Filename part: `fudfarmer-<module>-<date>.csv`. */
  module: string;
  noun: ExportNoun;
  columns: ExportColumn<T>[];
  disabled?: boolean;
  /** The filter the screen applies in the browser, run once every page is fetched. */
  select?: (rows: T[]) => T[];
  /** Rows per request, for APIs that cap it (default 200). */
  pageSize?: number;
} & (
  /** One page of the same list the screen shows, with the screen's server filters applied. */
  | { fetchPage: FetchPage<T>; fetchCursor?: never }
  /** The same, for a list the API pages with a cursor. */
  | { fetchCursor: FetchCursor<T>; fetchPage?: never }
);

/** Export the list on screen as CSV, as an `⋯` menu item: `Export <noun>`. */
export function useExport<T>({ module, noun, columns, fetchPage, fetchCursor, select, pageSize, disabled }: UseExportOptions<T>) {
  const [pending, setPending] = useState(false);
  const running = useRef(false);

  const run = () => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    void (async () => {
      try {
        const { rows, capped } = await collectExportRows({ fetchPage, fetchCursor, select, pageSize });
        saveCsv(exportFilename(module), buildCsv(columns, rows));
        if (capped) toast.warning(exportToast(rows.length, noun, true));
        else toast.success(exportToast(rows.length, noun, false));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Export failed');
      } finally {
        running.current = false;
        setPending(false);
      }
    })();
  };

  const item: OverflowItem = {
    label: pending ? 'Exporting…' : `Export ${noun.many}`,
    icon: createElement(Download, { 'aria-hidden': true }),
    onSelect: run,
    disabled: pending || disabled,
  };

  return { run, pending, item };
}
