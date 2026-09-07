const MAX_PAGES = 1000;

/** Fetch every page of a paginated list API and concatenate items. */
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<{
    items: T[];
    totalPages: number;
  }>,
  pageSize: number,
): Promise<T[]> {
  const first = await fetchPage(1, pageSize);
  const all = [...first.items];
  if (first.items.length < pageSize) return all;

  const totalPages = Math.min(Math.max(1, first.totalPages), MAX_PAGES);

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchPage(page, pageSize);
    all.push(...next.items);
    if (next.items.length < pageSize) break;
  }

  return all;
}

export type ListPageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function metaFromPartial(
  meta: Partial<ListPageMeta> | undefined,
  itemCount: number,
  fallbackLimit: number,
): ListPageMeta | null {
  if (!meta || typeof meta !== 'object') return null;
  const limit = meta.limit ?? fallbackLimit;
  const total = meta.total ?? itemCount;
  const totalPages =
    meta.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)));
  return {
    page: meta.page ?? 1,
    limit,
    total,
    totalPages,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Extract pagination meta from common Nest list response shapes. */
export function readListMeta(
  raw: unknown,
  itemCount: number,
  fallbackLimit: number,
): ListPageMeta {
  const root = asRecord(raw);
  if (root) {
    const direct =
      metaFromPartial(root.meta as Partial<ListPageMeta> | undefined, itemCount, fallbackLimit) ??
      metaFromPartial(
        root.pagination as Partial<ListPageMeta> | undefined,
        itemCount,
        fallbackLimit,
      );
    if (direct) return direct;

    const nested = asRecord(root.data);
    if (nested) {
      const nestedMeta =
        metaFromPartial(
          nested.pagination as Partial<ListPageMeta> | undefined,
          itemCount,
          fallbackLimit,
        ) ??
        metaFromPartial(
          nested.meta as Partial<ListPageMeta> | undefined,
          itemCount,
          fallbackLimit,
        );
      if (nestedMeta) return nestedMeta;
    }
  }

  // No meta: keep paging until a short page (capped by fetchAllPages MAX_PAGES).
  return {
    page: 1,
    limit: fallbackLimit,
    total: itemCount,
    totalPages: itemCount < fallbackLimit ? 1 : MAX_PAGES,
  };
}
