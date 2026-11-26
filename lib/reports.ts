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

/**
 * A report a person built (in Reports or Explore), private to them: one dataset broken down one way,
 * with one or more columns. `measure` is the first column, kept for reports saved before `measures`.
 */
export type SavedReport = {
  id: string; name: string; dataset: string; measure: string; measures?: string[]; groupBy: string; filters: Filter[];
  chart: 'column' | 'bar' | 'line' | 'table'; createdAt: string;
};

/** A report's name is at most this long. */
export const REPORT_NAME_LIMIT = 60;

/** A custom report shows at most this many columns. */
export const MAX_REPORT_COLUMNS = 8;

/** A saved report's columns, in order. */
export const savedReportMeasures = (r: Pick<SavedReport, 'measure' | 'measures'>): string[] => (r.measures?.length ? r.measures : [r.measure]);

/** Why a report being built cannot be saved yet, or null. */
export function reportDraftError(d: { measures: string[] }): string | null {
  if (d.measures.length === 0) return 'Pick at least one column.';
  if (d.measures.length > MAX_REPORT_COLUMNS) return `Pick up to ${MAX_REPORT_COLUMNS} columns.`;
  return null;
}

/** "Revenue, orders and units by location": the suggested name, in sentence case. */
export function customReportName(measureLabels: string[], groupLabel: string): string {
  const [a, b, ...rest] = measureLabels;
  const by = ` by ${groupLabel}`;
  // Name every column while that stays short; past three, the first two and a count. Never longer than a name may be.
  const all = measureLabels.length > 1 ? `${measureLabels.slice(0, -1).join(', ')} and ${measureLabels.at(-1)}` : (a ?? '');
  const options = [
    measureLabels.length <= 3 ? all : `${a}, ${b} and ${rest.length} more`,
    measureLabels.length > 1 ? `${a} and ${measureLabels.length - 1} more` : (a ?? ''),
  ];
  const cols = options.find((o) => (o + by).length <= REPORT_NAME_LIMIT) ?? options[1];
  const n = `${cols}${by}`.toLowerCase().slice(0, REPORT_NAME_LIMIT);
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export type MeasureRows = { measure: string; rows: { key: string; label: string; value: number }[] };
export type CustomReportRow = { key: string; label: string; values: Record<string, number> };

/** One row per group with every column's value, in the first column's order; a group a column lacks reads 0. */
export function mergeMeasureRows(results: MeasureRows[]): CustomReportRow[] {
  const byKey = new Map<string, CustomReportRow>();
  for (const res of results) {
    for (const r of res.rows) {
      if (!byKey.has(r.key)) byKey.set(r.key, { key: r.key, label: r.label, values: Object.fromEntries(results.map((x) => [x.measure, 0])) });
      byKey.get(r.key)!.values[res.measure] = r.value;
    }
  }
  return [...byKey.values()];
}

export const visibleReports = (can: (p: Permission) => boolean) => REPORTS.filter((r) => can(r.permission));

/** What `?report=` opens: a ready-made report, a saved one (`saved:<id>`), the builder (`new`, `edit:<id>`), the library, or a report this person may not see. */
export function resolveReportParam(
  param: string | null, can: (p: Permission) => boolean, saved: SavedReport[],
): { kind: 'library' } | { kind: 'new' } | { kind: 'edit'; report: SavedReport } | { kind: 'builtin'; def: ReportDef } | { kind: 'saved'; report: SavedReport } | { kind: 'denied' } {
  if (!param) return { kind: 'library' };
  if (param === 'new') return { kind: 'new' };
  if (param.startsWith('edit:')) {
    const report = saved.find((r) => r.id === param.slice('edit:'.length));
    return report ? { kind: 'edit', report } : { kind: 'library' };
  }
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

/** The KPI for each summable total, all of them (Credit aging has six), labelled "Total …" once. */
export const reportKpiColumns = (result: ReportResult) =>
  summableColumns(result).map((c) => ({ ...c, label: /^total\b/i.test(c.label) ? c.label : `Total ${c.label.toLowerCase()}` }));

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

/** Whether a saved report can still run: its dataset, every column, the grouping and each filter's field still exist. */
export function savedReportRunnable(r: SavedReport, datasets: DatasetShape[]): boolean {
  const ds = datasets.find((d) => d.key === r.dataset);
  if (!ds) return false;
  const field = (k: string) => ds.fields.some((f) => f.key === k);
  return savedReportMeasures(r).every((m) => ds.measures.some((x) => x.key === m)) && field(r.groupBy) && r.filters.every((f) => field(f.field));
}

export const reportQueryKey = (key: string, scope: object) => ['analytics-report', key, scope];
