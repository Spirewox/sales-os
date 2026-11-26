/** Mock answers for saved reports: one person's Explore queries kept by name, in memory until a reload. */
import { MAX_REPORT_COLUMNS, type SavedReport } from '@/lib/reports';

type Result = { status: number; data: unknown };
let seq = 0;

type Body = Omit<SavedReport, 'id' | 'createdAt'>;

/** The name and columns checked, or the 400 or 409 to answer. `self` is the report being changed. */
function check(list: SavedReport[], body: Body, self?: string): Result | { name: string; measures: string[] } {
  const name = (body.name ?? '').trim();
  if (!name || name.length > 60) return { status: 400, data: { message: 'Give the report a name of up to 60 characters.' } };
  const measures = Array.isArray(body.measures) ? body.measures : body.measure ? [body.measure] : [];
  if (measures.length === 0 || measures.length > MAX_REPORT_COLUMNS) return { status: 400, data: { message: `Pick 1 to ${MAX_REPORT_COLUMNS} columns.` } };
  if (list.some((r) => r.id !== self && r.name.toLowerCase() === name.toLowerCase())) return { status: 409, data: { message: 'You already have a report with that name.' } };
  return { name, measures };
}

/** POST analytics/reports/saved: a name of 1 to 60 characters, unique for this person, and 1 to 8 columns. */
export function saveReport(list: SavedReport[], body: Body, now: string): Result {
  const ok = check(list, body);
  if ('status' in ok) return ok;
  seq += 1;
  const saved: SavedReport = { ...body, name: ok.name, measures: ok.measures, measure: ok.measures[0], id: `rep_${Date.now().toString(36)}${seq}`, createdAt: now };
  list.unshift(saved);
  return { status: 200, data: saved };
}

/** PUT analytics/reports/saved/:id: the same checks; the id and date stay. */
export function updateSavedReport(list: SavedReport[], id: string, body: Body): Result {
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return { status: 404, data: { message: 'Report not found.' } };
  const ok = check(list, body, id);
  if ('status' in ok) return ok;
  list[i] = { ...list[i], ...body, name: ok.name, measures: ok.measures, measure: ok.measures[0] };
  return { status: 200, data: list[i] };
}

/** DELETE analytics/reports/saved/:id. */
export function deleteSavedReport(list: SavedReport[], id: string): Result {
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return { status: 404, data: { message: 'Report not found.' } };
  list.splice(i, 1);
  return { status: 200, data: { ok: true } };
}
