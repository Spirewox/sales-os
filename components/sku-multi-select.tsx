'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type SkuOption = {
  id: string;
  sku: string;
  name: string;
};

type SkuMultiSelectProps = Readonly<{
  options: SkuOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}>;

export function SkuMultiSelect({ options, selectedIds, onChange }: SkuMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
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

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (item) =>
        item.sku.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term),
    );
  }, [options, query]);

  const selected = options.filter((item) => selectedIds.includes(item.id));
  const label =
    selected.length === 1
      ? `${selected[0].sku} · ${selected[0].name}`
      : 'All SKUs';

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="h-10 max-w-xs rounded-md border px-3 text-sm bg-background inline-flex items-center gap-2"
      >
        <span className="truncate">{label}</span>
        {selected.length > 1 && (
          <span className="rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-96 max-w-[80vw] rounded-md border bg-background shadow-md p-2">
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search SKU or product..."
            className="h-9 w-full rounded-md border px-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
            {visible.map((item) => (
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
                <span className="truncate">{item.sku} · {item.name}</span>
              </label>
            ))}
            {visible.length === 0 && (
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
