'use client';

import { FileBarChart } from 'lucide-react';
import { InsightButton } from '@/components/insight-button';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable, EmptyState, KpiStrip, type Column, type KpiCell } from '@/components/app';
import type { useCustomReport } from '@/hooks/use-reports';
import { useExport } from '@/hooks/use-export';
import { DATASETS, type Filter } from '@/lib/explore';
import { customReportSummary, kpiRows, shareOfTotal, type CustomReportRow, type SavedReport } from '@/lib/reports';
import { formatCount } from '@/lib/format';
import { ResultChart, fmtExact, fmtShort } from './explore-shared';

type Report = ReturnType<typeof useCustomReport>;

/** Percentage measures ("Gross Margin %") read as 14.2%, everything else as an amount or a count. */
const isPercent = (label: string) => label.trim().endsWith('%');
const showExact = (v: number, c: { label: string; kind: 'money' | 'number' }) => (isPercent(c.label) ? `${v.toFixed(1)}%` : fmtExact(v, c.kind));
const showShort = (v: number, c: { label: string; kind: 'money' | 'number' }) => (isPercent(c.label) ? `${v.toFixed(1)}%` : fmtShort(v, c.kind));
type Row = CustomReportRow & { __id: string };

/** Totals in strips of up to four, so six aging buckets read as two even rows. */
export function KpiRows({ cells, label }: Readonly<{ cells: KpiCell[]; label: string }>) {
  const rows = kpiRows(cells);
  if (rows.length === 0) return null;
  return (
    <div className="space-y-3">
      {rows.map((row, i) => <KpiStrip key={i} cells={row} label={rows.length > 1 ? `${label}, ${i + 1} of ${rows.length}` : label} />)}
    </div>
  );
}

/**
 * Excel, CSV and PDF of a custom report as its table shows it: one row per group and every column, for
 * the period and location on screen, with the report's own filters listed. Used before and after saving.
 */
export function useCustomReportExport({ module, title, dataset, groupBy, measures, filters, report, meta }: {
  module: string; title: string; dataset: string; groupBy: string; measures: string[]; filters: Filter[];
  report: Report; meta: { rangeLabel: string; locationLabel: string };
}) {
  const ds = DATASETS.find((d) => d.key === dataset);
  const cols = columnMeta(dataset, measures, report);
  const groupLabel = report.groupLabel || ds?.fields.find((f) => f.key === groupBy)?.label || 'Group';
  const firstTotal = (report.rows ?? []).reduce((n, r) => n + (r.values[cols[0]?.measure] ?? 0), 0);
  const filterLabels = filters
    .filter((f) => f.values.length > 0)
    .map((f) => `${ds?.fields.find((x) => x.key === f.field)?.label ?? f.field}: ${f.values.join(', ')}`);
  return useExport<CustomReportRow>({
    module,
    title,
    noun: { one: 'row', many: 'rows' },
    columns: [
      { header: groupLabel, value: (r) => r.label },
      ...cols.map((c) => ({ header: c.label, value: (r: CustomReportRow) => r.values[c.measure] ?? 0 })),
      // The same Share column as the table, for a first column that adds up.
      ...(cols[0]?.additive ? [{ header: 'Share %', value: (r: CustomReportRow) => shareOfTotal(r.values[cols[0].measure] ?? 0, firstTotal) }] : []),
    ],
    filters: () => [meta.rangeLabel, meta.locationLabel, ...filterLabels],
    fetchPage: async () => ({ items: report.rows ?? [], totalPages: 1 }),
    disabled: !report.rows?.length || report.isFetching,
  });
}

/** Column labels and kinds from the dataset, so headers read right before the first answer arrives. */
export function columnMeta(dataset: string, measures: string[], report?: Report) {
  const ds = DATASETS.find((d) => d.key === dataset);
  return measures.map((m, i) => {
    const def = ds?.measures.find((x) => x.key === m);
    return {
      measure: m,
      label: report?.columns[i]?.label || def?.label || m,
      kind: (report?.columns[i]?.label ? report.columns[i].kind : def?.kind) ?? 'number',
      additive: def?.additive !== false,
      total: report?.columns[i]?.total ?? 0,
    };
  });
}

