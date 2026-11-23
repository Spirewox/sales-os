'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';
import { useUrlState } from '@/hooks/use-url-state';
import { FilterSelect } from '@/components/filter-select';

export type SectionTab<T extends string = string> = {
  id: T;
  label: string;
  /** Shown as a badge, e.g. pending requests. Hidden when 0 or undefined. */
  count?: number;
  /** Count shown in warning colour (needs action). */
  countTone?: 'neutral' | 'warning' | 'danger';
  hidden?: boolean;
};

type BaseProps<T extends string> = {
  tabs: SectionTab<T>[];
  label: string;
  className?: string;
  /** Keep the tab bar on phones instead of switching to a select (for 2 to 3 short tabs). */
  inlineOnMobile?: boolean;
};

type ControlledProps<T extends string> = BaseProps<T> & { value: T; onChange: (id: T) => void; param?: never; defaultTab?: never };
type UrlProps<T extends string> = BaseProps<T> & { param?: string; defaultTab: T; value?: never; onChange?: never };

/** Read the active tab from the URL (`?tab=`), falling back to `defaultTab` for unknown values. */
export function useSectionTab<T extends string>(tabs: SectionTab<T>[], defaultTab: T, param = 'tab'): T {
  const { get } = useUrlState();
  const requested = get(param) as T | null;
  const visible = tabs.filter((t) => !t.hidden);
  return requested && visible.some((t) => t.id === requested) ? requested : defaultTab;
}

const COUNT_TONE = {
  neutral: 'bg-muted text-muted-foreground',
  // A light tint keeps amber text above 4.5:1 in light mode; the border carries the colour.
  warning: 'border border-warning/40 bg-warning/5 text-warning',
  danger: 'border border-destructive/30 bg-destructive/5 text-destructive',
};

/**
 * Underline tab bar below the page title. Synced to `?tab=` by default so tabs can be linked;
 * pass value/onChange for local tabs (inside drawers). Becomes a select on phones.
 */
export function SectionTabs<T extends string>(props: ControlledProps<T> | UrlProps<T>) {
  const { tabs, label, className, inlineOnMobile } = props;
  const { get, set } = useUrlState();
  const visible = tabs.filter((t) => !t.hidden);
  const id = useId();

  const param = 'param' in props && props.param ? props.param : 'tab';
  const isUrl = props.value === undefined;
  const current: T = isUrl
    ? (visible.some((t) => t.id === get(param)) ? (get(param) as T) : (props as UrlProps<T>).defaultTab)
    : (props.value as T);

  const select = (next: T) => {
    if (isUrl) set({ [param]: next === (props as UrlProps<T>).defaultTab ? null : next });
    else (props as ControlledProps<T>).onChange(next);
  };

  return (
    <div className={cn('border-b', className)}>
      {!inlineOnMobile && (
        <div className="pb-3 md:hidden">
          <FilterSelect
            id={`${id}-select`}
            ariaLabel={label}
            value={current}
            onChange={(v) => select(v as T)}
            options={visible.map((t) => ({ value: t.id, label: t.count ? `${t.label} (${t.count})` : t.label }))}
          />
        </div>
      )}
      <div role="tablist" aria-label={label} className={cn('-mb-px flex gap-1 overflow-x-auto', !inlineOnMobile && 'hidden md:flex')}>
        {visible.map((t) => {
          const active = t.id === current;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => select(t.id)}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                e.preventDefault();
                const i = visible.findIndex((v) => v.id === current);
                const n = visible[(i + (e.key === 'ArrowRight' ? 1 : -1) + visible.length) % visible.length];
                select(n.id);
                requestAnimationFrame(() => (e.currentTarget.parentElement?.querySelector<HTMLElement>('[aria-selected="true"]'))?.focus());
              }}
              className={cn(
                'inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              {t.label}
              {!!t.count && (
                <span className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums', COUNT_TONE[t.countTone ?? 'neutral'])}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
