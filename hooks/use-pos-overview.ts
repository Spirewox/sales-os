'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { axiosGet } from '@/lib/api';

export type PosLocation = {
  id: string;
  name: string;
  locationType: 'hub' | 'rsp';
  parentHubId: string | null;
  tillCount: number;
  registeredCount: number;
  netSales: number;
  transactions: number;
  refunds: number;
};
export type PosOverview = {
  dateFrom: string;
  dateTo: string;
  timeZone: string;
  currency: string;
  tillCount: number;
  registeredCount: number;
  netSales: number;
  transactions: number;
  refunds: number;
  locations: PosLocation[];
  payments: { method: string; netSales: number; transactions: number }[];
};

export function usePosOverview(filters: {
  hub_id?: string;
  date_from: string;
  date_to: string;
}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [
      'pos-overview',
      user?.id,
      user?.visibleHubIds,
      user?.permissions,
      filters,
    ],
    enabled:
      Boolean(user?.permissions.includes('view_pos')) &&
      Boolean(filters.date_from && filters.date_to) &&
      filters.date_from <= filters.date_to,
    refetchInterval: 60_000,
    queryFn: async () => {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });
      const response = (await axiosGet(`pos/overview?${query}`, true)) as {
        data: PosOverview;
      };
      return response.data;
    },
  });
}
