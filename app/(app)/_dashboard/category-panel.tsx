'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { EmptyState } from '@/components/app';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoneyShort } from '@/lib/format';
import type { DashboardCategoryRevenue } from '@/types/api';
import { Panel } from './panel';

const TOP = 6;

/** Ranked bar list of revenue by category for the page period. */
export function CategoryPanel({ data, loading, periodLabel }: Readonly<{ data: DashboardCategoryRevenue | undefined; loading: boolean; periodLabel: string }>) {
  const [showAll, setShowAll] = useState(false);
  const categories = data?.categories ?? [];
  const max = Math.max(1, ...categories.map((c) => c.revenue));
  const visible = showAll ? categories : categories.slice(0, TOP);

  return (
    <Panel title="Revenue by category" caption={periodLabel}>
      {loading ? (
        <div className="space-y-4 p-5">{Array.from({ length: TOP }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
      ) : categories.length > 0 ? (
        <div className="flex flex-1 flex-col">
          <ul className="space-y-3.5 p-5">
            {visible.map((cat) => (
              <li key={cat.name}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{cat.name}</span>
                  <span className="shrink-0 tabular-nums">
                    <span className="font-medium">{formatMoneyShort(cat.revenue)}</span>
                    <span className="ml-2 inline-block w-11 text-right text-xs text-muted-foreground">{Math.round(cat.percentage)}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-chart-1" style={{ width: `${Math.max(2, (cat.revenue / max) * 100)}%` }} aria-hidden />
              </li>
            ))}
          </ul>
          {categories.length > TOP && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="mt-auto flex items-center justify-center gap-1 border-t px-5 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              {showAll ? `Show top ${TOP}` : `Show all ${categories.length} categories`}
              <ChevronDown size={14} aria-hidden className={showAll ? 'rotate-180' : ''} />
            </button>
          )}
        </div>
      ) : (
        <EmptyState size="compact" title="No sales in this period" description="Category totals appear after the first sale." />
      )}
    </Panel>
  );
}
