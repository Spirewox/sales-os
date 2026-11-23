'use client';

import type { ReactNode } from 'react';
import { ConfirmDialog as KitConfirmDialog } from '@/components/app/confirm-dialog';
import { OverflowMenu, type OverflowItem } from '@/components/app';
import {
  getConfirmActionLabel,
  getConfirmActionMessage,
  getConfirmActionTitle,
  type ConfirmActionType,
} from '@/lib/settings-helpers';

export const btnPrimary = 'inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 [&_svg]:size-4';
export const btnSecondary = 'inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50 [&_svg]:size-4';

const EMPTY_LIST: never[] = [];
/** Guard against malformed responses: anything that isn't a list becomes an empty one. */
export function asList<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : EMPTY_LIST;
}

/** Row `⋯` menu that keeps its slot when it has nothing to show, so row buttons stay aligned. */
export function RowMenu({ label, items }: Readonly<{ label: string; items: OverflowItem[] }>) {
  if (!items.some((i) => !i.hidden)) return <span aria-hidden className="hidden size-8 md:inline-block" />;
  return <OverflowMenu size="sm" label={label} items={items} />;
}

/** Title, one line of description and an optional action, above a section's content. */
export function SectionHeading({ id, title, description, action }: Readonly<{ id?: string; title: string; description?: ReactNode; action?: ReactNode }>) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export { UnsavedBar } from '@/components/app/unsaved-bar';

/** Settings' confirmation: the shared ConfirmDialog with wording from settings-helpers. */
export function ConfirmDialog({ type, onCancel, onConfirm, busy }: Readonly<{ type: ConfirmActionType; onCancel: () => void; onConfirm: () => void; busy?: boolean }>) {
  return (
    <KitConfirmDialog
      title={getConfirmActionTitle(type)}
      message={getConfirmActionMessage(type)}
      confirmLabel={getConfirmActionLabel(type)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      busy={busy}
    />
  );
}
