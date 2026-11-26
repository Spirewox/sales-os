'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bookmark, ChevronRight, CreditCard, Package, Plus, Receipt, Truck, Users } from 'lucide-react';
import { EmptyState } from '@/components/app';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';
import { DATASETS } from '@/lib/explore';
import { REPORT_GROUPS, savedReportMeasures, type ReportDef, type ReportGroup, type SavedReport } from '@/lib/reports';

const sectionTitle = 'text-sm font-semibold';
const savedCard = 'flex h-full w-full flex-col items-start gap-1 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring';
const GROUP_ICON: Record<ReportGroup, ReactNode> = {
  Sales: <Receipt size={16} aria-hidden />,
  Customers: <Users size={16} aria-hidden />,
  Credit: <CreditCard size={16} aria-hidden />,
  Inventory: <Package size={16} aria-hidden />,
  Suppliers: <Truck size={16} aria-hidden />,
};

/** "3 columns · one row per location": what a saved report holds, from its dataset's labels. */
function savedSummary(r: SavedReport) {
  const ds = DATASETS.find((d) => d.key === r.dataset);
  const n = savedReportMeasures(r).length;
  const per = ds?.fields.find((f) => f.key === r.groupBy)?.label.toLowerCase() ?? 'group';
  return `${ds?.label ?? 'Data'} · ${n} ${n === 1 ? 'column' : 'columns'} · one row per ${per}`;
}

/** The person's own reports with New report, then the ready-made reports, one panel per group. */
export function ReportLibrary({ reports, saved, savedLoading, savedError, onRetrySaved, hrefFor }: Readonly<{
  reports: ReportDef[];
  saved: SavedReport[];
  savedLoading: boolean;
  /** The saved list failed to load: say so, rather than claiming there are none. */
  savedError?: boolean;
  onRetrySaved?: () => void;
  /** The link to a report, keeping the page's period and location: `?report=<key>` or `saved:<id>`. */
  hrefFor: (param: string) => string;
}>) {
  const groups = REPORT_GROUPS.map((g) => ({ group: g, list: reports.filter((r) => r.group === g) })).filter((g) => g.list.length > 0);
  return (
    <div className="space-y-8">
      <section aria-labelledby="reports-saved" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 id="reports-saved" className={sectionTitle}>My reports</h3>
            <p className="text-xs text-muted-foreground">Reports you built. Each one runs for the period and location above.</p>
          </div>
          <Button size="sm" nativeButton={false} render={<Link href={hrefFor('new')} />}><Plus aria-hidden /> New report</Button>
        </div>
        {savedLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : savedError ? (
          <EmptyState
            size="compact"
            icon={<Bookmark />}
            title="Your reports did not load"
            description="Check your connection and try again."
            action={<Button variant="outline" size="sm" onClick={onRetrySaved}>Try again</Button>}
          />
        ) : saved.length === 0 ? (
          <EmptyState
            size="compact"
            icon={<Bookmark />}
            title="No reports of your own yet"
            description="Choose New report to pick the data, columns and filters you need. It stays here for any period."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {saved.map((r) => (
              <li key={r.id}>
                <Link href={hrefFor(`saved:${r.id}`)} className={savedCard}>
                  <span className="flex w-full items-center gap-2 text-sm font-medium">
                    <Bookmark size={16} aria-hidden className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate">{r.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{savedSummary(r)}</span>
                  <span className="text-xs text-muted-foreground">Saved {formatDate(r.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="reports-ready" className="space-y-3">
        <div>
          <h3 id="reports-ready" className={sectionTitle}>Ready-made reports</h3>
          <p className="text-xs text-muted-foreground">Tables with totals, ready to export to Excel, CSV or PDF.</p>
        </div>
        {/* Columns, not a grid: a short group sits under the one above it instead of leaving a gap. */}
        <div className="gap-3 md:columns-2 xl:columns-3">
          {groups.map(({ group, list }) => (
            <section key={group} aria-labelledby={`reports-${group}`} className="mb-3 break-inside-avoid overflow-hidden rounded-xl border bg-card">
              <h4 id={`reports-${group}`} className="flex items-center gap-2 px-4 pt-3 pb-2 text-xs font-medium text-muted-foreground">
                {GROUP_ICON[group]}{group}
              </h4>
              <ul className="divide-y border-t">
                {list.map((r) => (
                  <li key={r.key}>
                    <Link href={hrefFor(r.key)} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{r.title}</span>
                        <span className="block text-xs text-muted-foreground">{r.description}</span>
                      </span>
                      <ChevronRight size={16} aria-hidden className="shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
