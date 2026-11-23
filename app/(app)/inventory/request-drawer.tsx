'use client';

import type { ReactNode } from 'react';
import type { ApiInventoryRequest } from '@/types/api';
import { formatDateTime } from '@/lib/format';
import { EntityDrawer, StatusBadge } from '@/components/app';
import { REQUEST_STATUS_LABEL, formatRequestLine, hubRefName } from './use-request-scope';

/** One inventory request in full: every line, notes, rejection reason and who handled it. */
export function RequestDrawer({ request: r, onClose, actions }: Readonly<{
  request: ApiInventoryRequest;
  onClose: () => void;
  /** The same approve / fulfil / reject / cancel controls as the table row. */
  actions: ReactNode;
}>) {
  const rows: { label: string; value: ReactNode }[] = [
    { label: 'Requesting location', value: hubRefName(r.requesting_location) },
    { label: 'Fulfilling location', value: hubRefName(r.fulfilling_hub) },
    { label: 'Requested by', value: r.requested_by_name ?? '-' },
    ...(r.createdAt ? [{ label: 'Requested', value: formatDateTime(r.createdAt) }] : []),
    ...(r.reviewed_by_name ? [{ label: 'Reviewed by', value: r.reviewed_by_name }] : []),
    ...(r.fulfilled_by_name ? [{ label: 'Fulfilled by', value: r.fulfilled_by_name }] : []),
    ...(r.updatedAt && r.updatedAt !== r.createdAt ? [{ label: 'Last update', value: formatDateTime(r.updatedAt) }] : []),
  ];

  return (
    <EntityDrawer
      onClose={onClose}
      title={<span>{hubRefName(r.requesting_location)} <span className="font-normal text-muted-foreground">to</span> {hubRefName(r.fulfilling_hub)}</span>}
      subtitle={`${r.lines.length} ${r.lines.length === 1 ? 'item' : 'items'}`}
      status={<StatusBadge domain="work" status={REQUEST_STATUS_LABEL[r.status]} />}
      actions={actions}
    >
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">Items</h3>
          <ul className="divide-y rounded-xl border">
            {r.lines.map((line, idx) => (
              <li key={idx} className="px-4 py-2.5 text-sm">
                <p className="font-medium">{formatRequestLine(line)}</p>
                {line.stock_quantity != null && <p className="text-xs text-muted-foreground tabular-nums">{line.stock_quantity} in the product&apos;s stock unit</p>}
                {line.notes && <p className="text-xs text-muted-foreground">{line.notes}</p>}
              </li>
            ))}
          </ul>
        </section>

        {r.notes && (
          <section>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">Notes</h3>
            <p className="whitespace-pre-wrap text-sm">{r.notes}</p>
          </section>
        )}

        {r.rejection_reason && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">Rejected: {r.rejection_reason}</p>
        )}

        <dl className="divide-y rounded-xl border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="text-right font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </EntityDrawer>
  );
}
