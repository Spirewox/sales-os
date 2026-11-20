'use client';

import { useState, type ReactNode } from 'react';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { SalesChannel, type Agent, type InventoryItem } from '@/types';
import { FilterSelect } from '@/components/filter-select';
import { FilterBar, LocationSelect, MoreFilterField, PeriodSelect } from '@/components/app';
import { PAYMENT_STATUS_FILTERS, type SaleDateFieldFilter } from './sales-utils';
import { SALES_SORTS, type SalesFilters } from './use-sales-filters';

type Props = Readonly<{
  filters: SalesFilters;
  hubScope: HubScopeFilter;
  agents: Agent[];
  categories: readonly string[];
  skuOptions: InventoryItem[];
  resultLabel?: ReactNode;
}>;

/** Search, one period, location and payment status inline; everything else under "More filters". */
export function SalesFilterBar({ filters: f, hubScope, agents, categories, skuOptions, resultLabel }: Props) {
  return (
    <FilterBar
      search={{ value: f.search, onChange: f.setSearch, placeholder: 'Search customer, product, notes', label: 'Search sales' }}
      filters={
        <>
          <PeriodSelect value={f.period} onChange={f.setPeriod} />
          <LocationSelect scope={hubScope} />
          <FilterSelect
            ariaLabel="Payment status"
            value={f.pay || 'All'}
            onChange={(v) => f.setPay(v === 'All' ? '' : v)}
            className="h-9 w-auto min-w-36 data-[size=default]:h-9"
            options={[{ value: 'All', label: 'Any payment' }, ...PAYMENT_STATUS_FILTERS]}
          />
        </>
      }
      more={
        <div className="-mx-1 max-h-[60vh] space-y-3 overflow-y-auto px-1">
          <MoreFilterField label="Agent">
            <FilterSelect ariaLabel="Agent" value={f.agent || 'All'} onChange={(v) => f.setAgent(v === 'All' ? '' : v)} options={[{ value: 'All', label: 'All agents' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]} />
          </MoreFilterField>
          <MoreFilterField label="Channel">
            <FilterSelect ariaLabel="Channel" value={f.channel || 'All'} onChange={(v) => f.setChannel(v === 'All' ? '' : v)} options={[{ value: 'All', label: 'All channels' }, ...Object.values(SalesChannel).map((c) => ({ value: c, label: c }))]} />
          </MoreFilterField>
          <CheckList label="Category" options={categories.map((c) => ({ id: c, label: c }))} selected={f.categories} onChange={f.setCategories} />
          <CheckList label="SKU" searchable options={skuOptions.map((s) => ({ id: s.id, label: s.name, hint: s.sku }))} selected={f.productIds} onChange={f.setProductIds} />
          <MoreFilterField label="Date filter uses">
            <FilterSelect ariaLabel="Date filter uses" value={f.dateField} onChange={(v) => f.setDateField(v as SaleDateFieldFilter)} options={[{ value: 'sold', label: 'Date sold' }, { value: 'created', label: 'Date recorded' }]} />
          </MoreFilterField>
          <MoreFilterField label="Sort">
            <FilterSelect ariaLabel="Sort sales" value={f.sort} onChange={f.setSort} options={SALES_SORTS.map((s) => ({ value: s.value, label: s.label }))} />
          </MoreFilterField>
        </div>
      }
      moreActiveCount={f.moreActiveCount}
      chips={f.chips}
      onClearAll={f.clearAll}
      resultLabel={resultLabel}
    />
  );
}

function CheckList({ label, options, selected, onChange, searchable }: Readonly<{
  label: string;
  options: { id: string; label: string; hint?: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  searchable?: boolean;
}>) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const shown = options.filter((o) => !term || o.label.toLowerCase().includes(term) || (o.hint ?? '').toLowerCase().includes(term));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs font-medium text-muted-foreground">{label}{selected.length > 0 && ` (${selected.length})`}</legend>
      {searchable && (
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label}s`} aria-label={`Search ${label}s`} className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm" />
      )}
      <div className="max-h-36 overflow-y-auto rounded-md border p-1">
        {shown.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">Nothing matches.</p>}
        {shown.slice(0, 100).map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
            <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="size-4 accent-[var(--primary)]" />
            <span className="min-w-0 flex-1 truncate">{o.label}</span>
            {o.hint && <span className="shrink-0 text-xs text-muted-foreground">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
