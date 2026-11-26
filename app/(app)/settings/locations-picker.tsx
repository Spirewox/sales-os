'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { hubOptionLabel } from '@/lib/api-mappers';
import { cn } from '@/lib/utils';
import type { Hub } from '@/types';

/**
 * The locations a user works at. Each hub is followed by its RSPs, indented. Locations the editor
 * cannot see, or that are inactive, stay listed when assigned, checked and locked, so a save keeps
 * them. `single` (a cashier) is handled by the caller with one select.
 */
export function LocationsPicker({ hubs, editableIds, value, onChange, idPrefix }: Readonly<{
  hubs: Hub[];
  editableIds: Set<string>;
  value: string[];
  onChange: (ids: string[]) => void;
  idPrefix: string;
}>) {
  const chosen = new Set(value);
  // Editable active locations, plus anything already assigned (so it is never dropped silently).
  const shown = hubs.filter((h) => (h.isActive && editableIds.has(h.id)) || chosen.has(h.id));
  const parents = shown.filter((h) => !h.parentHubId || !shown.some((p) => p.id === h.parentHubId));
  const ordered = parents.flatMap((p) => [p, ...shown.filter((c) => c.parentHubId === p.id)]);

  const toggle = (id: string, on: boolean) => onChange(on ? [...value, id] : value.filter((x) => x !== id));

  return (
    <ul className="max-h-64 space-y-1 overflow-y-auto overscroll-contain rounded-md border p-2" aria-label="Locations">
      {ordered.map((h) => {
        const locked = !h.isActive || !editableIds.has(h.id);
        const reason = !editableIds.has(h.id) ? 'Outside your locations' : !h.isActive ? 'Inactive' : null;
        const isChild = !!h.parentHubId && shown.some((p) => p.id === h.parentHubId);
        const inputId = `${idPrefix}-loc-${h.id}`;
        return (
          <li key={h.id} className={cn(isChild && 'pl-6')}>
            <label
              htmlFor={inputId}
              className={cn('flex min-h-9 items-center gap-2 rounded-md px-2 text-sm', locked ? 'text-muted-foreground' : 'cursor-pointer hover:bg-muted')}
            >
              <Checkbox id={inputId} checked={chosen.has(h.id)} disabled={locked} onCheckedChange={(on) => toggle(h.id, on === true)} />
              <span className="min-w-0 flex-1 truncate">{hubOptionLabel(h)}</span>
              {reason && <span className="shrink-0 text-xs">{reason}</span>}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
