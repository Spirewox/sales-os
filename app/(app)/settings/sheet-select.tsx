'use client';

import { FilterSelect, type FilterOption } from '@/components/filter-select';
import { fieldClass } from '@/components/app';

const EMPTY = '__none__';

/**
 * In-app select for form sheets. Empty values map to a sentinel (the select can't hold ''),
 * and a disabled select renders as a read-only field showing the chosen label.
 */
export function SheetSelect({ id, value, onChange, options, disabled }: Readonly<{ id: string; value: string; onChange: (v: string) => void; options: FilterOption[]; disabled?: boolean }>) {
  if (disabled) {
    const label = options.find((o) => o.value === value)?.label ?? (value || '-');
    return <input id={id} type="text" value={label} readOnly disabled className={fieldClass} />;
  }
  return (
    <FilterSelect
      id={id}
      value={value === '' ? EMPTY : value}
      onChange={(v) => onChange(v === EMPTY ? '' : v)}
      className="h-9 font-normal data-[size=default]:h-9"
      options={options.map((o) => (o.value === '' ? { ...o, value: EMPTY } : o))}
    />
  );
}
