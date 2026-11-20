'use client';

import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionTabs, type SectionTab } from '@/components/app/section-tabs';

export type DrawerStat = { label: string; value: ReactNode; tone?: 'default' | 'good' | 'warning' | 'danger' };

type EntityDrawerProps<T extends string> = {
  onClose: () => void;
  title: ReactNode;
  /** Code, phone, type: one muted line under the title. */
  subtitle?: ReactNode;
  /** A <StatusBadge>. */
  status?: ReactNode;
  /** Primary actions (Call, Record payment). Destructive ones go in `overflow`. */
  actions?: ReactNode;
  overflow?: ReactNode;
  stats?: DrawerStat[];
  tabs?: { items: SectionTab<T>[]; value: T; onChange: (t: T) => void };
  children: ReactNode;
  width?: 'md' | 'lg';
  /** False while the drawer holds unsaved edits: Escape and backdrop clicks then do nothing. */
  dismissible?: boolean;
  /** Shows a skeleton body while the record loads. */
  loading?: boolean;
};

const STAT_TONE = { default: 'text-foreground', good: 'text-primary', warning: 'text-warning', danger: 'text-destructive' };

/**
 * Side sheet for one record. Sticky header with identity, status and actions; a compact stat row;
 * then tabs. Open the frequent task's tab by default.
 */
export function EntityDrawer<T extends string>({ onClose, title, subtitle, status, actions, overflow, stats, tabs, children, width = 'md', dismissible = true, loading }: Readonly<EntityDrawerProps<T>>) {
  const headingId = useId();
  return (
    <ModalDialog onClose={onClose} align="end" labelledBy={headingId} dismissible={dismissible}>
      <div className={cn('relative flex h-full w-full flex-col border-l bg-background shadow-xl', width === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl')}>
        <div className="sticky top-0 z-10 space-y-3 border-b bg-background px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={headingId} className="truncate text-lg font-semibold tracking-tight">{title}</h2>
                {status}
              </div>
              {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={18} aria-hidden />
            </button>
          </div>
          {(actions || overflow) && (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              {overflow && <div className="ml-auto">{overflow}</div>}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {stats && stats.length > 0 && (
            <dl className={cn('grid grid-cols-2 gap-px border-b bg-border', stats.length === 3 ? 'sm:grid-cols-3' : stats.length >= 4 ? 'sm:grid-cols-4' : '', stats.length % 2 === 1 && 'max-sm:[&>*:first-child]:col-span-2')}>
              {stats.map((s) => (
                <div key={s.label} className="min-w-0 bg-background px-5 py-3">
                  <dt className="truncate text-xs text-muted-foreground">{s.label}</dt>
                  <dd className={cn('mt-0.5 truncate text-base font-semibold tabular-nums', STAT_TONE[s.tone ?? 'default'])}>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {tabs && (
            <div className="px-5 pt-2">
              {/* Up to 3 tabs fit on a phone; more become a select there. */}
              <SectionTabs label="Record sections" tabs={tabs.items} value={tabs.value} onChange={tabs.onChange} inlineOnMobile={tabs.items.filter((t) => !t.hidden).length <= 3} />
            </div>
          )}
          <div className="px-5 py-4">
            {loading ? (
              <div role="status" aria-label="Loading" className="space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
