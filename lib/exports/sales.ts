import type { Sale } from '@/types';
import { csvDate, type ExportColumn } from '@/lib/export';

const balance = (s: Sale) => (s.status === 'Voided' || s.status === 'Paid' ? 0 : Math.max(0, s.amount - (s.amountPaid ?? 0)));

/** One row per sale, as the Sales list shows it. */
export const SALE_EXPORT_COLUMNS: ExportColumn<Sale>[] = [
  { header: 'Date', value: (s) => csvDate(s.date, true) },
  { header: 'Reference', value: (s) => s.clientSaleId ?? s.id },
  { header: 'Customer', value: (s) => s.customerName },
  { header: 'Phone', value: (s) => s.customerPhone },
  { header: 'Location', value: (s) => s.hubName },
  { header: 'Recorded by', value: (s) => s.agentName },
  { header: 'Channel', value: (s) => s.channel },
  { header: 'Product', value: (s) => s.item?.productName ?? s.productDetails },
  { header: 'Category', value: (s) => s.item?.category },
  { header: 'Quantity', value: (s) => s.item?.quantity },
  { header: 'Unit', value: (s) => s.item?.saleUnit ?? s.item?.unit },
  { header: 'Unit price', value: (s) => s.item?.unitPrice },
  { header: 'Discount', value: (s) => s.discount },
  { header: 'Amount', value: (s) => s.amount },
  { header: 'Paid', value: (s) => s.amountPaid },
  { header: 'Balance', value: balance },
  { header: 'Profit', value: (s) => s.profitAmount },
  // profit_margin already arrives as a percentage (the purchases tab shows it as `${profitMargin}%`).
  { header: 'Margin %', value: (s) => (Number.isFinite(s.profitMargin) ? Math.round(s.profitMargin * 10) / 10 : null) },
  { header: 'Status', value: (s) => s.status },
  { header: 'Payment', value: (s) => s.paymentMode ?? s.paymentType },
  { header: 'Credit', value: (s) => (s.isCredit ? 'Yes' : 'No') },
  { header: 'Due date', value: (s) => s.dueDate },
  { header: 'Delivery', value: (s) => s.deliveryStatus },
];
