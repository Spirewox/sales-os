/** Mock answers for saved reports: one person's Explore queries kept by name, in memory until a reload. */
import type { SavedReport } from '@/lib/reports';

type Result = { status: number; data: unknown };
let seq = 0;

/** POST analytics/reports/saved: a name of 1 to 60 characters, unique for this person. */
export function saveReport(list: SavedReport[], body: Omit<SavedReport, 'id' | 'createdAt'>, now: string): Result {
  const name = (body.name ?? '').trim();
  if (!name || name.length > 60) return { status: 400, data: { message: 'Give the report a name of up to 60 characters.' } };
  if (list.some((r) => r.name.toLowerCase() === name.toLowerCase())) return { status: 409, data: { message: 'You already have a report with that name.' } };
  seq += 1;
  const saved: SavedReport = { ...body, name, id: `rep_${Date.now().toString(36)}${seq}`, createdAt: now };
  list.unshift(saved);
  return { status: 200, data: saved };
}

/** DELETE analytics/reports/saved/:id. */
export function deleteSavedReport(list: SavedReport[], id: string): Result {
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return { status: 404, data: { message: 'Report not found.' } };
  list.splice(i, 1);
  return { status: 200, data: { ok: true } };
}
