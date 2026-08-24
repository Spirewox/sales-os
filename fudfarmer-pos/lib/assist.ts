/**
 * Supervisor assist queue.
 *
 * A cashier raises a request without leaving the sell screen; a supervisor
 * picks it up and resolves it — usually by performing a real action (price
 * override, stock correction, cash drop, sync retry) rather than just advising.
 * Every request keeps who asked, who resolved, and what was changed.
 */

import { AssistRequest, IssueType, ResolutionKind } from './types';

export const openAssists = (a: AssistRequest[]) => a.filter((x) => x.status === 'open' || x.status === 'in_progress');
export const openCount = (a: AssistRequest[]) => openAssists(a).length;

export const assistsForShift = (a: AssistRequest[], shiftId?: string) =>
  shiftId ? a.filter((x) => x.shiftId === shiftId) : a;

/** Cash physically removed from a drawer — reduces what should be in it at close. */
export function cashDropsForShift(assists: AssistRequest[], shiftId: string): number {
  return assists
    .filter((a) => a.shiftId === shiftId && a.status === 'resolved' && a.action?.kind === 'cash_drop')
    .reduce((sum, a) => sum + (a.action?.amount || 0), 0);
}

export function cashDropsForDay(assists: AssistRequest[], day: string): number {
  return assists
    .filter((a) => a.status === 'resolved' && a.action?.kind === 'cash_drop' && a.createdAt.slice(0, 10) === day)
    .reduce((sum, a) => sum + (a.action?.amount || 0), 0);
}

/** How long a request has been waiting, in minutes. */
export const waitingMinutes = (a: AssistRequest, now = Date.now()) =>
  Math.max(0, Math.round((now - new Date(a.createdAt).getTime()) / 60000));

/** Which resolution actions make sense for a given issue — keeps the UI honest. */
export const SUGGESTED_ACTION: Record<IssueType, ResolutionKind> = {
  'Price override': 'price_override',
  'Discount approval': 'guidance',
  'Wrong item rung up': 'guidance',
  'Payment problem': 'guidance',
  'Customer complaint': 'guidance',
  'Stock looks wrong': 'stock_correction',
  'Cash drop': 'cash_drop',
  'Sync stuck': 'sync_retry',
  'Other': 'guidance',
};

export const ACTION_LABEL: Record<ResolutionKind, string> = {
  price_override: 'Override price',
  stock_correction: 'Correct stock',
  cash_drop: 'Record cash drop',
  sync_retry: 'Retry sync now',
  guidance: 'Resolve with a note',
};

export const newAssistId = (deviceId: string) => `as-${deviceId}-${Date.now().toString(36)}`;
