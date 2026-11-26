'use client';

import { FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable, EmptyState, KpiStrip, type Column, type KpiCell } from '@/components/app';
import type { useCustomReport } from '@/hooks/use-reports';
import { DATASETS } from '@/lib/explore';
import type { CustomReportRow, SavedReport } from '@/lib/reports';
import { ResultChart, fmtExact, fmtShort } from './explore-shared';

type Report = ReturnType<typeof useCustomReport>;
type Row = CustomReportRow & { __id: string };

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
  // Averages and distinct counts do not add up across groups; when no column does, the strongest group stands in.
  const totals = cols.filter((c) => c.additive);
  const first = cols[0];
  const top = rows?.reduce<Row | undefined>((best, r) => (!best || r.values[first.measure] > best.values[first.measure] ? r : best), undefined);
  const cells: KpiCell[] = totals.length
    ? totals.map((c) => ({ label: `Total ${c.label.toLowerCase()}`, value: fmtShort(c.total, c.kind) }))
    : [{ label: `Top ${groupLabel.toLowerCase()}`, value: top?.label ?? '-', detail: top ? `${first.label} ${fmtShort(top.values[first.measure], first.kind)}` : undefined }];

  const columns: Column<Row>[] = [
    { id: 'group', header: groupLabel, cell: (r) => r.label, sortValue: (r) => r.label, mobile: 'title' },
    ...cols.map((c, i): Column<Row> => ({
      id: c.measure,
      header: c.label,
      align: 'right',
      cell: (r) => <span className="tabular-nums">{fmtExact(r.values[c.measure] ?? 0, c.kind)}</span>,
      sortValue: (r) => r.values[c.measure] ?? 0,
      mobile: i === 0 ? 'value' : 'meta',
    })),
  ];

  return (
    <div className="space-y-4">
      <KpiStrip label={`${title} totals`} cells={rows ? cells : []} loading={!rows} />
      {chart !== 'table' && (
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-medium">{first.label} by {groupLabel.toLowerCase()}</p>
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
