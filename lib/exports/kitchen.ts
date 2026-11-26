import { MODE_LABELS, STAGE_LABELS, hubNameOf, type KitchenJob } from '@/lib/kitchen-types';
import { csvDate, type ExportColumn } from '@/lib/export';

/** Kitchen jobs, with the headers of the earlier CSV; cost, profit and margin only for `kitchen.view_costs`. */
export function kitchenJobExportColumns(withCosts: boolean): ExportColumn<KitchenJob>[] {
  return [
    { header: 'Code', value: (j) => j.code },
    { header: 'Created', value: (j) => csvDate(j.createdAt, true) },
    { header: 'Stage', value: (j) => STAGE_LABELS[j.stage] ?? j.stage },
    { header: 'Outlet', value: (j) => hubNameOf(j.hub) },
    { header: 'Customer', value: (j) => j.customer_name },
    { header: 'Phone', value: (j) => j.phone },
    { header: 'Channel', value: (j) => j.channel },
    { header: 'Service', value: (j) => MODE_LABELS[j.mode]?.label ?? j.mode },
    { header: 'Count', value: (j) => j.count },
    { header: 'Due', value: (j) => csvDate(j.due_at, true) },
    { header: 'Total', value: (j) => j.total },
    { header: 'Paid', value: (j) => j.paid },
    { header: 'Balance', value: (j) => Math.max(0, j.total - j.paid) },
    ...(withCosts ? [
      { header: 'Cost', value: (j: KitchenJob) => j.costing?.cost },
      { header: 'Profit', value: (j: KitchenJob) => j.costing?.profit },
      { header: 'Margin %', value: (j: KitchenJob) => (j.costing?.margin != null ? Math.round(j.costing.margin * 1000) / 10 : null) },
    ] : []),
    { header: 'Taken by', value: (j) => j.created_by_name },
    { header: 'Cancel reason', value: (j) => j.cancel_reason },
  ];
}
