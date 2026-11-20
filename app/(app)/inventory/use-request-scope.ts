'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDataScope } from '@/hooks/use-data-scope';
import { usePermissions } from '@/hooks/use-permissions';
import { useInventoryRequests } from '@/hooks/use-queries';
import type { ApiInventoryRequest } from '@/types/api';

type HubRef = ApiInventoryRequest['requesting_location'];

export function hubRefName(ref: HubRef) {
  return typeof ref === 'object' && ref ? ref.hub_name ?? '-' : '-';
}

export function hubRefId(ref: HubRef) {
  return typeof ref === 'object' && ref ? ref._id : String(ref);
}

export const isOpenRequest = (r: ApiInventoryRequest) => r.status === 'submitted' || r.status === 'approved';

/**
 * Inventory requests in the app location, plus who can act on each one.
 * Fulfilling side (approve, fulfil, reject): `inventory.fulfill_requests` and either company admin or
 * the fulfilling location's user. Requesting side (cancel): the requesting location's user.
 */
export function useRequestScope(filterHub: string) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { hubId: scopeHubId } = useDataScope();
  const query = useInventoryRequests();
  const canFulfill = can('inventory.fulfill_requests');

  const scoped = useMemo(() => {
    const all = query.data ?? [];
    if (filterHub === 'All') return all;
    return all.filter((r) => hubRefName(r.requesting_location) === filterHub || hubRefName(r.fulfilling_hub) === filterHub);
  }, [query.data, filterHub]);

  const isFulfillingHub = (req: ApiInventoryRequest) =>
    canFulfill && (user?.roleName === 'company_admin' || scopeHubId === hubRefId(req.fulfilling_hub));
  const isRequester = (req: ApiInventoryRequest) => hubRefId(req.requesting_location) === scopeHubId;
  const needsMyAction = (req: ApiInventoryRequest) => isOpenRequest(req) && isFulfillingHub(req);

  const pendingCount = scoped.filter(isOpenRequest).length;
  const needsActionCount = scoped.filter(needsMyAction).length;

  return { requests: scoped, isLoading: query.isLoading, isFulfillingHub, isRequester, needsMyAction, pendingCount, needsActionCount, scopeHubId };
}

export type RequestScope = ReturnType<typeof useRequestScope>;
