'use client';

import { useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERIOD_PRESETS, lagosDay, periodLabel, periodRange, type Period, type PeriodPreset } from '@/lib/period';
import { Calendar, formatDay } from './calendar';
import { SEGMENT_ACTIVE } from './segmented';

/**
 * One period control: quick presets on the left, a range calendar on the right.
 * Click a start day then an end day; Apply sets a custom range. Future days are disabled.
 */
export function PeriodSelect({ value, onChange, className, allowAll = true, presets: only, allowCustom = true }: Readonly<{ value: Period; onChange: (p: Period) => void; className?: string; allowAll?: boolean; /** Limit the preset list, e.g. ['today', '7d', '30d']. */ presets?: PeriodPreset[]; allowCustom?: boolean }>) {
  const [open, setOpen] = useState(false);
  const today = lagosDay();
  const current = periodRange(value);
  const [draft, setDraft] = useState<{ from: string | null; to: string | null }>({ from: current.from, to: current.to });
  const presets = PERIOD_PRESETS.filter((p) => (allowAll || p.id !== 'all') && (!only || only.includes(p.id)));
  const complete = !!draft.from && !!draft.to;
  const changed = complete && (draft.from !== current.from || draft.to !== current.to);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft({ from: current.from, to: current.to });
      }}
    >
      <Popover.Trigger
        aria-label={`Period: ${periodLabel(value)}`}
        className={cn('inline-flex h-9 shrink-0 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring data-[popup-open]:border-primary/60 data-[popup-open]:bg-muted', className)}
      >
        <CalendarDays size={14} className="text-muted-foreground" aria-hidden />
        <span className="truncate">{periodLabel(value)}</span>
        <ChevronDown size={14} className="text-muted-foreground" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={6} collisionPadding={12} className="z-50">
          <Popover.Popup className="max-h-[var(--available-height)] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none">
            <div className={cn('flex flex-col', allowCustom && 'sm:flex-row')}>
              <div role="listbox" aria-label="Quick periods" className={cn('flex flex-wrap gap-1 p-2', allowCustom ? 'border-b sm:w-40 sm:flex-col sm:flex-nowrap sm:border-r sm:border-b-0' : 'w-48 flex-col')}>
                {presets.map((p) => {
                  const selected = value.preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => { onChange({ preset: p.id }); setOpen(false); }}
                      className={cn('flex items-center rounded-md px-2.5 py-1.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring', selected ? SEGMENT_ACTIVE : 'hover:bg-muted', allowCustom && 'sm:w-full')}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {allowCustom && (
                <div className="p-3">
                  <Calendar mode="range" value={draft} max={today} onChange={setDraft} />
                  <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                    <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
                      {draft.from && !draft.to ? `${formatDay(draft.from, { day: 'numeric', month: 'short' })}, now pick an end date` : complete ? `${formatDay(draft.from, { day: 'numeric', month: 'short' })} to ${formatDay(draft.to, { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Pick a start date'}
                    </p>
                    <button
                      type="button"
                      disabled={!changed}
                      onClick={() => { if (draft.from && draft.to) { onChange({ preset: 'custom', from: draft.from, to: draft.to }); setOpen(false); } }}
                      className="h-8 shrink-0 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
