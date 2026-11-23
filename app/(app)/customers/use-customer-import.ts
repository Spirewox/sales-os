'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useDownloadCustomerImportTemplate, useImportCustomers, useValidateCustomerImport } from '@/hooks/use-queries';
import type { CustomerImportPreviewRow, CustomerImportResult, CustomerImportRowStatus, CustomerImportSummaryRow } from '@/types/api';

export type CustomerImportSummary = {
  fileName: string;
  total: number;
  imported: number;
  warnings: number;
  invalid: number;
  failed: number;
  rows: CustomerImportSummaryRow[];
};

function buildCustomerImportSummaryRows(
  validationRows: CustomerImportPreviewRow[],
  importResults?: CustomerImportResult['results'],
): CustomerImportSummaryRow[] {
  const resultsByLine = new Map((importResults ?? []).map((result) => [result.lineNo, result]));
  return validationRows.map((row) => {
    const result = resultsByLine.get(row.lineNo);
    let status: CustomerImportRowStatus;
    const reasons: string[] = [];
    if (!row.valid) {
      status = 'invalid';
      reasons.push(...row.errors);
    } else if (result) {
      if (!result.success) {
        status = 'failed';
        if (result.error) reasons.push(result.error);
      } else {
        status = 'imported';
        if (row.warnings.length > 0) reasons.push(...row.warnings);
      }
    } else {
      status = 'failed';
      reasons.push('Row was not imported.');
    }
    return { lineNo: row.lineNo, customer_name: row.customer_name, hub_name: row.hub_name, status, reasons };
  });
}

/** Validate an .xlsx, preview it, import the valid rows, then show a per-row summary. Pass the file from an <input type=file>. */
export function useCustomerImport() {
  const downloadTemplate = useDownloadCustomerImportTemplate();
  const validateCustomerImport = useValidateCustomerImport();
  const importCustomers = useImportCustomers();

  const [preview, setPreview] = useState<CustomerImportPreviewRow[]>([]);
  const [validateSummary, setValidateSummary] = useState<{ total: number; valid: number; invalid: number; warnings: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CustomerImportSummary | null>(null);

  const handleFile = (file?: File) => {
    if (!file) return;
    setSummary(null);
    setPreview([]);
    setValidateSummary(null);
    setImportError(null);
    setFileName(file.name);
    setShowModal(true);
    validateCustomerImport.mutate(file, {
      onSuccess: (validation) => {
        setPreview(validation.rows);
        setValidateSummary(validation.summary);
        if (validation.summary.total === 0) {
          toast.error('No customer rows found in the workbook.');
          setShowModal(false);
        }
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Customer import validation failed.');
        setShowModal(false);
      },
    });
  };

  const confirm = async () => {
    const previewSnapshot = preview;
    const rows = previewSnapshot.filter((row) => row.valid && row.resolved).map((row) => row.resolved!);
    if (rows.length === 0) {
      toast.error('No valid rows to import.');
      return;
    }
    setImporting(true);
    setImportError(null);
    try {
      const result = await importCustomers.mutateAsync(rows);
      const imported = result.imported ?? 0;
      const warnings = validateSummary?.warnings ?? 0;
      const invalid = validateSummary?.invalid ?? 0;
      const total = validateSummary?.total ?? previewSnapshot.length;
      setShowModal(false);
      setPreview([]);
      setValidateSummary(null);
      setImportError(null);
      setSummary({ fileName, total, imported, warnings, invalid, failed: 0, rows: buildCustomerImportSummaryRows(previewSnapshot, result.results) });
      if (warnings > 0 || invalid > 0) toast.warning(`${warnings} row(s) had warnings, ${invalid} invalid (skipped).`);
      toast.success(`Imported ${imported} customer(s).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Customer import failed.';
      setImportError(message);
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  const closeModal = () => {
    if (importing) return;
    setShowModal(false);
    setPreview([]);
    setValidateSummary(null);
    setImportError(null);
  };

  return {
    handleFile,
    downloadTemplate: () => downloadTemplate.mutate(),
    modal: {
      show: showModal,
      onClose: closeModal,
      previewRows: preview,
      summary: validateSummary,
      importing,
      validating: validateCustomerImport.isPending,
      importError,
      onConfirm: confirm,
      onDownloadTemplate: () => downloadTemplate.mutate(),
    },
    summary,
    closeSummary: () => setSummary(null),
  };
}
