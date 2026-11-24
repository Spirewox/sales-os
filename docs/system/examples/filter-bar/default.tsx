// Caption: Search for ingredients with one inline status filter and a result count
'use client';

import { useState } from 'react';
import { FilterBar } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';

export default function FilterBarDefault() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  return (
    <FilterBar
      search={{ value: q, onChange: setQ, placeholder: 'Search ingredients', label: 'Search ingredients' }}
      filters={
        <FilterSelect
          size="compact"
          ariaLabel="Stock status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All stock' },
            { value: 'low', label: 'Low stock' },
          ]}
        />
      }
      resultLabel="24 ingredients"
    />
  );
}
