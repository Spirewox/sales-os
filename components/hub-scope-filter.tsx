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
      className={`inline-flex items-center rounded px-1 py-0 text-[9px] font-bold uppercase tracking-wide leading-4 ${
        isRsp
          ? 'bg-amber-100 text-amber-800'
          : 'bg-cyan-100 text-cyan-800'
      } ${className}`.trim()}
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
        className={`inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground ${className}`}
      >
        <MapPin size={12} className="text-primary" />
        {hubName}
        {lockedType && <LocationTypeTag locationType={lockedType} />}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-1 ${className}`}
    >
      <button
        type="button"
        onClick={() => setFilterHub('All')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
          filterHub === 'All'
            ? 'bg-background shadow-sm text-primary'
            : 'text-muted-foreground hover:bg-background/50'
        }`}
      >
        <Layers size={12} />
        All Hubs
      </button>
      {hubOptionsDetailed.map((hub) => (
        <button
          key={hub.id}
          type="button"
          onClick={() => setFilterHub(hub.name)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            filterHub === hub.name
              ? 'bg-background shadow-sm text-primary'
              : 'text-muted-foreground hover:bg-background/50'
          }`}
        >
          <MapPin size={12} />
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
        <MapPin size={14} className="text-primary" />
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
      icon={<MapPin size={14} className="text-primary" />}
      options={[
        { value: 'All', label: 'All Hubs' },
        ...hubOptionsDetailed.map((hub) => ({ value: hub.name, label: hubOptionLabel(hub) })),
      ]}
    />
  );
}
