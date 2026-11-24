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
export function LocationSelect({ scope, fixed, className }: Readonly<{
  scope: Pick<HubScopeFilter, 'canSwitchHubs' | 'hubName' | 'filterHub' | 'setFilterHub' | 'hubOptionsDetailed'>;
  /**
   * Show this label read-only instead of the picker, for a view that always covers a set span of
   * locations (Analytics, Locations covers all of them). The app-wide location is left as it is.
   */
  fixed?: { label: string; reason: string };
  className?: string;
}>) {
  if (fixed) return <ReadOnlyLocation label={fixed.label} reason={fixed.reason} className={className} />;
  if (!scope.canSwitchHubs) {
    if (!scope.hubName) return null;
    return <ReadOnlyLocation label={scope.hubName} className={className} />;
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

function ReadOnlyLocation({ label, reason, className }: Readonly<{ label: string; reason?: string; className?: string }>) {
  return (
    <span
      title={reason}
      className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border bg-muted/50 px-3 text-sm font-medium text-muted-foreground', className)}
    >
      <MapPin size={14} aria-hidden />
      {label}
      {reason && <span className="sr-only">. {reason}</span>}
    </span>
  );
}
