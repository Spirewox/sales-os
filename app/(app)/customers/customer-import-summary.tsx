'use client';

import { X } from 'lucide-react';
import type { CustomerImportRowStatus } from '@/types/api';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { StatusBadge, type Tone } from '@/components/app';
import type { CustomerImportSummary } from './use-customer-import';

const STATUS_TONE: Record<CustomerImportRowStatus, Tone> = {
  imported: 'good',
  skipped: 'warning',
  invalid: 'danger',
  failed: 'danger',
};

/** Per-row result after an import finishes. */
export function CustomerImportSummaryDialog({ summary, onClose }: Readonly<{ summary: CustomerImportSummary; onClose: () => void }>) {
  return (
    <ModalDialog onClose={onClose} labelledBy="customer-import-summary-title">
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="customer-import-summary-title" className="text-lg font-semibold">Customer upload summary</h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">{summary.fileName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X size={18} aria-hidden />
          </button>
        </div>
        {summary.imported === 0 && (
          <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">No rows were importable. Review the reasons below.</div>
        )}
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            { label: 'Total rows', value: summary.total, cls: '' },
            { label: 'Imported', value: summary.imported, cls: 'text-primary' },
            { label: 'Warnings', value: summary.warnings, cls: 'text-warning' },
            { label: 'Invalid or failed', value: summary.invalid + summary.failed, cls: 'text-destructive' },
          ].map((s) => (
            <div key={s.label} className="rounded-md border p-3">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className={`text-xl font-semibold tabular-nums ${s.cls}`}>{s.value}</dd>
            </div>
          ))}
        </dl>
        {summary.rows.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-md border">
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Row</th>
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium">Hub</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((row) => (
                    <tr key={row.lineNo} className="border-b last:border-b-0">
                      <td className="p-3 align-top tabular-nums">{row.lineNo}</td>
                      <td className="p-3 align-top font-medium">{row.customer_name}</td>
                      <td className="p-3 align-top">{row.hub_name || '-'}</td>
                      <td className="p-3 align-top"><StatusBadge tone={STATUS_TONE[row.status]} className="capitalize">{row.status}</StatusBadge></td>
                      <td className="p-3 align-top text-muted-foreground">{row.reasons.length > 0 ? row.reasons.join('; ') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <button type="button" onClick={onClose} className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Done
        </button>
      </div>
    </ModalDialog>
  );
}
