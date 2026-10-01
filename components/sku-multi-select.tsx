'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';

export type SkuOption = {
  id: string;
  sku: string;
  name: string;
  location?: string;
};

type SkuMultiSelectProps = Readonly<{
  options: SkuOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}>;

type SkuGroup = {
  path: string;
  location?: string;
  items: Array<SkuOption & { productCode: string }>;
};

function groupSkus(options: SkuOption[], query: string): SkuGroup[] {
  const term = query.trim().toLowerCase();
  const map = new Map<string, SkuGroup>();
  for (const item of options) {
    const parts = item.sku.split('/').map((part) => part.trim()).filter(Boolean);
    const productCode = parts.length > 1 ? parts[parts.length - 1] : item.sku;
    const path = parts.length > 1 ? parts.slice(0, -1).join('/') : (item.location || 'Other');
    const haystack = `${item.sku} ${item.name} ${item.location ?? ''} ${path} ${productCode}`.toLowerCase();
    if (term && !haystack.includes(term)) continue;
    const group = map.get(path) ?? { path, location: item.location, items: [] };
    if (!group.location && item.location) group.location = item.location;
    if (group.location && item.location && group.location !== item.location) {
      group.location = undefined;
    }
    group.items.push({ ...item, productCode });
    map.set(path, group);
  }
  return [...map.values()]
    .map((group) => ({
      ...group,
      items: group.items.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => (a.location || a.path).localeCompare(b.location || b.path));
}

export function SkuMultiSelect({ options, selectedIds, onChange }: SkuMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openPaths, setOpenPaths] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const groups = useMemo(() => groupSkus(options, query), [options, query]);
  const selected = options.filter((item) => selectedIds.includes(item.id));

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id],
    );
  };

  const togglePath = (path: string) => {
    setOpenPaths((prev) =>
      prev.includes(path) ? prev.filter((value) => value !== path) : [...prev, path],
    );
  };

  return (
    <div className="relative flex flex-wrap items-center gap-1.5" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="h-10 rounded-md border px-3 text-sm bg-background inline-flex items-center gap-2"
      >
        All SKUs
        {selected.length > 0 && (
          <span className="rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5">
            {selected.length}
          </span>
        )}
      </button>
      {selected.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => toggle(item.id)}
          className="inline-flex max-w-[180px] items-center gap-1 rounded-full border bg-muted px-2 py-1 text-xs"
          title={item.name}
        >
          <span className="truncate">{item.name}</span>
          <X size={12} className="shrink-0 text-muted-foreground" />
        </button>
      ))}
      {open && (
        <div className="absolute top-full z-20 mt-1 w-96 max-w-[80vw] rounded-md border bg-background shadow-md p-2">
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search SKU or product..."
            className="h-9 w-full rounded-md border px-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-2 max-h-72 overflow-y-auto space-y-1">
            {groups.map((group) => {
              const expanded = query.trim().length > 0 || openPaths.includes(group.path);
              const title = group.location ? `${group.location} · ${group.path}` : group.path;
              return (
                <div key={group.path} className="rounded-md border">
                  <button
                    type="button"
                    onClick={() => togglePath(group.path)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                  >
                    <ChevronRight
                      size={14}
                      className={`shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}
                    />
                    <span className="min-w-0 flex-1 truncate">{title}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">{group.items.length}</span>
                  </button>
                  {expanded && (
                    <div className="border-t px-1 py-1 space-y-0.5">
                      {group.items.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggle(item.id)}
                            className="rounded border"
                          />
                          <span className="min-w-0 flex-1 truncate">{item.name}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{item.productCode}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {groups.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No SKUs match.</p>
            )}
          </div>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left text-xs text-muted-foreground px-2 py-1.5 hover:text-foreground"
            >
              Clear SKUs
            </button>
          )}
        </div>
      )}
    </div>
  );
}
