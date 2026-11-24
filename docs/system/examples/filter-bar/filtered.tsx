// Caption: Two active filters shown as removable chips, with Clear all and the result count
'use client';

import { useState } from 'react';
import { FilterBar, type FilterChip } from '@/components/app';

export default function FilterBarFiltered() {
  const [till, setTill] = useState<string | null>('Front till');
  const [q, setQ] = useState('jollof');
  const chips: FilterChip[] = [
    ...(till ? [{ key: 'till', label: `Till: ${till}`, onRemove: () => setTill(null) }] : []),
    ...(q ? [{ key: 'q', label: `"${q}"`, onRemove: () => setQ('') }] : []),
  ];
  return (
    <FilterBar
      search={{ value: q, onChange: setQ, placeholder: 'Search transactions', label: 'Search transactions' }}
      chips={chips}
      onClearAll={() => { setTill(null); setQ(''); }}
      resultLabel="18 transactions"
    />
  );
}
