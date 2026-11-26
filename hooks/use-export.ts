'use client';

import { createElement, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import type { OverflowItem } from '@/components/app';
import {
  buildCsv, exportFilename, exportToast, fetchExportRows, saveCsv,
  type ExportColumn, type ExportNoun,
} from '@/lib/export';

export type UseExportOptions<T> = {
  /** Filename part: `fudfarmer-<module>-<date>.csv`. */
  module: string;
  noun: ExportNoun;
  columns: ExportColumn<T>[];
  /** One page of the same list the screen shows, with the screen's filters applied. */
  fetchPage: (page: number, limit: number) => Promise<{ items: T[]; totalPages: number }>;
  disabled?: boolean;
};

/** Export the list on screen as CSV, as an `⋯` menu item: `Export <noun>`. */
export function useExport<T>({ module, noun, columns, fetchPage, disabled }: UseExportOptions<T>) {
  const [pending, setPending] = useState(false);
  const running = useRef(false);

  const run = () => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    void (async () => {
      try {
        const { rows, capped } = await fetchExportRows(fetchPage);
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
