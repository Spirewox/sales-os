'use client';

import { formatMoney } from '@/lib/format';
import type { Supplier } from '@/types';
import type { SupplierRow } from './use-supplier-list';

/** The five biggest suppliers by spend, as bars. Clicking one opens its drawer. */
export function TopSuppliers({ rows, periodText, onOpen }: Readonly<{ rows: SupplierRow[]; periodText: string; onOpen: (s: Supplier) => void }>) {
  if (rows.length === 0) return null;
  const max = rows[0].spend || 1;
  return (
    <section aria-labelledby="top-suppliers" className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id="top-suppliers" className="text-sm font-semibold">Top suppliers by spend</h2>
        <span className="text-xs text-muted-foreground">{periodText}, matching the filters</span>
      </div>
      <ol className="space-y-2.5">
        {rows.map(({ supplier: s, spend }) => (
          <li key={s.id}>
            <button type="button" onClick={() => onOpen(s)} className="group w-full rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <span className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium group-hover:text-primary">{s.name}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatMoney(spend)}</span>
              </span>
              <span className="block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span className="block h-full rounded-full bg-chart-1" style={{ width: `${Math.max(4, (spend / max) * 100)}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
