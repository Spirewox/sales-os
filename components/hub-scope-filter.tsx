'use client';

import { Layers, MapPin } from 'lucide-react';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import type { LocationType } from '@/types';
import { FilterSelect } from '@/components/filter-select';
import { hubOptionLabel } from '@/lib/api-mappers';

type HubScopeFilterProps = {
  scope: Pick<
    HubScopeFilter,
    | 'canSwitchHubs'
    | 'hubName'
    | 'filterHub'
    | 'setFilterHub'
    | 'hubOptions'
    | 'hubOptionsDetailed'
    | 'activeHubs'
  >;
  className?: string;
};

export function LocationTypeTag({
  locationType,
  className = '',
}: {
  locationType?: LocationType | string | null;
  className?: string;
}) {
  const isRsp = locationType === 'rsp';
  return (
    <span
      className={`inline-flex items-center rounded-full border bg-muted px-1.5 text-xs font-medium leading-4 text-muted-foreground ${className}`.trim()}
    >
      {isRsp ? 'RSP' : 'Hub'}
    </span>
  );
}

function resolveLocationType(
  hubName: string,
  activeHubs: HubScopeFilter['activeHubs'],
): LocationType | undefined {
  return activeHubs.find((h) => h.name === hubName)?.locationType;
}

/** Hub tabs for company_admin, or read-only badge for hub/assigned roles. */
export function HubScopeFilterBar({ scope, className = '' }: HubScopeFilterProps) {
  const {
    canSwitchHubs,
    hubName,
    filterHub,
    setFilterHub,
    hubOptionsDetailed,
    activeHubs,
  } = scope;

  if (!canSwitchHubs) {
    if (!hubName) return null;
    const lockedType = resolveLocationType(hubName, activeHubs);
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground ${className}`}
      >
        <MapPin size={14} className="text-muted-foreground" aria-hidden />
        {hubName}
        {lockedType && <LocationTypeTag locationType={lockedType} />}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Location"
      className={`flex flex-wrap items-center gap-1 rounded-md border bg-muted/40 p-0.5 ${className}`}
    >
      <button
        type="button"
        aria-pressed={filterHub === 'All'}
        onClick={() => setFilterHub('All')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition-colors ${
          filterHub === 'All'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Layers size={14} aria-hidden />
        All permitted locations
      </button>
      {hubOptionsDetailed.map((hub) => (
        <button
          key={hub.id}
          type="button"
          aria-pressed={filterHub === hub.name}
          onClick={() => setFilterHub(hub.name)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition-colors ${
            filterHub === hub.name
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MapPin size={14} aria-hidden />
          {hub.name}
          <LocationTypeTag locationType={hub.locationType} />
        </button>
      ))}
    </div>
  );
}

/** Compact hub select for filter rows (sales page). */
export function HubScopeSelect({
  scope,
  className = '',
}: HubScopeFilterProps & { selectClassName?: string }) {
  const {
    canSwitchHubs,
    hubName,
    filterHub,
    setFilterHub,
    hubOptionsDetailed,
    activeHubs,
  } = scope;

  if (!canSwitchHubs) {
    if (!hubName) return null;
    const lockedType = resolveLocationType(hubName, activeHubs);
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-medium text-muted-foreground ${className}`}
      >
        <MapPin size={14} className="text-muted-foreground" aria-hidden />
        {hubName}
        {lockedType && <LocationTypeTag locationType={lockedType} />}
      </span>
    );
  }

  return (
    <FilterSelect
      ariaLabel="Hub"
      value={filterHub}
      onChange={setFilterHub}
      className={`w-fit ${className}`}
      icon={<MapPin size={14} className="text-muted-foreground" aria-hidden />}
      options={[
        { value: 'All', label: 'All permitted locations' },
        ...hubOptionsDetailed.map((hub) => ({ value: hub.name, label: hubOptionLabel(hub) })),
      ]}
    />
  );
}
