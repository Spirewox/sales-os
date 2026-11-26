/**
 * Mock answers for the product list and the archive and restore endpoints. Kept apart from
 * handler.ts, which reaches runtime enums in types.ts, so `npm test` can load it.
 */
import type { ApiInventoryRequest, ApiProduct } from '@/types/api';

const lc = (s?: string | null) => (s ?? '').toLowerCase();
const refId = (v: unknown) => (typeof v === 'string' ? v : (v as { _id?: string } | null)?._id);
const OPEN_REQUEST = new Set(['submitted', 'approved']);

/** GET inventory: `status` is active (default), archived or all, then the existing filters. */
export function filterProducts(products: ApiProduct[], q: URLSearchParams): ApiProduct[] {
  const status = q.get('status') ?? 'active';
  const search = lc(q.get('search') ?? q.get('q'));
  return products.filter((p) =>
    (status === 'all' || (status === 'archived' ? p.is_active === false : p.is_active !== false)) &&
    (!q.get('category') || p.category === q.get('category')) &&
    (!q.get('hub_id') || refId(p.hub) === q.get('hub_id')) &&
    (q.get('low_stock') !== 'true' || p.current_stock <= p.min_stock_level) &&
    (!search || lc(p.name).includes(search) || lc(p.sku).includes(search)));
}

type Result = { status: number; data: unknown };

/** PATCH inventory/:id/archive, as the API contract in the archiving plan describes it. */
export function archiveProduct(
  products: ApiProduct[], requests: ApiInventoryRequest[], id: string, user: { _id: string; full_name: string }, now: string,
): Result {
  const p = products.find((x) => x._id === id);
  if (!p) return { status: 404, data: { message: 'Product not found.' } };
  if (Math.abs(p.current_stock ?? 0) > 1e-6) return { status: 409, data: { message: 'Stock must be 0 before this product can be archived.' } };
  const open = requests.filter((r) => OPEN_REQUEST.has(r.status) && r.lines.some((l) => l.product_id === id)).length;
  if (open) return { status: 409, data: { message: `Close the ${open} open ${open === 1 ? 'request' : 'requests'} for this product first.` } };
  Object.assign(p, { is_active: false, archived_at: now, archived_by: user });
  return { status: 200, data: { message: 'OK', data: p } };
}

/** PATCH inventory/:id/restore. */
export function restoreProduct(products: ApiProduct[], id: string): Result {
  const p = products.find((x) => x._id === id);
  if (!p) return { status: 404, data: { message: 'Product not found.' } };
  p.is_active = true;
  delete p.archived_at;
  delete p.archived_by;
  return { status: 200, data: { message: 'OK', data: p } };
}
