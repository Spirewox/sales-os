'use client';

import { useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { CalendarDays, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lagosDay } from '@/lib/period';
import { FilterSelect } from '@/components/filter-select';
import { Calendar, formatDay, type DayString } from './calendar';

type DateFieldProps = {
  /** Connects to a <label htmlFor>. */
  id?: string;
  /** YYYY-MM-DD, or '' for none. */
  value: string;
  onChange: (value: string) => void;
  min?: DayString;
  max?: DayString;
  placeholder?: string;
  /** Show a clear (×) button when a date is set. */
  clearable?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
};

/** Form date input that opens the app calendar instead of the browser's own picker. */
export function DateField({ id, value, onChange, min, max, placeholder = 'Choose a date', clearable, invalid, disabled, className, ...rest }: Readonly<DateFieldProps>) {
  const [open, setOpen] = useState(false);
  const today = lagosDay();
  const todayAllowed = (!min || today >= min) && (!max || today <= max);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className={cn('relative', className)}>
        <Popover.Trigger
          id={id}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={rest['aria-describedby']}
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60 aria-invalid:border-destructive data-[popup-open]:border-primary/60',
            clearable && value && 'pr-9',
          )}
        >
          <CalendarDays size={16} className="shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn('flex-1 truncate tabular-nums', !value && 'text-muted-foreground')}>{value ? formatDay(value, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : placeholder}</span>
        </Popover.Trigger>
        {clearable && value && !disabled && (
          <button type="button" onClick={() => onChange('')} aria-label="Clear date" className="absolute top-1/2 right-1.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
            <X size={14} aria-hidden />
          </button>
        )}
      </div>
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={6} className="z-[60]">
          <Popover.Popup className="rounded-xl bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none">
            <Calendar
              value={value || null}
              min={min}
              max={max}
              onChange={(d) => {
                onChange(d);
                setOpen(false);
              }}
            />
            <div className="mt-2 flex items-center justify-between border-t pt-2">
              {clearable && value ? (
                <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="h-8 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Clear</button>
              ) : <span />}
              <button
                type="button"
                disabled={!todayAllowed}
                onClick={() => { onChange(today); setOpen(false); }}
                className="h-8 rounded-md px-2 text-sm font-medium text-primary hover:bg-accent disabled:opacity-40"
              >
                Today
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
/** Quarter-hour slots from 06:00 to 23:45, plus the current value if it falls between slots. */
function timeOptions(current: string) {
  const out: { value: string; label: string }[] = [];
  for (let h = 6; h < 24; h++) for (const m of [0, 15, 30, 45]) out.push({ value: `${pad(h)}:${pad(m)}`, label: timeLabel(`${pad(h)}:${pad(m)}`) });
  if (current && !out.some((o) => o.value === current)) out.push({ value: current, label: timeLabel(current) });
  return out.sort((a, b) => a.value.localeCompare(b.value));
}
function timeLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'am' : 'pm'}`;
}

/**
 * Date plus time of day, for due times. Value is the same "YYYY-MM-DDTHH:mm" string a
 * datetime-local input produced, so existing parsing keeps working.
 */
export function DateTimeField({ id, value, onChange, min, placeholder = 'Choose a date', invalid }: Readonly<{ id?: string; value: string; onChange: (v: string) => void; min?: DayString; placeholder?: string; invalid?: boolean }>) {
  const date = value ? value.slice(0, 10) : '';
  const time = value && value.length >= 16 ? value.slice(11, 16) : '';
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <DateField id={id} value={date} min={min} placeholder={placeholder} invalid={invalid} onChange={(d) => onChange(d ? `${d}T${time || '12:00'}` : '')} />
      <FilterSelect
        ariaLabel="Time"
        value={time || '12:00'}
        onChange={(t) => onChange(`${date || lagosDay()}T${t}`)}
        className="h-9 w-32 data-[size=default]:h-9"
        icon={<Clock size={14} className="text-muted-foreground" aria-hidden />}
        options={timeOptions(time)}
      />
    </div>
  );
}
