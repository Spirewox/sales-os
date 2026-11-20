'use client';

import { useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERIOD_PRESETS, lagosDay, periodLabel, type Period, type PeriodPreset } from '@/lib/period';

const field = 'h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring';

/** One period control: presets plus a custom range, in one popover. */
export function PeriodSelect({ value, onChange, className, allowAll = true, presets: only, allowCustom = true }: Readonly<{ value: Period; onChange: (p: Period) => void; className?: string; allowAll?: boolean; /** Limit the preset list, e.g. ['today', '7d', '30d']. */ presets?: PeriodPreset[]; allowCustom?: boolean }>) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(value.from ?? '');
  const [to, setTo] = useState(value.to ?? lagosDay());
  const presets = PERIOD_PRESETS.filter((p) => (allowAll || p.id !== 'all') && (!only || only.includes(p.id)));
  const validRange = !!from && !!to && from <= to;

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (o) { setFrom(value.from ?? ''); setTo(value.to ?? lagosDay()); } }}>
      <Popover.Trigger
        aria-label={`Period: ${periodLabel(value)}`}
        className={cn('inline-flex h-9 shrink-0 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring data-[popup-open]:bg-muted', className)}
      >
        <CalendarDays size={14} className="text-muted-foreground" aria-hidden />
        <span className="truncate">{periodLabel(value)}</span>
        <ChevronDown size={14} className="text-muted-foreground" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={4} className="z-50">
          <Popover.Popup className="w-64 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
            <div role="listbox" aria-label="Period presets">
              {presets.map((p) => {
                const selected = value.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => { onChange({ preset: p.id }); setOpen(false); }}
                    className={cn('flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none', selected && 'font-semibold text-primary')}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {allowCustom && (
            <form
              className="mt-1 space-y-2 border-t p-2"
              onSubmit={(e) => { e.preventDefault(); if (validRange) { onChange({ preset: 'custom', from, to }); setOpen(false); } }}
            >
              <p className="text-xs font-medium text-muted-foreground">Custom range</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-xs text-muted-foreground">
                  From
                  <input type="date" className={field} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  To
                  <input type="date" className={field} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                </label>
              </div>
              <button type="submit" disabled={!validRange} className="h-8 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                Apply range
              </button>
            </form>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
