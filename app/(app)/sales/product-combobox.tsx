'use client';

import { useId, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { InventoryItem } from '@/types';
import { cn } from '@/lib/utils';
import { fieldClass } from '@/components/app';
import { fmt } from './sales-utils';
import { MEAL_PRODUCT_ID } from './use-record-sale';

const MEAL_LABEL = 'Record a meal';

/** Searchable product picker for Record sale, with "Record a meal" as the first option. */
export function ProductCombobox({ id, items, value, onChange, invalid, describedBy }: Readonly<{
  id: string;
  items: InventoryItem[];
  value: string;
  onChange: (productId: string) => void;
  invalid?: boolean;
  describedBy?: string;
}>) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const selected = value === MEAL_PRODUCT_ID ? MEAL_LABEL : items.find((i) => i.id === value)?.name ?? '';
  const term = query.trim().toLowerCase();
  const matches = items.filter((i) => !term || i.name.toLowerCase().includes(term) || (i.sku ?? '').toLowerCase().includes(term) || (i.category ?? '').toLowerCase().includes(term));
  const options: { id: string; label: string; hint?: string }[] = [
    ...(!term || MEAL_LABEL.toLowerCase().includes(term) ? [{ id: MEAL_PRODUCT_ID, label: MEAL_LABEL, hint: 'Kitchen, food plate' }] : []),
    ...matches.slice(0, 50).map((i) => ({ id: i.id, label: i.name, hint: [i.sku, `${i.currentStock} ${i.unitOfMeasure}`, `${fmt(i.baseSellingPrice)}/${i.unitOfMeasure}`].filter(Boolean).join(', ') })),
  ];

  const pick = (pid: string) => {
    onChange(pid);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setOpen(false); setQuery(''); } }}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Search products by name or SKU"
        value={open ? query : selected}
        onFocus={() => { setOpen(true); setActive(0); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter' && open && options[active]) { e.preventDefault(); pick(options[active].id); }
          else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
        }}
        className={cn(fieldClass, 'pr-9')}
      />
      {value && !open ? (
        <button type="button" onClick={() => { onChange(''); inputRef.current?.focus(); }} aria-label="Clear product" className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground">
          <X size={16} aria-hidden />
        </button>
      ) : (
        <ChevronDown size={16} aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground" />
      )}
      {open && (
        <ul id={listId} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover py-1 text-sm shadow-md">
          {options.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">{items.length ? 'No products match.' : 'No products at this hub yet.'}</li>
          ) : (
            options.map((o, i) => (
              <li
                key={o.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={o.id === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o.id)}
                onMouseEnter={() => setActive(i)}
                className={cn('cursor-pointer px-3 py-2', i === active && 'bg-muted', o.id === value && 'font-medium')}
              >
                <span className="block">{o.label}</span>
                {o.hint && <span className="block text-xs text-muted-foreground tabular-nums">{o.hint}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
