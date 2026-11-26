import type { Customer } from '@/types';
import { csvDate, type ExportColumn } from '@/lib/export';

/** The customer list; `outstanding` gives each customer's unpaid credit, when the credit summary loaded. */
export function customerExportColumns(outstanding: (customerId: string) => number | undefined): ExportColumn<Customer>[] {
  return [
    { header: 'Name', value: (c) => c.name },
    { header: 'Company', value: (c) => c.companyName },
    // CustomerType.B2B is 'B2B'; compared as text so this module stays free of runtime enums.
    { header: 'Type', value: (c) => (String(c.type) === 'B2B' ? 'Business' : 'Individual') },
    { header: 'Business category', value: (c) => c.businessCategory },
    { header: 'Phone', value: (c) => c.phone },
    { header: 'Email', value: (c) => c.email },
    { header: 'Location', value: (c) => c.location },
    { header: 'Segments', value: (c) => c.segments?.join('; ') },
    { header: 'Orders', value: (c) => c.totalOrders },
    { header: 'Total spent', value: (c) => c.totalSpent },
    { header: 'Outstanding credit', value: (c) => outstanding(c.id) },
    { header: 'Last purchase', value: (c) => csvDate(c.lastPurchaseDate) },
    { header: 'Joined', value: (c) => c.joinedDate },
    { header: 'Added by', value: (c) => c.addedByAgentName },
  ];
}