/**
 * What a custom report shows: totals for the columns that add up, the first column as a chart, and a
 * table with every column. Used by the builder's preview and by a saved report.
 */
export function CustomReportResults({ report, dataset, groupBy, measures, chart, title }: Readonly<{
  report: Report; dataset: string; groupBy: string; measures: string[]; chart: SavedReport['chart']; title: string;
}>) {
  const ds = DATASETS.find((d) => d.key === dataset);
  const groupLabel = report.groupLabel || ds?.fields.find((f) => f.key === groupBy)?.label || 'Group';
  const cols = columnMeta(dataset, measures, report);

  if (report.isError) {
    return <EmptyState icon={<FileBarChart />} title="This report did not load" description="Check your connection and try again." action={<Button variant="outline" size="sm" onClick={report.refetch}>Try again</Button>} />;
  }

  const rows: Row[] | undefined = report.rows?.map((r) => ({ ...r, __id: r.key }));
  // Totals only for columns that add up (averages and distinct counts do not), then the top group by the
  // first column with its share, and how many groups there are: what Explore's summary strip showed.
  const totals = cols.filter((c) => c.additive);
  const first = cols[0];
  const summary = customReportSummary(rows ?? [], first.measure, first.additive);
  const groupNoun = groupLabel.toLowerCase();
  const cells: KpiCell[] = [
    ...totals.map((c) => ({ label: `Total ${c.label.toLowerCase()}`, value: showShort(c.total, c) })),
    {
      label: `Top ${groupNoun}`,
      value: summary.top?.label ?? '-',
      detail: summary.top ? `${first.label} ${showShort(summary.top.values[first.measure], first)}${summary.share != null ? `, ${summary.share}%` : ''}` : undefined,
    },
    { label: `${groupLabel} groups`, value: formatCount(summary.groups) },
  ];
  const firstTotal = (rows ?? []).reduce((n, r) => n + (r.values[first.measure] ?? 0), 0);

  const columns: Column<Row>[] = [
    { id: 'group', header: groupLabel, cell: (r) => r.label, sortValue: (r) => r.label, mobile: 'title' },
    ...cols.map((c, i): Column<Row> => ({
      id: c.measure,
      header: c.label,
      align: 'right',
      cell: (r) => <span className="tabular-nums">{showExact(r.values[c.measure] ?? 0, c)}</span>,
      sortValue: (r) => r.values[c.measure] ?? 0,
      mobile: i === 0 ? 'value' : 'meta',
    })),
    // Each group's share of the first column, when that column adds up.
    ...(first.additive ? [{
      id: '__share', header: 'Share', align: 'right' as const,
      cell: (r: Row) => <span className="tabular-nums">{shareOfTotal(r.values[first.measure] ?? 0, firstTotal).toFixed(1)}%</span>,
      sortValue: (r: Row) => r.values[first.measure] ?? 0,
      mobile: 'meta' as const,
    }] : []),
  ];

  return (
    <div className="space-y-4">
      {rows ? <KpiRows label={`${title} totals`} cells={cells} /> : <KpiStrip label={`${title} totals`} cells={[]} loading />}
      {chart !== 'table' && (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-sm font-medium">{first.label} by {groupLabel.toLowerCase()}</p>
            {rows && (
              <InsightButton
                title={`${first.label} by ${groupLabel}`}
                kind={first.kind}
                time={!!ds?.fields.find((f) => f.key === groupBy)?.time}
                series={rows.map((r) => ({ label: r.label, value: r.values[first.measure] ?? 0 }))}
              />
            )}
          </div>
          {rows
            ? <ResultChart rows={rows.map((r) => ({ key: r.key, label: r.label, value: r.values[first.measure] ?? 0 }))} chart={chart} measureLabel={first.label} measureKind={first.kind} groupLabel={groupLabel} />
            : <Skeleton className="h-80 w-full" />}
        </div>
      )}
      <DataTable
        label={title}
        columns={columns}
        rows={rows}
        loading={!rows}
        getRowId={(r) => r.__id}
        empty={<EmptyState size="compact" icon={<FileBarChart />} title="Nothing in this period" description="Try a longer period, another location or fewer filters." />}
      />
    </div>
  );
}
