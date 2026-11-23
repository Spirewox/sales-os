'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/app';
import { Skeleton } from '@/components/ui/skeleton';
import { useSales } from '@/hooks/use-queries';
import { formatDate, formatMoney, formatMoneyShort, plural } from '@/lib/format';
import type { Customer } from '@/types';
import { Panel, PanelLink, Segmented } from './panel';

const TYPES = [
  { id: 'all', label: 'All' },
  { id: 'B2B', label: 'Business' },
  { id: 'B2C', label: 'Individual' },
] as const;
type TypeFilter = (typeof TYPES)[number]['id'];
/** Same depth as the old dashboard: ten customers, and up to 50 purchases each. */
const TOP = 10;
const HISTORY_LIMIT = 50;

/**
 * Best customers by lifetime spend at the selected location. The API only returns lifetime totals,
 * so this list does not follow the page period and says so.
 */
export function TopCustomers({ customers, loading, hub, className }: Readonly<{
  customers: Customer[];
  loading: boolean;
  /** Location name, or "All". */
  hub: string;
  className?: string;
}>) {
  const [type, setType] = useState<TypeFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const top = useMemo(
    () => customers
      .filter((c) => c.totalSpent > 0 && (hub === 'All' || c.location === hub) && (type === 'all' || c.type === type))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, TOP),
    [customers, type, hub],
  );

  const { data: history, isPending: historyLoading } = useSales(
    { customer_id: openId ?? undefined, limit: HISTORY_LIMIT, exclude_voided: true },
    { enabled: !!openId },
  );

  return (
    <Panel
      title="Top customers"
      caption="Lifetime spend"
      className={className}
      action={
        <div className="flex items-center gap-2">
          <Segmented label="Customer type" value={type} onChange={(v) => { setType(v); setOpenId(null); }} options={TYPES} />
          <PanelLink href="/customers">All customers</PanelLink>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
      ) : top.length > 0 ? (
        <ol className="divide-y">
          {top.map((c, idx) => (
            <CustomerRow
              key={c.id}
              rank={idx + 1}
              customer={c}
              open={openId === c.id}
              onToggle={() => setOpenId(openId === c.id ? null : c.id)}
              history={openId === c.id ? history?.items ?? [] : []}
              historyLoading={openId === c.id && historyLoading}
            />
          ))}
        </ol>
      ) : (
        <EmptyState size="compact" title="No customers with purchases yet" description="Customers appear here after their first sale." />
      )}
    </Panel>
  );
}

function CustomerRow({ rank, customer: c, open, onToggle, history, historyLoading }: Readonly<{
  rank: number;
  customer: Customer;
  open: boolean;
  onToggle: () => void;
  history: { id: string; date: string; productDetails?: string; amount: number; isCredit?: boolean }[];
  historyLoading: boolean;
}>) {
  const business = c.type === 'B2B' && !!c.companyName;
  const secondary = business ? c.name : c.type === 'B2B' ? 'Business' : 'Individual';
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-muted/40">
        <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{rank}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{business ? c.companyName : c.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {secondary}
            {c.location ? `, ${c.location}` : ''}
          </span>
        </span>
        <span className="hidden shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:block">{plural(c.totalOrders, 'order')}</span>
        <span className="shrink-0 text-right text-sm font-medium tabular-nums">{formatMoneyShort(c.totalSpent)}</span>
        <ChevronDown size={16} aria-hidden className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t bg-muted/20 px-5 py-3">
          {historyLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
          ) : history.length > 0 ? (
            <>
            <p className="mb-2 text-xs text-muted-foreground tabular-nums">
              {history.length >= HISTORY_LIMIT ? `Latest ${HISTORY_LIMIT} purchases` : plural(history.length, 'purchase')}
            </p>
            <div className="max-h-[260px] overflow-y-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Recent purchases by {c.name}</caption>
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="pb-2 font-medium">Date</th>
                  <th scope="col" className="pb-2 font-medium">Items</th>
                  <th scope="col" className="hidden pb-2 font-medium sm:table-cell">Paid</th>
                  <th scope="col" className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <tr key={s.id} className="border-t border-border/60">
                    <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                      <Link href={`/sales?sale=${s.id}`} className="hover:underline">{formatDate(s.date, { day: 'numeric', month: 'short' })}</Link>
                    </td>
                    <td className="max-w-[220px] truncate py-2 pr-3 text-muted-foreground" title={s.productDetails}>{s.productDetails || 'Not recorded'}</td>
                    <td className={`hidden py-2 pr-3 text-xs sm:table-cell ${s.isCredit ? 'text-warning' : 'text-muted-foreground'}`}>{s.isCredit ? 'On credit' : 'Upfront'}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{formatMoney(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No purchases found.</p>
          )}
          <Link href={`/customers?customer=${c.id}`} className="mt-3 inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
            Open customer <ChevronRight size={14} aria-hidden />
          </Link>
        </div>
      )}
    </li>
  );
}
