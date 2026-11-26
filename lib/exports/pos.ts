import { csvDate, type ExportColumn } from '@/lib/export';
import { rowMethod, rowReference, type PosRow } from '@/lib/pos-rows';

/** The names the POS screens already resolve: location, till and status labels. */
export type PosExportLabels = {
  hubName: (id: string) => string;
  tillLabel: (deviceId?: string) => string;
  statusLabel: (status?: string) => string;
};

const sentence = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export function posTransactionExportColumns(l: PosExportLabels): ExportColumn<PosRow>[] {
  return [
    { header: 'Date and time', value: (r) => csvDate(r.createdAt, true) },
    { header: 'Reference', value: (r) => rowReference(r) },
    { header: 'Type', value: (r) => sentence(r.kind) },
    { header: 'Location', value: (r) => l.hubName(r.hub) },
    { header: 'Till', value: (r) => (r.device_id ? l.tillLabel(r.device_id) : '') },
    { header: 'Cashier', value: (r) => r.cashier_name },
    { header: 'Items', value: (r) => r.receipt?.lines?.reduce((n, line) => n + line.qty, 0) },
    { header: 'Payment method', value: (r) => { const m = rowMethod(r); return m === '-' ? '' : m; } },
    { header: 'Status', value: (r) => l.statusLabel(r.status) },
    // POS amounts arrive in kobo.
    { header: 'Amount', value: (r) => (r.total_kobo == null ? null : r.total_kobo / 100) },
  ];
}
