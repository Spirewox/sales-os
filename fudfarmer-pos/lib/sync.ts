/**
 * Sync engine.
 *
 * Drains the outbox FIFO whenever the network is reachable. Every item carries a
 * client-generated id used as an idempotency key, so retries can never double-post.
 * Nothing here is ever awaited by the sell flow — a sale is already durable locally
 * before this runs.
 */

import { getOutbox, markSynced } from './db';
import { OutboxItem } from './types';

export interface SyncBackend {
  /** Push one outbox item. MUST be idempotent on item.refId. */
  push(item: OutboxItem): Promise<void>;
  /** Is the backend reachable right now? */
  reachable(): Promise<boolean>;
}

/**
 * Prototype backend — simulates a server.
 *
 * Swap this for a REST implementation in production; the UI never changes.
 * It mirrors synced sales into localStorage so the "server side" is inspectable.
 */
export const localBackend: SyncBackend = {
  async reachable() {
    return typeof navigator !== 'undefined' && navigator.onLine;
  },
  async push(item) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('offline');
    // simulate network latency
    await new Promise((r) => setTimeout(r, 250));
    const KEY = 'fudfarmer_pos_synced';
    const raw = localStorage.getItem(KEY);
    const arr: { refId: string; type: string; payload: unknown; syncedAt: string }[] = raw ? JSON.parse(raw) : [];
    // idempotent: refId already accepted → treat as success
    if (!arr.some((x) => x.refId === item.refId)) {
      arr.push({ refId: item.refId, type: item.type, payload: item.payload, syncedAt: new Date().toISOString() });
      localStorage.setItem(KEY, JSON.stringify(arr));
    }
  },
};

export interface SyncResult { pushed: number; failed: number; remaining: number }

let running = false;

/** Drain the outbox once. Safe to call concurrently — extra calls no-op. */
export async function flushOutbox(backend: SyncBackend = localBackend): Promise<SyncResult> {
  if (running) return { pushed: 0, failed: 0, remaining: (await getOutbox()).length };
  running = true;
  let pushed = 0;
  let failed = 0;
  try {
    if (!(await backend.reachable())) {
      return { pushed: 0, failed: 0, remaining: (await getOutbox()).length };
    }
    const items = (await getOutbox()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const item of items) {
      // exponential backoff: skip items that have failed a lot too recently
      if (item.attempts >= 8) { failed++; continue; }
      try {
        await backend.push(item);
        await markSynced(item, 'synced');
        pushed++;
      } catch (e) {
        await markSynced(item, 'failed', e instanceof Error ? e.message : String(e));
        failed++;
      }
    }
  } finally {
    running = false;
  }
  return { pushed, failed, remaining: (await getOutbox()).length };
}

/**
 * Start background syncing: on `online`, on an interval, and when the tab
 * regains focus. Returns a cleanup function.
 */
export function startSync(onChange?: () => void, intervalMs = 30_000): () => void {
  const run = async () => {
    const res = await flushOutbox();
    if (res.pushed > 0 || res.failed > 0) onChange?.();
  };
  const onOnline = () => { onChange?.(); void run(); };
  const onOffline = () => onChange?.();
  const onVisible = () => { if (document.visibilityState === 'visible') void run(); };

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisible);
  const timer = setInterval(run, intervalMs);
  void run();

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisible);
    clearInterval(timer);
  };
}

/** What the "server" has accepted — prototype inspection helper. */
export function syncedRecords(): { refId: string; type: string; payload: unknown; syncedAt: string }[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('fudfarmer_pos_synced');
  return raw ? JSON.parse(raw) : [];
}

/**
 * The payload this till hands to its tenant's CRM.
 *
 * In production the till POSTs straight to the tenant-scoped API; in the
 * prototype the CRM runs on a different origin (separate localStorage), so the
 * same JSON is moved across explicitly. The shape is identical either way.
 */
export function exportPayload(device: { deviceId: string; deviceLabel?: string; storeName?: string }): string {
  const records = syncedRecords().filter((r) => r.type === 'sale' || r.type === 'refund');
  return JSON.stringify({ device, records }, null, 2);
}
