'use client';

import { useMemo } from 'react';
import { useCreditSummary, useInventory } from '@/hooks/use-queries';
import type { DashboardMetricsData } from '@/types/api';
import type { CreditCustomerSummary } from '@/types/credits';
import type { InventoryItem } from '@/types';

export type OverdueRow = CreditCustomerSummary & { overdue: number; phoneNumber?: string };
export type StockRow = InventoryItem & { out: boolean };
export type TicketRow = { id: string; kind: 'Feedback' | 'Enquiry'; who: string; summary: string; date: string; detail?: string };

/**
 * The lists behind "Needs attention" and the Owed / Stock alerts KPIs, so the numbers and the rows
 * come from the same data. Credit and stock follow the selected location; tickets have no location.
 */
export function useAttentionData(metrics: DashboardMetricsData | undefined, hubId: string | undefined) {
  const { data: credits, isPending: creditsLoading } = useCreditSummary(hubId ? { hub_id: hubId } : undefined);
  const { data: inventory, isPending: stockLoading } = useInventory(hubId ? { hub_id: hubId } : undefined);

  return useMemo(() => {
    const phones = new Map((metrics?.customers ?? []).map((c) => [c.id, c.phone]));
    const summaries = credits ?? [];
    const owed = summaries.reduce((s, c) => s + c.totalOutstanding, 0);
    const overdue: OverdueRow[] = summaries
      .filter((c) => c.overdueCount > 0)
      .map((c) => ({ ...c, overdue: c.overdueAmount ?? c.totalOutstanding, phoneNumber: c.phone || phones.get(c.customerId) || undefined }))
      .sort((a, b) => b.overdue - a.overdue);
    const overdueAmount = overdue.reduce((s, c) => s + c.overdue, 0);

    const items = inventory ?? [];
    const out = items.filter((i) => i.currentStock <= 0);
    const low = items
      .filter((i) => i.currentStock > 0 && i.currentStock <= i.minStockLevel)
      .sort((a, b) => a.currentStock / Math.max(1, a.minStockLevel) - b.currentStock / Math.max(1, b.minStockLevel));
    const stock: StockRow[] = [...out.map((i) => ({ ...i, out: true })), ...low.map((i) => ({ ...i, out: false }))];

    const tickets: TicketRow[] = [
      ...(metrics?.feedbacks ?? []).filter((f) => f.status === 'Open').map((f) => ({
        id: `f-${f.id}`, kind: 'Feedback' as const, who: f.customerName, summary: f.content, date: f.date, detail: [f.type, f.priority].filter(Boolean).join(', '),
      })),
      ...(metrics?.enquiries ?? []).filter((e) => e.status === 'Open').map((e) => ({
        id: `e-${e.id}`, kind: 'Enquiry' as const, who: e.customerName, summary: e.subject, date: e.date, detail: e.category,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return {
      owed, overdue, overdueAmount, stock, tickets,
      // Full lists for the Stock and Credit book panels.
      items, summaries,
      outOfStock: out.length, lowStock: low.length,
      creditsLoading, stockLoading,
    };
  }, [metrics, credits, inventory, creditsLoading, stockLoading]);
}

export type AttentionData = ReturnType<typeof useAttentionData>;
