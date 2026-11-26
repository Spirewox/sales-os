'use client';

import { createElement, useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Sheet } from 'lucide-react';
import { toast } from 'sonner';
import { OverflowMenu, type OverflowItem } from '@/components/app';
import {
  buildCsv, collectExportRows, exportFilename, exportTable, exportToast, saveFile,
  type ExportColumn, type ExportFormat, type ExportNoun, type FetchCursor, type FetchPage,
} from '@/lib/export';

export type UseExportOptions<T> = {
  /** Filename part: `fudfarmer-<module>-<date>.<ext>`. */
  module: string;
  /** The list's name, as the PDF title and the Excel sheet name, such as "Suppliers". */
  title: string;
  noun: ExportNoun;
  columns: ExportColumn<T>[];
  /** The filters in force, in words (see filterLabels), printed at the top of the PDF. Read when the export runs. */
  filters?: string[] | (() => string[]);
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

const FORMATS: { format: ExportFormat; label: string; icon: typeof Download }[] = [
  { format: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { format: 'csv', label: 'CSV (.csv)', icon: Sheet },
  { format: 'pdf', label: 'PDF (.pdf)', icon: FileText },
];

const MIME: Record<ExportFormat, string> = {
  csv: 'text/csv;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

/**
 * Export the rows the list's filters match as Excel, CSV or PDF. `menu` is the visible Export
 * button for the filter bar's `trailing` slot.
 */
export function useExport<T>({ module, title, noun, columns, filters, fetchPage, fetchCursor, select, pageSize, disabled }: UseExportOptions<T>) {
  const [pending, setPending] = useState(false);
  const running = useRef(false);

  const run = (format: ExportFormat) => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    const toastId = toast.loading(`Preparing ${noun.many}…`);
    void (async () => {
      try {
        const { rows, capped } = await collectExportRows({ fetchPage, fetchCursor, select, pageSize });
        const now = new Date();
        const name = exportFilename(module, now, format);
        if (format === 'csv') {
          saveFile(name, buildCsv(columns, rows), MIME.csv);
        } else {
          const { headers, cells } = exportTable(columns, rows);
          const bytes = format === 'xlsx'
            ? (await import('@/lib/xlsx')).buildXlsx(title, headers, cells)
            : await (await import('@/lib/export-pdf')).buildPdf({ title, filters: (typeof filters === 'function' ? filters() : filters) ?? [], exportedAt: now, noun, headers, rows: cells });
          saveFile(name, bytes as BlobPart, MIME[format]);
        }
        if (capped) toast.warning(exportToast(rows.length, noun, true), { id: toastId });
        else toast.success(exportToast(rows.length, noun, false), { id: toastId });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Export failed', { id: toastId });
      } finally {
        running.current = false;
        setPending(false);
      }
    })();
  };

  const items: OverflowItem[] = FORMATS.map((f) => ({
    label: f.label,
    icon: createElement(f.icon, { 'aria-hidden': true }),
    onSelect: () => run(f.format),
    disabled: pending,
  }));

  // The trigger keeps its words while an export runs; it is disabled instead (trap/loading-label-swap).
  const menu = createElement(OverflowMenu, {
    label: `Export ${noun.many}`,
    items,
    trigger: { text: 'Export', icon: createElement(Download, { 'aria-hidden': true }), disabled: pending || disabled },
  });

  return { run, pending, items, menu };
}
