'use client';

import { Upload, X, Check, AlertCircle, AlertTriangle, Download, Loader2 } from 'lucide-react';
import type { CustomerImportPreviewRow } from '@/types/api';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { PanelSkeleton } from '@/components/ui/loading-skeletons';

const BTN_PRIMARY = 'inline-flex items-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2';
const BTN_SECONDARY = 'inline-flex items-center rounded-md text-sm font-medium border bg-card hover:bg-muted h-9 px-4 py-2';

export interface CustomerImportModalProps {
  show: boolean;
  onClose: () => void;
  previewRows: CustomerImportPreviewRow[];
  summary: { total: number; valid: number; invalid: number; warnings: number } | null;
  importing: boolean;
  validating: boolean;
  importError: string | null;
  onConfirm: () => void;
  onDownloadTemplate: () => void;
}

function rowPreviewStatus(row: CustomerImportPreviewRow): 'valid' | 'warning' | 'error' {
  if (!row.valid) return 'error';
  if (row.warnings.length > 0) return 'warning';
  return 'valid';
}

export function CustomerImportModal({
  show,
  onClose,
  previewRows,
  summary,
  importing,
  validating,
  importError,
  onConfirm,
  onDownloadTemplate,
}: Readonly<CustomerImportModalProps>) {
  if (!show) return null;

  const validRows = previewRows.filter((r) => r.valid && r.resolved);
  const hasInvalid = (summary?.invalid ?? 0) > 0;
  const hasWarnings = (summary?.warnings ?? 0) > 0;

  let subtitle = `${previewRows.length} rows`;
  if (validating) subtitle = 'Validating workbook…';
  else if (summary) {
    subtitle = `${summary.total} rows: ${summary.valid} valid, ${summary.invalid} with errors`;
    if (summary.warnings > 0) subtitle += `, ${summary.warnings} with warnings`;
  }

  const customerLabel = validRows.length === 1 ? 'customer' : 'customers';
  const importButtonLabel = importing
    ? 'Importing…'
    : `Import ${validRows.length} ${customerLabel}`;

  return (
    <ModalDialog onClose={importing ? () => {} : onClose} labelledBy="customer-import-title">
      <div className="relative z-10 w-full max-w-3xl rounded-xl border bg-card p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 id="customer-import-title" className="text-lg font-semibold flex items-center gap-2">
              <Upload size={16} aria-hidden className="text-muted-foreground" /> Import customers
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} disabled={importing} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
            <X size={18} aria-hidden />
          </button>
        </div>

        {hasWarnings && (
          <div className="mb-4 p-3 rounded-md border border-warning/30 bg-warning/10 text-sm">
            <p className="font-medium text-warning">
              {summary?.warnings} row(s) match an existing customer at the same hub or repeat in this file.
              You can still import if intended.
            </p>
          </div>
        )}

        {hasInvalid && (
          <div className="mb-4 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm">
            <p className="font-medium text-destructive mb-1">
              {summary?.invalid} row(s) have validation errors and will not be imported.
            </p>
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="text-destructive underline text-xs flex items-center gap-1 mt-1 hover:text-destructive/80"
            >
              <Download size={14} aria-hidden /> Download a fresh template
            </button>
          </div>
        )}

        {importError && (
          <div className="mb-4 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm">
            <p className="font-medium text-destructive mb-1 flex items-center gap-1.5">
              <AlertCircle size={14} aria-hidden /> Import rolled back
            </p>
            <p className="text-destructive">{importError}</p>
            <p className="text-xs text-muted-foreground mt-2">
              No customers from this file were saved. Fix the issue and try again.
            </p>
          </div>
        )}

        <div className="mb-4 p-3 rounded-md border bg-muted/20 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Template columns:</p>
          <p><strong>customer_name</strong>: display name (same name allowed at different hubs).</p>
          <p><strong>hub_name</strong>: choose from the dropdown in the template.</p>
          <p className="mt-1">Import is all-or-nothing: if any row fails, nothing from this file is saved.</p>
        </div>

        {validating && previewRows.length === 0 && (
          <div className="mb-4 rounded-md border bg-muted/20">
            <PanelSkeleton label="Uploading and validating workbook..." />
          </div>
        )}

        {previewRows.length > 0 && (
          <div className="rounded-md border overflow-hidden mb-4">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b sticky top-0">
                  <tr>
                    <th className="h-8 px-3 text-left font-medium text-muted-foreground">#</th>
                    <th className="h-8 px-3 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="h-8 px-3 text-left font-medium text-muted-foreground">Hub</th>
                    <th className="h-8 px-3 text-center font-medium text-muted-foreground">Status</th>
                    <th className="h-8 px-3 text-left font-medium text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewRows.slice(0, 100).map((row) => {
                    const status = rowPreviewStatus(row);
                    return (
                      <tr
                        key={`import-row-${row.lineNo}`}
                        className={
                          status === 'error'
                            ? 'bg-destructive/5'
                            : status === 'warning'
                              ? 'bg-warning/5'
                              : 'hover:bg-muted/30'
                        }
                      >
                        <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.lineNo}</td>
                        <td className="px-3 py-2 font-medium">{row.customer_name}</td>
                        <td className="px-3 py-2">{row.hub_name || '-'}</td>
                        <td className="px-3 py-2 text-center">
                          {status === 'valid' && <Check size={14} aria-label="Valid" className="text-primary mx-auto" />}
                          {status === 'warning' && (
                            <AlertTriangle size={14} aria-label="Warning" className="text-warning mx-auto" />
                          )}
                          {status === 'error' && (
                            <AlertCircle size={14} aria-label="Error" className="text-destructive mx-auto" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {status === 'error'
                            ? row.errors.join('; ')
                            : row.warnings.length > 0
                              ? row.warnings.join('; ')
                              : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={validRows.length === 0 || importing || validating}
            className={`${BTN_PRIMARY} disabled:opacity-50`}
          >
            {importing && <Loader2 size={16} className="mr-2 animate-spin" />}
            {importButtonLabel}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
