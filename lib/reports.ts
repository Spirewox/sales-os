import type { Permission } from '@/lib/permissions';
import type { Filter } from '@/lib/explore';
import type { ExportColumn } from '@/lib/export';

/** How a report column's values read: text, ₦ amounts, counts, percentages or dates. */
export type ReportKind = 'text' | 'money' | 'number' | 'percent' | 'date';
export type ReportColumn = { key: string; label: string; kind: ReportKind };
export type ReportRow = Record<string, string | number | null>;
/** What `GET analytics/reports/:key` returns: the same shape for every report. */
export type ReportResult = { columns: ReportColumn[]; rows: ReportRow[]; totals: Record<string, number>; capped: boolean; generatedAt: string };

export type ReportGroup = 'Sales' | 'Customers' | 'Credit' | 'Inventory' | 'Suppliers';
export type ReportDef = { key: string; group: ReportGroup; title: string; description: string; permission: Permission; usesPeriod: boolean };

/** The ready-made reports, in library order. A new report is one entry here plus one backend builder. */
export const REPORTS: ReportDef[] = [
  { key: 'sales-daily', group: 'Sales', title: 'Daily sales', description: 'Revenue, orders and average order for each day.', permission: 'sales.view', usesPeriod: true },
  { key: 'sales-by-product', group: 'Sales', title: 'Sales by product', description: 'What sold, how much, and what it earned.', permission: 'sales.view', usesPeriod: true },
  { key: 'sales-by-location', group: 'Sales', title: 'Sales by location', description: 'Revenue and orders at each location.', permission: 'sales.view', usesPeriod: true },
  { key: 'sales-by-agent', group: 'Sales', title: 'Sales by staff', description: 'Who recorded which sales.', permission: 'sales.view', usesPeriod: true },
  { key: 'payment-methods', group: 'Sales', title: 'Payment methods', description: 'How customers paid.', permission: 'sales.view', usesPeriod: true },
  { key: 'top-customers', group: 'Customers', title: 'Top customers', description: 'Customers ranked by what they spent.', permission: 'customers.view', usesPeriod: true },
  { key: 'credit-aging', group: 'Credit', title: 'Credit aging', description: 'What is owed, by how long it has been due.', permission: 'credits.view', usesPeriod: false },
  { key: 'stock-valuation', group: 'Inventory', title: 'Stock valuation', description: 'Stock on hand and what it cost.', permission: 'inventory.view', usesPeriod: false },
  { key: 'stock-movements', group: 'Inventory', title: 'Stock movements', description: 'Purchases, transfers, adjustments and sales of stock.', permission: 'inventory.view', usesPeriod: true },
  { key: 'supplier-purchases', group: 'Suppliers', title: 'Purchases by supplier', description: 'What was bought from each supplier.', permission: 'suppliers.view', usesPeriod: true },
];

export const REPORT_GROUPS: ReportGroup[] = ['Sales', 'Customers', 'Credit', 'Inventory', 'Suppliers'];

/** An Explore query saved under a name, private to the person who saved it. */
export type SavedReport = {
  id: string; name: string; dataset: string; measure: string; groupBy: string; filters: Filter[];
  chart: 'column' | 'bar' | 'line' | 'table'; createdAt: string;
};

export const visibleReports = (can: (p: Permission) => boolean) => REPORTS.filter((r) => can(r.permission));

/** What `?report=` opens: a ready-made report, a saved one (`saved:<id>`), the library, or a report this person may not see. */
export function resolveReportParam(
  param: string | null, can: (p: Permission) => boolean, saved: SavedReport[],
): { kind: 'library' } | { kind: 'builtin'; def: ReportDef } | { kind: 'saved'; report: SavedReport } | { kind: 'denied' } {
  if (!param) return { kind: 'library' };
  if (param.startsWith('saved:')) {
    const report = saved.find((r) => r.id === param.slice('saved:'.length));
    return report ? { kind: 'saved', report } : { kind: 'library' };
  }
  const def = REPORTS.find((r) => r.key === param);
  if (!def) return { kind: 'library' };
  return can(def.permission) ? { kind: 'builtin', def } : { kind: 'denied' };
}

/** Columns whose total means something: amounts and counts the server totalled, never averages or shares. */
export const summableColumns = (result: ReportResult) =>
  result.columns.filter((c) => (c.kind === 'money' || c.kind === 'number') && result.totals[c.key] != null);

const exportValue = (kind: ReportKind, v: string | number | null | undefined) =>
  kind === 'percent' && typeof v === 'number' ? Math.round(v * 10) / 10 : v;

/** The report's columns for the Excel, CSV and PDF export. */
export function reportExportColumns(result: ReportResult): ExportColumn<ReportRow>[] {
  return result.columns.map((c) => ({ header: c.label, value: (row) => exportValue(c.kind, row[c.key]) }));
}

/** The rows, then a Total row with only the summable figures (the first column reads "Total"). */
export function reportRowsWithTotal(result: ReportResult): ReportRow[] {
  const sums = summableColumns(result);
  if (!sums.length) return result.rows;
  const first = result.columns[0]?.key;
  const total: ReportRow = Object.fromEntries(result.columns.map((c) => [c.key, null]));
  if (first) total[first] = 'Total';
  for (const c of sums) total[c.key] = result.totals[c.key];
  return [...result.rows, total];
}

type DatasetShape = { key: string; measures: { key: string }[]; fields: { key: string }[] };

/** Whether a saved Explore query can still run: its dataset, measure and grouping still exist. */
export function savedReportRunnable(r: SavedReport, datasets: DatasetShape[]): boolean {
  const ds = datasets.find((d) => d.key === r.dataset);
  return !!ds && ds.measures.some((m) => m.key === r.measure) && ds.fields.some((f) => f.key === r.groupBy);
}

export const reportQueryKey = (key: string, scope: object) => ['analytics-report', key, scope];
