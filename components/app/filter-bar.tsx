'use client';

import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FilterChip = { key: string; label: string; onRemove: () => void };

type FilterBarProps = {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string };
  /** Up to 4 compact controls shown inline: LocationSelect, PeriodSelect, FilterSelect. */
  filters?: ReactNode;
  /** Rarely used filters, shown in a "More filters" popover. */
  more?: ReactNode;
  /** Two-column "More filters" panel. Defaults to on when `more` holds 3 or more fields. */
  moreColumns?: boolean;
  /** How many filters inside `more` are active (shown on the button). */
  moreActiveCount?: number;
  /** Active filters as removable chips. */
  chips?: FilterChip[];
  onClearAll?: () => void;
  /** e.g. "128 sales". Announced politely when it changes. */
  resultLabel?: ReactNode;
  /** Right-aligned extras (view toggle, export). */
  trailing?: ReactNode;
  className?: string;
};

/** One row: search that grows, a few filters, "More filters", then chips and a result count. */
/** Counts the fields passed to `more`, looking through fragments. */
function countFields(node: ReactNode): number {
  return Children.toArray(node).reduce<number>((n, child) => {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) return n + countFields(child.props.children);
    return n + 1;
  }, 0);
}

export function FilterBar({ search, filters, more, moreColumns, moreActiveCount = 0, chips = [], onClearAll, resultLabel, trailing, className }: Readonly<FilterBarProps>) {
  const wide = more ? (moreColumns ?? countFields(more) >= 3) : false;
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {search && (
          <label className="relative min-w-48 flex-1 basis-56">
            <span className="sr-only">{search.label ?? search.placeholder ?? 'Search'}</span>
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? 'Search'}
              className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-9 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
            />
          </label>
        )}
        {filters}
        {more && (
          <Popover.Root>
            <Popover.Trigger className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring data-[popup-open]:bg-muted">
              <SlidersHorizontal size={14} className="text-muted-foreground" aria-hidden />
              More filters
              {moreActiveCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">{moreActiveCount}</span>
              )}
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner align="end" sideOffset={6} collisionPadding={16} className="z-50">
                <Popover.Popup
                  className={cn(
                    'max-h-[min(75vh,var(--available-height))] overflow-y-auto rounded-xl bg-popover p-4 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none',
                    wide ? 'w-[min(42rem,calc(100vw-2rem))]' : 'w-[min(20rem,calc(100vw-2rem))]',
                  )}
                >
                  <Popover.Title className="text-sm font-semibold">More filters</Popover.Title>
                  {/* Wide panels lay fields out in two columns from sm up, so long lists sit side by side
                      instead of stacking past the bottom of the screen. */}
                  <div className={cn('mt-3', wide ? 'grid gap-x-5 gap-y-4 sm:grid-cols-2 [&>*]:min-w-0' : 'space-y-3')}>{more}</div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        )}
        {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
      </div>
      {(chips.length > 0 || resultLabel) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {resultLabel && <span aria-live="polite" className="mr-1 text-muted-foreground">{resultLabel}</span>}
          {chips.map((c) => (
            <span key={c.key} className="inline-flex h-6 items-center gap-1 rounded-full border bg-muted/50 pr-1 pl-2.5 font-medium">
              {c.label}
              <button type="button" onClick={c.onRemove} aria-label={`Remove filter: ${c.label}`} className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                <X size={12} aria-hidden />
              </button>
            </span>
          ))}
          {chips.length > 0 && onClearAll && (
            <button type="button" onClick={onClearAll} className="ml-1 font-medium text-primary hover:underline">
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** A labelled field for use inside FilterBar's `more` popover. */
export function MoreFilterField({ label, children, htmlFor }: Readonly<{ label: string; children: ReactNode; htmlFor?: string }>) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
