import type { Supplier } from '@/types';
import { csvDate, type ExportColumn } from '@/lib/export';

/** A row of the Suppliers list: the supplier plus the figures the page works out for the period. */
export type SupplierExportRow = { supplier: Supplier; spend: number; lastPurchase: string | null; openIssues: number | null };

export const SUPPLIER_EXPORT_COLUMNS: ExportColumn<SupplierExportRow>[] = [
  { header: 'Code', value: (r) => r.supplier.code },
  { header: 'Name', value: (r) => r.supplier.name },
  { header: 'Business name', value: (r) => r.supplier.businessName },
  { header: 'Business type', value: (r) => r.supplier.businessType },
  { header: 'Contact person', value: (r) => r.supplier.contactPerson },
  { header: 'Phone', value: (r) => r.supplier.phone },
  { header: 'Email', value: (r) => r.supplier.email },
  { header: 'Location', value: (r) => r.supplier.location },
  { header: 'Categories', value: (r) => r.supplier.categories?.join('; ') },
  { header: 'Payment terms', value: (r) => r.supplier.paymentTerms },
  { header: 'Lead time (days)', value: (r) => r.supplier.leadTimeDays },
  { header: 'Rating', value: (r) => r.supplier.rating },
  { header: 'Status', value: (r) => (r.supplier.isActive ? 'Active' : 'Inactive') },
  { header: 'Spend', value: (r) => r.spend },
  { header: 'Last purchase', value: (r) => csvDate(r.lastPurchase) },
  { header: 'Open issues', value: (r) => r.openIssues },
];
