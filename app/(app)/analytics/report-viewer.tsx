'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, FileBarChart, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, DataTable, EmptyState, KpiStrip, OverflowMenu, type Column, type KpiCell } from '@/components/app';
import { useExport } from '@/hooks/use-export';
import type { InsightScopeParams } from '@/hooks/use-insights-api';
import { useCustomReport, useDeleteSavedReport, useReport } from '@/hooks/use-reports';
import { DATASETS } from '@/lib/explore';
import { formatCount, formatDate, formatMoney } from '@/lib/format';
import {
  reportChart, reportExportColumns, reportKpiColumns, reportRowsWithTotal, savedReportMeasures, savedReportRunnable,
  type CustomReportRow, type ReportColumn, type ReportDef, type ReportRow, type SavedReport,
} from '@/lib/reports';
import { InsightButton } from '@/components/insight-button';
import { columnMeta, CustomReportResults, KpiRows } from './custom-report';
import { ResultChart } from './explore-shared';

type Meta = { rangeLabel: string; locationLabel: string };
type Row = ReportRow & { __id: string };

const showValue = (kind: ReportColumn['kind'], v: string | number | null | undefined) => {
  if (v == null || v === '') return '-';
  if (kind === 'money') return formatMoney(Number(v));
  if (kind === 'number') return formatCount(Number(v));
  if (kind === 'percent') return `${Number(v).toFixed(1)}%`;
  if (kind === 'date') return formatDate(String(v));
  return String(v);
};
const numeric = (kind: ReportColumn['kind']) => kind === 'money' || kind === 'number' || kind === 'percent';

