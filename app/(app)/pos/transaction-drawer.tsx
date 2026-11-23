'use client';

import { EntityDrawer } from '@/components/app';
import { OperationStatus, formatKobo, posTime, rowMethod, rowReference, type PosRow } from './pos-utils';

/** One POS transaction: summary, receipt lines and payment details. */
export function TransactionDrawer({ row, hubName, tillLabel, onClose }: Readonly<{ row: PosRow; hubName: string; tillLabel: string; onClose: () => void }>) {
  const lines = row.receipt?.lines ?? [];
  const payment = row.receipt?.receiptPayment;
  return (
    <EntityDrawer
      onClose={onClose}
      title={rowReference(row)}
      subtitle={`${hubName} · ${posTime(row.createdAt)}`}
      status={<OperationStatus status={row.status} section="transactions" />}
      stats={[
        { label: 'Amount', value: formatKobo(row.total_kobo) },
        { label: 'Method', value: rowMethod(row) },
        { label: 'Till', value: tillLabel },
        { label: 'Cashier', value: row.cashier_name || '-' },
      ]}
    >
      <div className="space-y-6">
        <section aria-labelledby="pos-receipt-title" className="space-y-2">
          <h3 id="pos-receipt-title" className="text-sm font-semibold">Receipt</h3>
          {lines.length ? (
            <ul className="divide-y rounded-lg border">
              {lines.map((line, index) => (
                <li key={`${line.name}-${index}`} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 break-words"><span className="tabular-nums text-muted-foreground">{line.qty} ×</span> {line.name}</span>
                  <span className="shrink-0 font-medium tabular-nums">{formatKobo(line.lineTotal)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 bg-muted/40 px-3 py-2 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatKobo(row.total_kobo)}</span>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No receipt lines were recorded for this transaction.</p>
          )}
        </section>
        <section aria-labelledby="pos-payment-title" className="space-y-2">
          <h3 id="pos-payment-title" className="text-sm font-semibold">Payment</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail label="Type" value={row.kind ? row.kind[0].toUpperCase() + row.kind.slice(1) : 'Sale'} />
            <Detail label="Provider" value={payment?.provider || '-'} />
            <Detail label="Checkout reference" value={payment?.checkoutReference || row.checkoutReference || '-'} />
            <Detail label="Recorded" value={posTime(row.createdAt)} />
          </dl>
          {row.review_reason && <p className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-sm">{row.review_reason}</p>}
        </section>
      </div>
    </EntityDrawer>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium break-all">{value}</dd>
    </div>
  );
}
