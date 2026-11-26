import { APP_TIMEZONE, formatCount, plural } from '@/lib/format';

/** One value in a CSV cell. Money goes in as a plain number so spreadsheets can add it up. */
export type ExportCell = string | number | null | undefined;
export type ExportColumn<T> = { header: string; value: (row: T) => ExportCell };
/** The singular and plural name of what a list holds, as in "1 supplier" and "240 suppliers". */
export type ExportNoun = { one: string; many: string };

/** The most rows one export fetches. Past this, the person narrows the filters. */
export const EXPORT_ROW_CAP = 10_000;
const PAGE_SIZE = 200;
const BOM = '﻿';

/** A text cell starting with these runs as a formula in Excel; a leading ' keeps it text. */
const FORMULA_START = /^[=+\-@]/;

function cell(value: ExportCell): string {
  let text = value == null ? '' : String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Rows to CSV: every cell quoted, CRLF line ends, UTF-8 BOM first so Excel reads ₦. */
export function buildCsv<T>(columns: ExportColumn<T>[], rows: T[], options: { bom?: boolean } = {}): string {
  const lines = [columns.map((c) => cell(c.header)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(','));
  return (options.bom === false ? '' : BOM) + lines.join('\r\n');
}

function lagosParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

/** `YYYY-MM-DD`, or `YYYY-MM-DD HH:mm`, in Lagos time. Empty for a missing or invalid date. */
export function csvDate(value: string | Date | null | undefined, withTime = false): string {
  if (value == null || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const p = lagosParts(date);
  return withTime ? `${p.date} ${p.time}` : p.date;
}

/** `fudfarmer-<module>-<YYYY-MM-DD>.csv`, dated in Lagos. */
export function exportFilename(module: string, now: Date = new Date()): string {
  return `fudfarmer-${module}-${lagosParts(now).date}.csv`;
}

/** Page through a list endpoint until it ends or the cap is reached. */
export async function fetchExportRows<T>(
  fetchPage: (page: number, limit: number) => Promise<{ items: T[]; totalPages: number }>,
  cap: number = EXPORT_ROW_CAP,
): Promise<{ rows: T[]; capped: boolean }> {
  const rows: T[] = [];
  for (let page = 1; ; page += 1) {
    const { items, totalPages } = await fetchPage(page, PAGE_SIZE);
    rows.push(...items);
    if (rows.length >= cap) return { rows: rows.slice(0, cap), capped: true };
    if (items.length < PAGE_SIZE || page >= totalPages) return { rows, capped: false };
  }
}

export function exportToast(count: number, noun: ExportNoun, capped: boolean): string {
  if (capped) return `Exported the first ${formatCount(count)} rows. Narrow the filters to get the rest.`;
  return `Exported ${plural(count, noun.one, noun.many)}.`;
}

/** Save text as a CSV download in the browser. */
export function saveCsv(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
