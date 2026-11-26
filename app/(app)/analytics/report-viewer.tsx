'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileBarChart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, DataTable, EmptyState, KpiStrip, OverflowMenu, type Column, type KpiCell } from '@/components/app';
import { useExport } from '@/hooks/use-export';
import { useExploreQuery, type InsightScopeParams } from '@/hooks/use-insights-api';
import { useDeleteSavedReport, useReport } from '@/hooks/use-reports';
import { DATASETS } from '@/lib/explore';
import { formatCount, formatDate, formatMoney } from '@/lib/format';
import {
  reportExportColumns, reportKpiColumns, reportRowsWithTotal, savedReportRunnable, savedReportTotal, scopedResult,
  type ReportColumn, type ReportDef, type ReportRow, type SavedReport,
} from '@/lib/reports';
import { ResultChart, fmtShort } from './explore-shared';

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
function ReportHeader({ title, coverage, onBack, actions }: Readonly<{ title: string; coverage: string; onBack: () => void; actions: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft aria-hidden /> Back to reports</Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground tabular-nums">{coverage}</p>
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
  const cells: KpiCell[] = result
    ? reportKpiColumns(result).map((c) => ({ label: c.label, value: showValue(c.kind, result.totals[c.key]) }))
    : [];

  return (
    <div className="space-y-4">
      <ReportHeader title={def.title} coverage={coverage} onBack={onBack} actions={exp.menu} />
      {!def.usesPeriod && <p className="text-xs text-muted-foreground">This report shows today&apos;s position, so the period does not change it.</p>}
      {report.isError ? (
        <EmptyState icon={<FileBarChart />} title="This report did not load" description="Check your connection and try again." action={<Button variant="outline" size="sm" onClick={() => void report.refetch()}>Try again</Button>} />
      ) : (
        <>
          {result?.capped && <p className="text-xs text-warning">Showing the first 10,000 rows. Narrow the period or location to see the rest.</p>}
          {(report.isPending || cells.length > 0) && <KpiStrip cells={cells} loading={report.isPending} label={`${def.title} totals`} />}
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

/** A saved Explore query, run for the period and location in scope, with its chart and figures. */
export function SavedReportViewer({ report, scope, meta, onBack }: Readonly<{ report: SavedReport; scope: InsightScopeParams; meta: Meta; onBack: () => void }>) {
  const runnable = savedReportRunnable(report, DATASETS);
  const explore = useExploreQuery();
  type Result = { rows: { key: string; label: string; value: number }[]; total: number; measureLabel: string; groupLabel: string; measureKind: 'money' | 'number' };
  // Kept with the scope it was run for, so a period change never shows (or exports) the last period's figures.
  const [stored, setStored] = useState<{ key: string; data: Result } | null>(null);
  const del = useDeleteSavedReport();
  const [confirming, setConfirming] = useState(false);
  const { mutate } = explore;
  const scopeKey = JSON.stringify(scope);

  useEffect(() => {
    if (!runnable) return;
    mutate(
      { dataset: report.dataset, measure: report.measure, groupBy: report.groupBy, filters: report.filters, ...JSON.parse(scopeKey) },
      { onSuccess: (data) => setStored({ key: scopeKey, data: data as Result }) },
    );
  }, [runnable, mutate, report, scopeKey]);

  const result = scopedResult(stored, scopeKey);
  const ds = DATASETS.find((d) => d.key === report.dataset);
  const measure = ds?.measures.find((m) => m.key === report.measure);
  const measureLabel = result?.measureLabel || ds?.measures.find((m) => m.key === report.measure)?.label || 'Value';
  const groupLabel = result?.groupLabel || ds?.fields.find((f) => f.key === report.groupBy)?.label || 'Group';
  const kind = result?.measureKind ?? measure?.kind ?? 'number';
  // Averages and distinct counts have no total; their strongest group stands in.
  const total = result ? savedReportTotal(result, measure?.additive !== false) : null;
  const top = result?.rows.reduce<Result['rows'][number] | undefined>((best, r) => (!best || r.value > best.value ? r : best), undefined);
  const cells: KpiCell[] = total != null
    ? [{ label: `Total ${measureLabel.toLowerCase()}`, value: fmtShort(total, kind) }]
    : [{ label: `Top ${groupLabel.toLowerCase()}`, value: top?.label ?? '-', detail: top ? fmtShort(top.value, kind) : undefined }];

  const exp = useExport<{ label: string; value: number }>({
    module: 'saved-report',
    title: report.name,
    noun: { one: 'row', many: 'rows' },
    columns: [{ header: groupLabel, value: (r) => r.label }, { header: measureLabel, value: (r) => r.value }],
    filters: () => [meta.rangeLabel, meta.locationLabel],
    fetchPage: async () => ({ items: result?.rows ?? [], totalPages: 1 }),
    disabled: !result?.rows.length || explore.isPending,
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
            <OverflowMenu label={`More actions for ${report.name}`} items={[{ label: 'Delete report', icon: <Trash2 />, destructive: true, onSelect: () => setConfirming(true) }]} />
          </>
        )}
      />
      {!runnable ? (
        <EmptyState icon={<FileBarChart />} title="This report can't run any more" description="Its data source changed. Delete it and save it again from Explore." />
      ) : explore.isError ? (
        <EmptyState icon={<FileBarChart />} title="This report did not load" description="Check your connection and try again." />
      ) : !result ? (
        <KpiStrip cells={[]} loading label={`${report.name} totals`} />
      ) : (
        <div className="space-y-4">
          <KpiStrip label={`${report.name} totals`} cells={cells} />
          <div className="rounded-xl border bg-card p-4">
            <ResultChart rows={result.rows} chart={report.chart} measureLabel={measureLabel} measureKind={kind} groupLabel={groupLabel} />
          </div>
          {report.chart !== 'table' && (
            <div className="rounded-xl border bg-card p-4">
              <ResultChart rows={result.rows} chart="table" measureLabel={measureLabel} measureKind={kind} groupLabel={groupLabel} />
            </div>
          )}
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          title={`Delete ${report.name}?`}
          message="It leaves your saved reports. The data it showed is not affected."
          confirmLabel="Delete"
          busy={del.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
