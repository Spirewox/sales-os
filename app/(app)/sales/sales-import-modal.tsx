'use client';

import { Upload, X, Check, AlertCircle, Download, Loader2 } from 'lucide-react';
import type { SalesImportChunkResult, SalesImportPreviewRow } from '@/types/api';
import { fmt, BTN_PRIMARY, BTN_SECONDARY } from '../sales/sales-utils';
import { ModalDialog } from '../sales/modal-dialog';
import { PanelSkeleton } from '@/components/ui/loading-skeletons';

function formatAmount(amount: number | null | undefined) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
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
    subtitle = `${summary.total} rows — ${summary.valid} valid, ${summary.invalid} with errors`;
  }

  const saleLabel = validRows.length === 1 ? 'Sale' : 'Sales';

  let importButtonLabel = `Import ${validRows.length} ${saleLabel}`;
  if (showImportConfirm && !importing) {
    importButtonLabel = `Yes, import ${validRows.length} ${saleLabel}`;
  } else if (importing) {
    importButtonLabel = 'Importing…';
  }

  return (
    <ModalDialog onClose={importing ? () => {} : onClose}>
      <div className="relative z-10 w-full max-w-5xl rounded-md border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Upload size={18} className="text-primary" /> Import Sales
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {showImportConfirm && !importing && (
          <div className="mb-4 p-4 rounded-md border border-primary/30 bg-primary/5 text-sm">
            <p className="font-semibold text-foreground">
              Import {validRows.length} sale{validRows.length === 1 ? '' : 's'} from this file?
            </p>
            <p className="text-muted-foreground mt-1">
              Import is all-or-nothing: if any row fails, nothing from this file is saved.
              {hasInvalid
                ? ` ${invalidRows.length} invalid row(s) will not be imported.`
                : ''}
            </p>
          </div>
        )}

        {importing && (
          <div className="mb-4 p-4 rounded-md border bg-muted/20 flex items-center gap-3 text-sm">
            <Loader2 size={16} className="animate-spin text-primary shrink-0" />
            <div>
              <p className="font-medium">Importing sales…</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {importProgress?.total ?? validRows.length} rows — please wait
              </p>
            </div>
          </div>
        )}

        {importError && (
          <div className="mb-4 p-3 rounded-md border border-red-300 bg-red-50 text-sm">
            <p className="font-medium text-red-800 mb-1 flex items-center gap-1.5">
              <AlertCircle size={14} /> Import rolled back
            </p>
            <p className="text-red-700">{importError}</p>
            <p className="text-xs text-red-600/80 mt-2">
              No sales from this file were saved. Fix the issue and try again.
            </p>
          </div>
        )}

        {importResult && (importResult.failed_so_far ?? importResult.failed) > 0 && (
          <div className="mb-4 p-3 rounded-md border border-orange-300 bg-orange-50 text-sm">
            <p className="font-medium text-orange-800 mb-2">
              {(importResult.failed_so_far ?? importResult.failed)} row(s) failed to import
            </p>
          </div>
        )}

        {hasInvalid && (
          <div className="mb-4 p-3 rounded-md border border-orange-300 bg-orange-50 text-sm">
            <p className="font-medium text-orange-800 mb-1">
              {summary?.invalid ?? invalidRows.length} row(s) have validation errors and will not be imported.
            </p>
            <p className="text-orange-700 text-xs mb-2">
              Fix the Errors column below (or re-download a fresh template), then upload again.
            </p>
            <button
              type="button"
              onClick={() => onDownloadTemplate(freshTemplateType)}
              className="text-orange-800 underline text-xs flex items-center gap-1 mt-1 hover:text-orange-900"
            >
              <Download size={12} /> Download a fresh template
            </button>
          </div>
        )}

        <div className="mb-4 p-3 rounded-md border bg-muted/20 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Excel template columns:</p>
          {allCustom ? (
            <>
              <p><strong>Custom template:</strong> product_description + amount required.</p>
              <p>Historical dates only (before today). Live sales require the catalog template.</p>
              <p>Custom/meal lines do not debit inventory stock.</p>
            </>
          ) : (
            <>
              <p><strong>Live (today+):</strong> product_name + quantity required; amount from catalog.</p>
              <p><strong>Historical (before today):</strong> amount required; product optional free text.</p>
              <p>Fulfillment hub must have catalog products; live rows need a matching product on that hub.</p>
              <p>Follow the Instructions sheet in the downloaded template for stock/batch rules.</p>
            </>
          )}
          <p className="mt-2">Each upload supports up to <strong>500 data rows</strong>. Re-download the template if dropdowns stop after row 501.</p>
        </div>

        {validating && previewRows.length === 0 && (
          <div className="mb-4 rounded-md border bg-primary/5">
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
                    <th className="h-8 px-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="h-8 px-3 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="h-8 px-3 text-left font-medium text-muted-foreground">Hub</th>
                    <th className="h-8 px-3 text-left font-medium text-muted-foreground">Product</th>
                    <th className="h-8 px-3 text-center font-medium text-muted-foreground">Type</th>
                    <th className="h-8 px-3 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="h-8 px-3 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="h-8 px-3 text-center font-medium text-muted-foreground">Hist.</th>
                    <th className="h-8 px-3 text-center font-medium text-muted-foreground">Status</th>
                    <th className="h-8 px-3 text-left font-medium text-muted-foreground min-w-[200px]">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewRows.map((row) => (
                    <tr
                      key={`import-row-${row.lineNo}`}
                      className={row.valid ? 'hover:bg-muted/30' : 'bg-orange-50/50'}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{row.lineNo}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.date_sold}</td>
                      <td className="px-3 py-2 font-medium">{row.customer_name}</td>
                      <td className="px-3 py-2">{row.hub_name}</td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[180px]" title={row.product_description || row.product_name}>
                        {row.product_description || row.product_name || '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.import_mode === 'custom' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {row.import_mode === 'custom' ? 'Custom' : 'Catalog'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{row.quantity || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(row.amount)}
                      </td>
                      <td className="px-3 py-2 text-center text-[10px]">
                        {row.historical ? 'Yes' : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.valid ? (
                          <Check size={14} className="text-green-600 mx-auto" />
                        ) : (
                          <AlertCircle size={14} className="text-orange-600 mx-auto" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-orange-800 max-w-[280px]">
                        {row.valid ? (
                          <span className="text-muted-foreground">—</span>
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
          <div className="mb-4 max-h-40 overflow-y-auto space-y-1 rounded-md border border-orange-200 bg-orange-50/60 p-3 text-xs text-orange-800">
            <p className="font-medium text-orange-900 mb-1">All validation errors</p>
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
            className={`${BTN_PRIMARY} disabled:opacity-50 inline-flex items-center`}
          >
            {importing && <Loader2 size={16} className="mr-2 animate-spin" />}
            {importButtonLabel}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
