'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lagosDay } from '@/lib/period';

/** Dates are plain YYYY-MM-DD strings throughout; "today" is today in Lagos. */
export type DayString = string;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parts(d: DayString): [number, number, number] {
  const [y, m, day] = d.split('-').map(Number);
  return [y, m, day];
}
function toDay(y: number, m: number, d: number): DayString {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.toISOString().slice(0, 10);
}
export function addDays(d: DayString, n: number): DayString {
  const [y, m, day] = parts(d);
  return toDay(y, m, day + n);
}
function addMonths(d: DayString, n: number): DayString {
  const [y, m, day] = parts(d);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  return toDay(y, m + n, Math.min(day, last));
}
/** Monday = 0 … Sunday = 6 */
function weekday(d: DayString): number {
  const [y, m, day] = parts(d);
  return (new Date(Date.UTC(y, m - 1, day)).getUTCDay() + 6) % 7;
}
export function formatDay(d: DayString | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!d) return '';
  const [y, m, day] = parts(d);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });
}
const monthTitle = (d: DayString) => formatDay(d, { month: 'long', year: 'numeric' });
const fullLabel = (d: DayString) => formatDay(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

type Common = {
  min?: DayString;
  max?: DayString;
  /** Month shown first when nothing is selected. */
  defaultMonth?: DayString;
  className?: string;
};
type SingleProps = Common & { mode?: 'single'; value: DayString | null; onChange: (d: DayString) => void };
type RangeProps = Common & { mode: 'range'; value: { from: DayString | null; to: DayString | null }; onChange: (r: { from: DayString | null; to: DayString | null }) => void };

/**
 * Month calendar in the app's style: green for the chosen day, a soft green band for a range,
 * an outlined green "today" (Lagos). Keyboard: arrows move a day/week, PageUp/PageDown a month,
 * Home/End the week, Enter or Space picks.
 */
export function Calendar(props: Readonly<SingleProps | RangeProps>) {
  const today = lagosDay();
  const { min, max, className } = props;
  // Ranges open on the end month: periods are usually recent, so the latest days matter most.
  const anchor =
    props.mode === 'range' ? props.value.to ?? props.value.from : props.value;
  const [month, setMonth] = useState<DayString>(() => (anchor ?? props.defaultMonth ?? today).slice(0, 8) + '01');
  const [focusDay, setFocusDay] = useState<DayString>(anchor ?? props.defaultMonth ?? today);
  const [hover, setHover] = useState<DayString | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    const start = addDays(month, -weekday(month));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const disabled = (d: DayString) => (!!min && d < min) || (!!max && d > max);
  const inMonth = (d: DayString) => d.slice(0, 7) === month.slice(0, 7);

  // Range state, including a hover preview after the first click.
  const range = props.mode === 'range' ? props.value : null;
  const rFrom = range?.from ?? null;
  const rTo = range?.to ?? (range?.from && hover ? hover : null);
  const [lo, hi] = rFrom && rTo ? (rFrom <= rTo ? [rFrom, rTo] : [rTo, rFrom]) : [rFrom, rFrom];

  const isSelected = (d: DayString) => (range ? d === lo || d === hi : d === props.value);
  const inBand = (d: DayString) => !!range && !!lo && !!hi && d > lo && d < hi;

  const pick = (d: DayString) => {
    if (disabled(d)) return;
    setFocusDay(d);
    if (!inMonth(d)) setMonth(d.slice(0, 8) + '01');
    if (props.mode === 'range') {
      const { from, to } = props.value;
      if (!from || (from && to)) props.onChange({ from: d, to: null });
      else props.onChange(d < from ? { from: d, to: from } : { from, to: d });
    } else {
      props.onChange(d);
    }
  };

  const move = (next: DayString) => {
    setFocusDay(next);
    if (!inMonth(next)) setMonth(next.slice(0, 8) + '01');
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus());
  };

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, () => DayString> = {
      ArrowLeft: () => addDays(focusDay, -1),
      ArrowRight: () => addDays(focusDay, 1),
      ArrowUp: () => addDays(focusDay, -7),
      ArrowDown: () => addDays(focusDay, 7),
      PageUp: () => addMonths(focusDay, -1),
      PageDown: () => addMonths(focusDay, 1),
      Home: () => addDays(focusDay, -weekday(focusDay)),
      End: () => addDays(focusDay, 6 - weekday(focusDay)),
    };
    if (map[e.key]) {
      e.preventDefault();
      move(map[e.key]());
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(focusDay);
    }
  };

  const prevDisabled = !!min && addDays(month, -1) < min;
  const nextDisabled = !!max && addMonths(month, 1) > max;
  const navBtn = 'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-ring';

  return (
    <div className={cn('w-[17.5rem] select-none', className)}>
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <button type="button" className={navBtn} aria-label="Previous month" disabled={prevDisabled} onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft size={16} aria-hidden />
        </button>
        <p className="text-sm font-semibold" aria-live="polite">{monthTitle(month)}</p>
        <button type="button" className={navBtn} aria-label="Next month" disabled={nextDisabled} onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>

      <div role="grid" aria-label={monthTitle(month)} ref={gridRef} onKeyDown={onKey} onMouseLeave={() => setHover(null)}>
        <div role="row" className="grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <span key={w} role="columnheader" aria-label={w} className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground">
              {w.slice(0, 2)}
            </span>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, row) => (
          <div role="row" key={row} className="grid grid-cols-7">
            {days.slice(row * 7, row * 7 + 7).map((d) => {
              const sel = isSelected(d);
              const band = inBand(d);
              const isToday = d === today;
              const off = disabled(d);
              const outside = !inMonth(d);
              // The band runs edge to edge between the two ends; ends get a half band behind them.
              const bandBg =
                range && lo && hi && lo !== hi
                  ? band
                    ? 'bg-accent'
                    : d === lo
                      ? 'bg-[linear-gradient(to_right,transparent_50%,var(--accent)_50%)]'
                      : d === hi
                        ? 'bg-[linear-gradient(to_left,transparent_50%,var(--accent)_50%)]'
                        : ''
                  : '';
              return (
                <div role="gridcell" key={d} aria-selected={sel || band || undefined} className={cn('flex h-9 items-center justify-center', bandBg)}>
                  <button
                    type="button"
                    data-day={d}
                    tabIndex={d === focusDay ? 0 : -1}
                    disabled={off}
                    aria-label={`${fullLabel(d)}${isToday ? ', today' : ''}`}
                    aria-current={isToday ? 'date' : undefined}
                    aria-pressed={sel}
                    onClick={() => pick(d)}
                    onMouseEnter={() => range && setHover(d)}
                    onFocus={() => setFocusDay(d)}
                    className={cn(
                      'inline-flex size-9 items-center justify-center rounded-md text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                      sel
                        ? 'bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90'
                        : band
                          ? 'text-accent-foreground hover:bg-primary/15'
                          : 'hover:bg-muted',
                      !sel && isToday && 'font-semibold text-primary ring-1 ring-inset ring-primary/60',
                      !sel && !isToday && outside && 'text-muted-foreground',
                      off && 'cursor-not-allowed text-muted-foreground/40 line-through decoration-muted-foreground/40 hover:bg-transparent',
                    )}
                  >
                    {Number(d.slice(8))}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
