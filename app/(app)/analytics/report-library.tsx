'use client';

import Link from 'next/link';
import { Bookmark, FileBarChart } from 'lucide-react';
import { EmptyState } from '@/components/app';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';
import { REPORT_GROUPS, type ReportDef, type SavedReport } from '@/lib/reports';

const groupTitle = 'mb-2 text-xs font-medium text-muted-foreground';
const card = 'flex h-full w-full flex-col items-start gap-1 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring';

/** The ready-made reports by group, then the person's saved Explore reports. */
export function ReportLibrary({ reports, saved, savedLoading, hrefFor }: Readonly<{
  reports: ReportDef[];
  saved: SavedReport[];
  savedLoading: boolean;
  /** The link to a report, keeping the page's period and location: `?report=<key>` or `saved:<id>`. */
  hrefFor: (param: string) => string;
}>) {
  return (
    <div className="space-y-6">
      {REPORT_GROUPS.map((g) => {
        const list = reports.filter((r) => r.group === g);
        if (!list.length) return null;
        return (
          <section key={g} aria-labelledby={`reports-${g}`}>
            <h3 id={`reports-${g}`} className={groupTitle}>{g}</h3>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((r) => (
                <li key={r.key}>
                  <Link href={hrefFor(r.key)} className={card}>
                    <span className="flex items-center gap-2 text-sm font-medium"><FileBarChart size={16} aria-hidden className="text-muted-foreground" />{r.title}</span>
                    <span className="text-xs text-muted-foreground">{r.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section aria-labelledby="reports-saved">
        <h3 id="reports-saved" className={groupTitle}>Saved reports</h3>
        {savedLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : saved.length === 0 ? (
          <EmptyState
            size="compact"
            icon={<Bookmark />}
            title="No saved reports yet"
            description="Build a chart in Explore and choose Save as report."
            action={<Link href="/analytics?tab=explore" className="text-sm font-medium text-primary hover:underline">Open Explore</Link>}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {saved.map((r) => (
              <li key={r.id}>
                <Link href={hrefFor(`saved:${r.id}`)} className={card}>
                  <span className="flex items-center gap-2 text-sm font-medium"><Bookmark size={16} aria-hidden className="text-muted-foreground" />{r.name}</span>
                  <span className="text-xs text-muted-foreground">Saved {formatDate(r.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
