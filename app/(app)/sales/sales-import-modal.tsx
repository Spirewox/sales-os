'use client';

import { Upload, X, Check, AlertCircle, Download, Loader2 } from 'lucide-react';
import type { SalesImportChunkResult, SalesImportPreviewRow } from '@/types/api';
import { fmt, BTN_PRIMARY, BTN_SECONDARY } from '../sales/sales-utils';
import { ModalDialog } from '../sales/modal-dialog';
import { PanelSkeleton } from '@/components/ui/loading-skeletons';

function formatAmount(amount: number | null | undefined) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '-';
  return fmt(amount);
}

export interface SalesImportModalProps {
  show: boolean;
  onClose: () => void;
  previewRows: SalesImportPreviewRow[];
  summary: { total: number; valid: number; invalid: number } | null;
  importing: boolean;
  validating: boolean;
  showImportConfirm: boolean;
  importProgress: { processed: number; total: number; imported: number; failed: number } | null;
  importResult: SalesImportChunkResult | null;
  importError: string | null;
  onConfirm: () => void;
  onCancelConfirm: () => void;
  onDownloadTemplate: (type?: 'catalog' | 'custom') => void;
}

export function SalesImportModal({
  show,
  onClose,
  previewRows,
  summary,
  importing,
  validating,
  showImportConfirm,
  importProgress,
  importResult,
  importError,
  onConfirm,
  onCancelConfirm,
  onDownloadTemplate,
}: Readonly<SalesImportModalProps>) {
  if (!show) return null;

  const validRows = previewRows.filter((r) => r.valid);
  const invalidRows = previewRows.filter((r) => !r.valid);
  const hasInvalid = (summary?.invalid ?? 0) > 0 || invalidRows.length > 0;
  const allCustom = previewRows.length > 0 && previewRows.every((r) => r.import_mode === 'custom');
  const freshTemplateType: 'catalog' | 'custom' = allCustom ? 'custom' : 'catalog';

  let subtitle = `${previewRows.length} rows`;
  if (validating) subtitle = 'Validating workbook…';
  else if (summary) {
    subtitle = `${summary.total} rows: ${summary.valid} valid, ${summary.invalid} with errors`;
  }

  const saleLabel = validRows.length === 1 ? 'sale' : 'sales';

  let importButtonLabel = `Import ${validRows.length} ${saleLabel}`;
  if (showImportConfirm && !importing) {
    importButtonLabel = `Yes, import ${validRows.length} ${saleLabel}`;
  } else if (importing) {
    importButtonLabel = 'Importing…';
  }

  return (
    <ModalDialog onClose={importing ? () => {} : onClose} labelledBy="sales-import-title">
      <div className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border bg-card p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="sales-import-title" className="flex items-center gap-2 text-lg font-semibold">
              <Upload size={16} aria-hidden className="text-muted-foreground" /> Import sales
            </h2>
            <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {showImportConfirm && !importing && (
          <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-semibold text-foreground">
              Import {validRows.length} sale{validRows.length === 1 ? '' : 's'} from this file?
            </p>
            <p className="mt-1 text-muted-foreground">
              Import is all-or-nothing: if any row fails, nothing from this file is saved.
              {hasInvalid
                ? ` ${invalidRows.length} invalid row(s) will not be imported.`
                : ''}
            </p>
          </div>
        )}

        {importing && (
          <div className="mb-4 flex items-center gap-3 rounded-md border bg-muted/20 p-4 text-sm">
            <Loader2 size={16} aria-hidden className="shrink-0 animate-spin text-muted-foreground" />
            <div>
              <p className="font-medium">Importing sales…</p>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {importProgress?.total ?? validRows.length} rows, please wait
              </p>
            </div>
          </div>
        )}

        {importError && (
          <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="mb-1 flex items-center gap-1.5 font-medium">
              <AlertCircle size={14} aria-hidden /> Import rolled back
            </p>
            <p>{importError}</p>
            <p className="mt-2 text-xs">
              No sales from this file were saved. Fix the issue and try again.
            </p>
          </div>
        )}

        {importResult && (importResult.failed_so_far ?? importResult.failed) > 0 && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="mb-2 font-medium tabular-nums">
              {(importResult.failed_so_far ?? importResult.failed)} row(s) failed to import
            </p>
          </div>
        )}

        {hasInvalid && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="mb-1 font-medium tabular-nums">
              {summary?.invalid ?? invalidRows.length} row(s) have validation errors and will not be imported.
            </p>
            <p className="mb-2 text-xs">
              Fix the Errors column below (or re-download a fresh template), then upload again.
            </p>
            <button
              type="button"
              onClick={() => onDownloadTemplate(freshTemplateType)}
              className="mt-1 flex items-center gap-1 text-xs underline hover:no-underline"
            >
              <Download size={14} aria-hidden /> Download a fresh template
            </button>
          </div>
        )}

        <div className="mb-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Excel template columns:</p>
          {allCustom ? (
            <>
              <p><strong>Custom template:</strong> kitchen or meal lines only (product_description + amount required).</p>
              <p>Live and historical dates OK. Each row imports as Food plate / Kitchen and does not debit stock.</p>
              <p>Inventory SKUs must use the Catalog template (with batch when stock tracking is on).</p>
            </>
          ) : (
            <>
              <p><strong>All dates:</strong> product_name + quantity required; product must match the fulfillment hub catalog.</p>
              <p><strong>Live (today+):</strong> amount from catalog price. <strong>Historical:</strong> amount from the sheet.</p>
              <p>Carton rows use the carton price times quantity and require the actual weight in sale_weight_kg. When stock tracking is enabled, catalog sales allocate stock automatically using FIFO.</p>
              <p>Follow the Instructions sheet in the downloaded template for stock/batch rules.</p>
            </>
          )}
          <p className="mt-2">Each upload supports up to <strong>500 data rows</strong>. Re-download the template if dropdowns stop after row 501.</p>
        </div>

        {validating && previewRows.length === 0 && (
          <div className="mb-4 rounded-md border bg-muted/20">
            <PanelSkeleton label="Uploading and validating workbook..." />
          </div>
        )}

        {previewRows.length > 0 && (
          <div className="mb-4 overflow-hidden rounded-md border">
            <div className="max-h-72 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 border-b bg-muted">
                  <tr>
                    <th className="h-8 px-3 text-left text-xs font-medium text-muted-foreground">#</th>
                    <th className="h-8 px-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="h-8 px-3 text-left text-xs font-medium text-muted-foreground">Customer</th>
                    <th className="h-8 px-3 text-left text-xs font-medium text-muted-foreground">Hub</th>
                    <th className="h-8 px-3 text-left text-xs font-medium text-muted-foreground">Product</th>
                    <th className="h-8 px-3 text-center text-xs font-medium text-muted-foreground">Type</th>
                    <th className="h-8 px-3 text-right text-xs font-medium text-muted-foreground">Qty</th>
                    <th className="h-8 px-3 text-right text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="h-8 px-3 text-center text-xs font-medium text-muted-foreground">Historical</th>
                    <th className="h-8 px-3 text-center text-xs font-medium text-muted-foreground">Status</th>
                    <th className="h-8 px-3 text-left text-xs font-medium text-muted-foreground min-w-[200px]">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewRows.map((row) => (
                    <tr
                      key={`import-row-${row.lineNo}`}
                      className={row.valid ? 'hover:bg-muted/30' : 'bg-destructive/5'}
                    >
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.lineNo}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">{row.date_sold}</td>
                      <td className="px-3 py-2 font-medium">{row.customer_name}</td>
                      <td className="px-3 py-2">{row.hub_name}</td>
                      <td className="max-w-[180px] truncate px-3 py-2 text-muted-foreground" title={row.product_description || row.product_name}>
                        {row.product_description || row.product_name || '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {row.import_mode === 'custom' ? 'Custom' : 'Catalog'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.quantity || '-'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatAmount(row.amount)}
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        {row.historical ? 'Yes' : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.valid ? (
                          <Check size={14} aria-label="Valid" className="mx-auto text-primary" />
                        ) : (
                          <AlertCircle size={14} aria-label="Has errors" className="mx-auto text-destructive" />
                        )}
                      </td>
                      <td className="max-w-[280px] px-3 py-2 text-destructive">
                        {row.valid ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <span title={row.errors.join('; ')}>
                            {(row.errors ?? []).join('; ') || 'Invalid row'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {hasInvalid && (
          <div className="mb-4 max-h-40 space-y-1 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <p className="mb-1 font-medium">All validation errors</p>
            {invalidRows.map((r) => (
              <p key={`err-${r.lineNo}`}>
                Row {r.lineNo}: {(r.errors ?? []).join('; ') || 'Invalid row'}
              </p>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          {showImportConfirm && !importing ? (
            <button type="button" onClick={onCancelConfirm} className={BTN_SECONDARY}>
              Back
            </button>
          ) : (
            <button type="button" onClick={onClose} disabled={importing} className={BTN_SECONDARY}>
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={validRows.length === 0 || importing || validating}
            className={`${BTN_PRIMARY} inline-flex items-center disabled:opacity-50`}
          >
            {importing && <Loader2 size={16} aria-hidden className="mr-2 animate-spin" />}
            {importButtonLabel}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
