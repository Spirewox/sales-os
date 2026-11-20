'use client';

import { MapPin } from 'lucide-react';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { FilterSelect } from '@/components/filter-select';
import { hubOptionLabel } from '@/lib/api-mappers';
import { cn } from '@/lib/utils';

export const ALL_LOCATIONS_LABEL = 'All locations';

/**
 * The one location control. Follows the app-wide location (sidebar) by default;
 * users limited to one location see it as a read-only label.
 */
export function LocationSelect({ scope, className }: Readonly<{ scope: Pick<HubScopeFilter, 'canSwitchHubs' | 'hubName' | 'filterHub' | 'setFilterHub' | 'hubOptionsDetailed'>; className?: string }>) {
  if (!scope.canSwitchHubs) {
    if (!scope.hubName) return null;
    return (
      <span className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border bg-muted/50 px-3 text-sm font-medium text-muted-foreground', className)}>
        <MapPin size={14} aria-hidden />
        {scope.hubName}
      </span>
    );
  }
  return (
    <FilterSelect
      ariaLabel="Location"
      value={scope.filterHub}
      onChange={scope.setFilterHub}
      className={cn('h-9 w-auto min-w-40 data-[size=default]:h-9', className)}
      icon={<MapPin size={14} className="text-muted-foreground" aria-hidden />}
      options={[{ value: 'All', label: ALL_LOCATIONS_LABEL }, ...scope.hubOptionsDetailed.map((h) => ({ value: h.name, label: hubOptionLabel(h) }))]}
    />
  );
}