/** Back, the title, what it covers, and the Export button: the top of every report. */
function ReportHeader({ title, description, coverage, onBack, actions }: Readonly<{ title: string; description?: string; coverage: string; onBack: () => void; actions: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft aria-hidden /> Back to reports</Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{coverage}</p>
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

/** One ready-made report: totals, the table, and Excel, CSV and PDF exports of what it shows. */
export function ReportViewer({ def, scope, meta, onBack }: Readonly<{ def: ReportDef; scope: InsightScopeParams; meta: Meta; onBack: () => void }>) {
  const report = useReport(def.key, scope);
  const result = report.data;
  const coverage = def.usesPeriod ? `${meta.rangeLabel} · ${meta.locationLabel}` : `As of ${formatDate(new Date())} · ${meta.locationLabel}`;

  const exp = useExport<ReportRow>({
    module: `report-${def.key}`,
    title: def.title,
    noun: { one: 'row', many: 'rows' },
    columns: result ? reportExportColumns(result) : [],
    filters: () => (def.usesPeriod ? [meta.rangeLabel, meta.locationLabel] : [`As of ${formatDate(new Date())}`, meta.locationLabel]),
    fetchPage: async () => ({ items: result ? reportRowsWithTotal(result) : [], totalPages: 1 }),
    disabled: !result?.rows.length,
  });

  const rows: Row[] = useMemo(() => (result?.rows ?? []).map((r, i) => ({ ...r, __id: String(i) })), [result]);
  const firstValue = result?.columns.find((c, i) => i > 0 && numeric(c.kind))?.key;
  const columns: Column<Row>[] = (result?.columns ?? []).map((c, i) => ({
    id: c.key,
    header: c.label,
    align: numeric(c.kind) ? 'right' : undefined,
    cell: (r) => <span className={numeric(c.kind) ? 'tabular-nums' : undefined}>{showValue(c.kind, r[c.key])}</span>,
    sortValue: (r) => r[c.key],
    mobile: i === 0 ? 'title' : c.key === firstValue ? 'value' : i <= 2 ? 'subtitle' : 'meta',
  }));
  // Days read as "25 Nov" on the chart.
  const chart = useMemo(() => {
    const c = result ? reportChart(result) : null;
    return c && c.kind === 'line' ? { ...c, rows: c.rows.map((r) => ({ ...r, label: formatDate(r.key, { day: 'numeric', month: 'short' }) })) } : c;
  }, [result]);
  const cells: KpiCell[] = result
    ? reportKpiColumns(result).map((c) => ({ label: c.label, value: showValue(c.kind, result.totals[c.key]) }))
    : [];

  return (
    <div className="space-y-4">
      <ReportHeader title={def.title} description={def.description} coverage={coverage} onBack={onBack} actions={exp.menu} />
      {!def.usesPeriod && <p className="text-xs text-muted-foreground">This report shows today&apos;s position, so the period does not change it.</p>}
      {report.isError ? (
        <EmptyState icon={<FileBarChart />} title="This report did not load" description="Check your connection and try again." action={<Button variant="outline" size="sm" onClick={() => void report.refetch()}>Try again</Button>} />
      ) : (
        <>
          {result?.capped && <p className="text-xs text-warning">Showing the first 10,000 rows. Narrow the period or location to see the rest.</p>}
          {report.isPending ? <KpiStrip cells={[]} loading label={`${def.title} totals`} /> : <KpiRows cells={cells} label={`${def.title} totals`} />}
          {chart && (
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{chart.valueLabel} by {chart.labelLabel.toLowerCase()}</p>
                <InsightButton title={`${chart.valueLabel} by ${chart.labelLabel}`} kind="money" time={chart.kind === 'line'} series={chart.rows} />
              </div>
              <ResultChart rows={chart.rows} chart={chart.kind} measureLabel={chart.valueLabel} measureKind="money" groupLabel={chart.labelLabel} />
            </div>
          )}
          <DataTable
            label={def.title}
            columns={columns}
            rows={report.isPending ? undefined : rows}
            loading={report.isPending}
            getRowId={(r) => r.__id}
            empty={<EmptyState size="compact" icon={<FileBarChart />} title="Nothing in this period" description="Try a longer period or another location." />}
          />
        </>
      )}
    </div>
  );
}

/** A report the person built, run for the period and location in scope, with its totals, chart and table. */
export function SavedReportViewer({ report, scope, meta, onBack, onEdit }: Readonly<{ report: SavedReport; scope: InsightScopeParams; meta: Meta; onBack: () => void; onEdit: () => void }>) {
  const runnable = savedReportRunnable(report, DATASETS);
  const measures = savedReportMeasures(report);
  const data = useCustomReport({ dataset: report.dataset, groupBy: report.groupBy, filters: report.filters, measures }, scope, { enabled: runnable });
  const del = useDeleteSavedReport();
  const [confirming, setConfirming] = useState(false);
  const cols = columnMeta(report.dataset, measures, data);
  const groupLabel = data.groupLabel || DATASETS.find((d) => d.key === report.dataset)?.fields.find((f) => f.key === report.groupBy)?.label || 'Group';

  // The export holds what the table shows: one row per group, every column, for the period on screen.
  const exp = useExport<CustomReportRow>({
    module: 'saved-report',
    title: report.name,
    noun: { one: 'row', many: 'rows' },
    columns: [{ header: groupLabel, value: (r) => r.label }, ...cols.map((c) => ({ header: c.label, value: (r: CustomReportRow) => r.values[c.measure] ?? 0 }))],
    filters: () => [meta.rangeLabel, meta.locationLabel],
    fetchPage: async () => ({ items: data.rows ?? [], totalPages: 1 }),
    disabled: !data.rows?.length || data.isFetching,
  });

  const remove = () => del.mutate(report.id, {
    onSuccess: () => { toast.success(`${report.name} deleted.`); setConfirming(false); onBack(); },
    onError: (e) => { toast.error(e.message); setConfirming(false); },
  });

  return (
    <div className="space-y-4">
      <ReportHeader
        title={report.name}
        coverage={`${meta.rangeLabel} · ${meta.locationLabel}`}
        onBack={onBack}
        actions={(
          <>
            {runnable && exp.menu}
            <OverflowMenu
              label={`More actions for ${report.name}`}
              items={[
                { label: 'Edit report', icon: <Pencil />, onSelect: onEdit },
                { label: 'Delete report', icon: <Trash2 />, destructive: true, onSelect: () => setConfirming(true) },
              ]}
            />
          </>
        )}
      />
      {runnable
        ? <CustomReportResults report={data} dataset={report.dataset} groupBy={report.groupBy} measures={measures} chart={report.chart} title={report.name} />
        : <EmptyState icon={<FileBarChart />} title="This report can't run any more" description="Its data source changed. Edit it to pick new columns, or delete it." action={<Button variant="outline" size="sm" onClick={onEdit}>Edit report</Button>} />}
      {confirming && (
        <ConfirmDialog
          title={`Delete ${report.name}?`}
          message="It leaves your reports. The data it showed is not affected."
          confirmLabel="Delete"
          busy={del.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
