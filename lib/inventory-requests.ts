import type { ApiInventoryRequest, InventoryRequestStatus } from '@/types/api';

export type HubRef = ApiInventoryRequest['requesting_location'];

/** The name of a request's location, or "-" when the API sent only an id. */
export function hubRefName(ref: HubRef) {
  return typeof ref === 'object' && ref ? ref.hub_name ?? '-' : '-';
}

export const REQUEST_STATUS_LABEL: Record<InventoryRequestStatus, string> = {
  draft: 'Draft', submitted: 'Pending', approved: 'Approved', fulfilled: 'Fulfilled', rejected: 'Rejected', cancelled: 'Closed',
};
