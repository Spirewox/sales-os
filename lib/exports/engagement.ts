import type { Compensation, Enquiry, Feedback } from '@/types';
import { csvDate, type ExportColumn } from '@/lib/export';

export const ENQUIRY_EXPORT_COLUMNS: ExportColumn<Enquiry>[] = [
  { header: 'Date', value: (e) => csvDate(e.date, true) },
  { header: 'Customer', value: (e) => e.customerName },
  { header: 'Email', value: (e) => e.email },
  { header: 'Category', value: (e) => e.category },
  { header: 'Subject', value: (e) => e.subject },
  { header: 'Message', value: (e) => e.message },
  { header: 'Status', value: (e) => e.status },
  { header: 'Resolution', value: (e) => e.resolution },
  { header: 'Handled by', value: (e) => e.managedByAgentName },
];

export const FEEDBACK_EXPORT_COLUMNS: ExportColumn<Feedback>[] = [
  { header: 'Date', value: (f) => csvDate(f.date, true) },
  { header: 'Customer', value: (f) => f.customerName },
  { header: 'Type', value: (f) => f.type },
  { header: 'Priority', value: (f) => f.priority },
  { header: 'Sentiment', value: (f) => f.sentiment },
  { header: 'Feedback', value: (f) => f.content },
  { header: 'Status', value: (f) => f.status },
  { header: 'Resolution', value: (f) => f.resolutionNote },
  { header: 'Resolved on', value: (f) => csvDate(f.resolvedDate) },
  { header: 'Resolved by', value: (f) => f.resolvedByAgentName },
];

export const COMPENSATION_EXPORT_COLUMNS: ExportColumn<Compensation>[] = [
  { header: 'Date', value: (c) => csvDate(c.date) },
  { header: 'Customer', value: (c) => c.customerName },
  { header: 'Category', value: (c) => c.category },
  { header: 'Reason', value: (c) => c.reason },
  { header: 'Amount', value: (c) => c.amount },
  { header: 'Status', value: (c) => c.status },
  { header: 'Recorded by', value: (c) => c.recordedByAgentName },
];
