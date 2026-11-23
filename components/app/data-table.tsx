'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { FilterSelect } from '@/components/filter-select';
import { PAGE_SIZE_OPTIONS, usePageSize } from '@/hooks/use-page-size';
import { cn } from '@/lib/utils';

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Enables sorting on this column. */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right';
  className?: string;
  /** Phone card layout: `title` (first line, bold), `subtitle`, `value` (right side), `meta` (third line). Omit to hide on phones. */
  mobile?: 'title' | 'subtitle' | 'value' | 'meta';
  /** With manualSort: show a sort button for this column even without sortValue (the server sorts by `id`). */
  sortable?: boolean;
  /** Hide below this breakpoint in the desktop table to save width. */
  hideBelow?: 'lg' | 'xl';
};

export type SortState = { id: string; dir: 'asc' | 'desc' } | null;

type DataTableProps<T> = {
  label: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  /** Makes rows open a drawer. The title cell becomes the focusable control. */
  onRowClick?: (row: T) => void;
  /** Up to 2 labelled buttons plus an OverflowMenu (destructive last). */
  rowActions?: (row: T) => ReactNode;
  loading?: boolean;
  /** Shown only after loading finishes with no rows. Use <EmptyState size="compact" />. */
  empty?: ReactNode;
  defaultSort?: SortState;
  /** Default rows per page. Users can change it unless `fixedPageSize`; their choice is remembered per table. */
  pageSize?: number;
  /** Keep `pageSize` fixed and hide the rows-per-page picker (small dashboard widgets). */
  fixedPageSize?: boolean;
  /** Storage key for the remembered page size; defaults to `label`. */
  pageSizeKey?: string;
  /** Bulk selection: renders checkboxes and a sticky bar with these actions. */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
  /** Controlled sort. With `manualSort`, rows are shown in the order given (the server sorts). */
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  manualSort?: boolean;
  /** Server pagination: rows are one page already; the table renders these controls instead of slicing. */
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    /** Current server page size and its setter: shows the rows-per-page picker. */
    pageSize?: number;
    onPageSizeChange?: (n: number) => void;
    /** Total rows on the server, for "26 to 50 of 110". */
    total?: number;
  };
  /** Client pagination returns to page 1 whenever this changes (pass the active filters). */
  resetPageKey?: string;
};

/**
 * The one table. Sortable headers, rows that open a drawer, labelled row actions, pagination,
 * a loading state that never says "nothing here", and card rows below 768px.
 */
