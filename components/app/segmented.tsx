'use client';

import { cn } from '@/lib/utils';

/**
 * Selected option in any segmented or pill toggle: a green tint with a thin green outline.
 * Clearly marked, yet quieter than a solid primary button. Idle options stay muted text.
 * Same font weight in both states so switching never shifts the layout.
 */
export const SEGMENT_ACTIVE = 'bg-accent text-accent-foreground shadow-sm ring-1 ring-inset ring-primary/45';
export const SEGMENT_IDLE = 'text-muted-foreground hover:bg-background/70 hover:text-foreground';

/** Small single-choice toggle (2 to 5 short options) for switching a view in place. Hidden when there's only one option. */
export function Segmented<T extends string>({ value, onChange, options, label, className }: Readonly<{ value: T; onChange: (v: T) => void; options: readonly { id: T; label: string }[]; label: string; className?: string }>) {
  if (options.length < 2) return null;
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex shrink-0 items-center rounded-md border bg-muted/40 p-0.5', className)}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.id)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault();
              const i = options.findIndex((o) => o.id === value);
              const next = options[(i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length];
              onChange(next.id);
              requestAnimationFrame(() => e.currentTarget.parentElement?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
            }}
            className={cn(
              'h-8 rounded-[calc(var(--radius)-2px)] px-2.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              active ? SEGMENT_ACTIVE : SEGMENT_IDLE,
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
