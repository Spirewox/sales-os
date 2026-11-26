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
const FORMULA_START = /^[=+\-@\t\r]/;
/** Phone numbers, signed amounts and a lone "-" start with + or - but are not formulas. */
const PLAIN_NUMBER = /^[+-]?[\d\s().-]+$/;

function cell(value: ExportCell): string {
  let text = value == null ? '' : String(value);
  if (typeof value === 'string' && FORMULA_START.test(text) && !PLAIN_NUMBER.test(text)) text = `'${text}`;
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

export type FetchPage<T> = (page: number, limit: number) => Promise<{ items: T[]; totalPages: number }>;
export type FetchCursor<T> = (cursor?: string) => Promise<{ items: T[]; nextCursor: string | null | undefined }>;

/**
 * Page through a list endpoint until it is empty, `totalPages` is reached or the cap is.
 * A short page does not end it: an API may hand back fewer rows than asked for.
 */
export async function fetchExportRows<T>(
  fetchPage: FetchPage<T>,
  cap: number = EXPORT_ROW_CAP,
  pageSize: number = PAGE_SIZE,
): Promise<{ rows: T[]; capped: boolean }> {
  const rows: T[] = [];
  for (let page = 1; ; page += 1) {
    const { items, totalPages } = await fetchPage(page, pageSize);
    rows.push(...items);
    if (rows.length >= cap) return { rows: rows.slice(0, cap), capped: true };
    if (items.length === 0 || page >= totalPages) return { rows, capped: false };
  }
}

/** The same for a list paged by cursor: follow `nextCursor` until it runs out, repeats or the cap is reached. */
export async function fetchExportRowsByCursor<T>(
  fetchPage: FetchCursor<T>,
  cap: number = EXPORT_ROW_CAP,
): Promise<{ rows: T[]; capped: boolean }> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  for (;;) {
    const { items, nextCursor } = await fetchPage(cursor);
    rows.push(...items);
    if (rows.length >= cap) return { rows: rows.slice(0, cap), capped: true };
    if (!nextCursor || seen.has(nextCursor)) return { rows, capped: false };
    seen.add(nextCursor);
    cursor = nextCursor;
  }
}

/**
 * Every row an export needs: fetch all pages (or follow the cursor), then apply `select`, the
 * same filter the screen applies in the browser. Filtering after fetching keeps a page with no
 * matches from ending the export early.
 */
export async function collectExportRows<T>(opts: {
  fetchPage?: FetchPage<T>;
  fetchCursor?: FetchCursor<T>;
  select?: (rows: T[]) => T[];
  cap?: number;
  pageSize?: number;
}): Promise<{ rows: T[]; capped: boolean }> {
  const cap = opts.cap ?? EXPORT_ROW_CAP;
  const fetched = opts.fetchCursor
    ? await fetchExportRowsByCursor(opts.fetchCursor, cap)
    : opts.fetchPage
      ? await fetchExportRows(opts.fetchPage, cap, opts.pageSize)
      : { rows: [] as T[], capped: false };
  return { rows: opts.select ? opts.select(fetched.rows) : fetched.rows, capped: fetched.capped };
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