export function DataTable<T>({ label, columns, rows, getRowId, onRowClick, rowActions, loading, empty, defaultSort = null, pageSize: defaultPageSize = 25, fixedPageSize, pageSizeKey, bulkActions, className, rowClassName, sort: sortProp, onSortChange, manualSort, pagination, resetPageKey }: Readonly<DataTableProps<T>>) {
  const [sortState, setSortState] = useState<SortState>(defaultSort);
  const sort = sortProp !== undefined ? sortProp : sortState;
  const setSort = (next: SortState | ((s: SortState) => SortState)) => {
    const value = typeof next === 'function' ? next(sort) : next;
    if (sortProp === undefined) setSortState(value);
    onSortChange?.(value);
  };
  const [page, setPage] = useState(1);
  const [storedSize, setStoredSize] = usePageSize(pageSizeKey ?? label, defaultPageSize);
  const pageSize = fixedPageSize ? defaultPageSize : storedSize;
  const changePageSize = (n: number) => {
    setStoredSize(n);
    setPage(1);
  };
  const [seenResetKey, setSeenResetKey] = useState(resetPageKey);
  if (seenResetKey !== resetPageKey) {
    setSeenResetKey(resetPageKey);
    setPage(1);
  }
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const list = rows ?? [];
    if (manualSort) return list;
    const col = sort && columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return list;
    const get = col.sortValue;
    const dir = sort?.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }, [rows, sort, columns, manualSort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = pagination ? sorted : sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const titleCol = columns.find((c) => c.mobile === 'title') ?? columns[0];

  const toggleSort = (id: string) =>
    setSort((s) => (s?.id === id ? (s.dir === 'desc' ? { id, dir: 'asc' } : null) : { id, dir: 'desc' }));

  const selectedRows = bulkActions ? sorted.filter((r) => selected.has(getRowId(r))) : [];
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(getRowId(r)));
  const toggleRow = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglePage = () => setSelected((s) => { const n = new Set(s); pageRows.forEach((r) => (allOnPage ? n.delete(getRowId(r)) : n.add(getRowId(r)))); return n; });
  const clear = () => setSelected(new Set());

  const isLoading = loading && !rows?.length;
  const isEmpty = !loading && sorted.length === 0;
  const hide = (c: Column<T>) => (c.hideBelow === 'xl' ? 'hidden xl:table-cell' : c.hideBelow === 'lg' ? 'hidden lg:table-cell' : '');

  const titleCell = (row: T) =>
    onRowClick ? (
      <button type="button" onClick={(e) => { e.stopPropagation(); onRowClick(row); }} className="text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none">
        {titleCol.cell(row)}
      </button>
    ) : (
      titleCol.cell(row)
    );

  return (
    <div className={cn('relative overflow-hidden rounded-xl border bg-card', className)}>
      {bulkActions && selectedRows.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-accent px-4 py-2 text-sm">
          <span className="font-medium">{selectedRows.length} selected</span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions(selectedRows, clear)}</div>
          <button type="button" onClick={clear} className="ml-auto text-sm font-medium text-muted-foreground hover:text-foreground">Clear selection</button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block" role="region" aria-label={label} tabIndex={0}>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {bulkActions && (
                <th scope="col" className="w-10 px-4 py-2.5">
                  <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={togglePage} className="size-4 accent-[var(--primary)]" />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.id === c.id;
                return (
                  <th key={c.id} scope="col" aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={cn('px-4 py-2.5 font-medium whitespace-nowrap', c.align === 'right' ? 'text-right' : 'text-left', hide(c), c.className)}>
                    {c.sortValue || (manualSort && c.sortable) ? (
                      <button type="button" onClick={() => toggleSort(c.id)} className={cn('inline-flex items-center gap-1 hover:text-foreground', c.align === 'right' && 'flex-row-reverse', active && 'text-foreground')}>
                        {c.header}
                        {active ? (sort!.dir === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />) : <ChevronsUpDown size={12} className="opacity-50" aria-hidden />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
              {rowActions && <th scope="col" className="px-4 py-2.5 text-right font-medium"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={`sk-${i}`} aria-hidden>
                  {bulkActions && <td className="px-4 py-3" />}
                  {columns.map((c) => (
                    <td key={c.id} className={cn('px-4 py-3', hide(c))}><Skeleton className={cn('h-4', c.align === 'right' ? 'ml-auto w-16' : 'w-24')} /></td>
                  ))}
                  {rowActions && <td className="px-4 py-3" />}
                </tr>
              ))}
            {!isLoading &&
              pageRows.map((row) => {
                const id = getRowId(row);
                return (
                  <tr key={id} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-muted/40', selected.has(id) && 'bg-accent/60', rowClassName?.(row))}>
                    {bulkActions && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" aria-label="Select row" checked={selected.has(id)} onChange={() => toggleRow(id)} className="size-4 accent-[var(--primary)]" />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.id} className={cn('px-4 py-3 align-middle', c.align === 'right' && 'text-right tabular-nums', hide(c), c.className)}>
                        {c === titleCol ? titleCell(row) : c.cell(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">{rowActions(row)}</div>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Phone cards */}
      <ul className="divide-y md:hidden" aria-label={label}>
        {isLoading &&
          Array.from({ length: 4 }, (_, i) => (
            <li key={`skm-${i}`} className="space-y-2 px-4 py-3" aria-hidden>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </li>
          ))}
        {!isLoading &&
          pageRows.map((row) => {
            const id = getRowId(row);
            const pick = (slot: Column<T>['mobile']) => columns.filter((c) => c.mobile === slot);
            return (
              <li key={id} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn('px-4 py-3', onRowClick && 'cursor-pointer active:bg-muted/40', rowClassName?.(row))}>
                <div className="flex items-start gap-3">
                  {bulkActions && (
                    <input type="checkbox" aria-label="Select row" checked={selected.has(id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleRow(id)} className="mt-0.5 size-4 accent-[var(--primary)]" />
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="line-clamp-2 text-sm break-words">{titleCell(row)}</div>
                    {pick('subtitle').map((c) => <div key={c.id} className="truncate text-xs text-muted-foreground">{c.cell(row)}</div>)}
                    {pick('meta').length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-xs text-muted-foreground">{pick('meta').map((c) => <span key={c.id}>{c.cell(row)}</span>)}</div>
                    )}
                  </div>
                  {pick('value').length > 0 && (
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      {pick('value').map((c) => <div key={c.id} className="text-sm font-medium tabular-nums">{c.cell(row)}</div>)}
                    </div>
                  )}
                </div>
                {/* Row actions get their own line on phones so they never squeeze the title. */}
                {rowActions && <div className={cn('mt-2 flex flex-wrap items-center gap-1.5', bulkActions && 'pl-7')} onClick={(e) => e.stopPropagation()}>{rowActions(row)}</div>}
              </li>
            );
          })}
      </ul>

      {isEmpty && (empty ?? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing to show.</p>)}

      <TableFooter
        page={pagination ? pagination.page : safePage}
        totalPages={pagination ? pagination.totalPages : totalPages}
        onPageChange={pagination ? pagination.onPageChange : setPage}
        pageSize={pagination ? pagination.pageSize : pageSize}
        onPageSizeChange={pagination ? pagination.onPageSizeChange : fixedPageSize ? undefined : changePageSize}
        total={pagination ? pagination.total : sorted.length}
        shown={pageRows.length}
        hidden={isLoading || isEmpty}
      />
    </div>
  );
}

/** Small labelled row button (e.g. "Call", "Record payment"). */
export function RowAction({ children, onClick, href, tone = 'default', external, ariaLabel }: Readonly<{ children: ReactNode; onClick?: () => void; href?: string; tone?: 'default' | 'primary'; /** Open in a new tab (WhatsApp, maps). */ external?: boolean; /** Fuller name for screen readers, e.g. "Call Mama Put Kitchen". */ ariaLabel?: string }>) {
  const cls = cn('inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium whitespace-nowrap transition-colors [&_svg]:size-3.5', tone === 'primary' ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10' : 'bg-background hover:bg-muted');
  // In-app paths use client navigation; tel:, mailto: and external links stay plain anchors.
  if (href?.startsWith('/')) return <Link href={href} className={cls} aria-label={ariaLabel}>{children}</Link>;
  if (href) return <a href={href} className={cls} aria-label={ariaLabel} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>;
  return <button type="button" onClick={onClick} className={cls} aria-label={ariaLabel}>{children}</button>;
}

/** "Rows per page" picker, "26 to 50 of 110", and page buttons. Shown only when there's something to page. */
export function TableFooter({ page, totalPages, onPageChange, pageSize, onPageSizeChange, total, shown, hidden }: Readonly<{ page: number; totalPages: number; onPageChange: (p: number) => void; pageSize?: number; onPageSizeChange?: (n: number) => void; total?: number; shown: number; hidden: boolean }>) {
  const canPick = !!onPageSizeChange && !!pageSize;
  // A picker only helps once there are more rows than the smallest option.
  const showPicker = canPick && (total == null ? totalPages > 1 || shown >= PAGE_SIZE_OPTIONS[0] : total > PAGE_SIZE_OPTIONS[0]);
  if (hidden || (totalPages <= 1 && !showPicker)) return null;
  const from = pageSize ? (page - 1) * pageSize + 1 : null;
  const to = from != null ? from + shown - 1 : null;
  return (
    <div className="flex flex-col gap-3 border-t px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {showPicker && (
          <label className="flex items-center gap-2">
            <span>Rows per page</span>
            <FilterSelect
              ariaLabel="Rows per page"
              value={String(pageSize)}
              onChange={(v) => onPageSizeChange!(Number(v))}
              className="h-8 w-20 data-[size=default]:h-8"
              options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
            />
          </label>
        )}
        {from != null && to != null && shown > 0 && (
          <span className="tabular-nums" aria-live="polite">
            {from.toLocaleString()} to {to.toLocaleString()}
            {total != null ? ` of ${total.toLocaleString()}` : ''}
          </span>
        )}
      </div>
      {totalPages > 1 && <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />}
    </div>
  );
}
