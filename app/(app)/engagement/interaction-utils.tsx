'use client';

import { useEffect, useRef } from 'react';
import { StatusBadge, type Tone } from '@/components/app';
import { useUrlState } from '@/hooks/use-url-state';
import { type Compensation, FeedbackPriority } from '@/types';

export type InteractionView = 'feedback' | 'enquiries' | 'compensations';

export const ENQUIRY_CATEGORIES = ['Product Info', 'Pricing', 'Support', 'Delivery', 'Other'] as const;

/** Link that opens the Log feedback form, optionally with the customer chosen. */
export const logFeedbackHref = (customerId?: string) =>
  `/engagement?tab=interactions&new=feedback${customerId ? `&customer=${encodeURIComponent(customerId)}` : ''}`;

export function calcResolutionDays(dateStr: string, resolvedStr: string): number {
  const d1 = new Date(dateStr);
  const d2 = new Date(resolvedStr);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

export const matchesText = (q: string, ...fields: (string | undefined)[]) => {
  const needle = q.trim().toLowerCase();
  return !needle || fields.some((f) => f?.toLowerCase().includes(needle));
};

const PRIORITY_TONE: Record<FeedbackPriority, Tone> = {
  [FeedbackPriority.LOW]: 'neutral',
  [FeedbackPriority.MEDIUM]: 'neutral',
  [FeedbackPriority.HIGH]: 'warning',
  [FeedbackPriority.URGENT]: 'danger',
};

export function PriorityBadge({ priority }: Readonly<{ priority?: FeedbackPriority }>) {
  if (!priority) return <span className="text-muted-foreground">-</span>;
  return <StatusBadge tone={PRIORITY_TONE[priority]}>{priority}</StatusBadge>;
}

export function CompensationStatusBadge({ status }: Readonly<{ status: Compensation['status'] }>) {
  // "Paid" lives in the payment vocabulary; Pending and Approved are work states.
  return status === 'Paid' ? <StatusBadge domain="payment" status="Paid" /> : <StatusBadge domain="work" status={status} />;
}

/**
 * `/engagement?tab=interactions&new=feedback[&customer=<id>]` opens the feedback form once on
 * mount, then drops both params so a refresh does not reopen it.
 */
export function useFeedbackDeepLink(open: (customerId: string | null) => void) {
  // Read through the router (not window.location) so a client navigation is seen even before
  // the browser URL updates, and clear the params through the router too.
  const { get, set } = useUrlState();
  const isNew = get('new') === 'feedback';
  const customerId = get('customer');
  const handled = useRef(false);
  useEffect(() => {
    if (!isNew) { handled.current = false; return; }
    if (handled.current) return;
    handled.current = true;
    open(customerId);
    set({ new: null, customer: null });
  }, [isNew, customerId, open, set]);
}
