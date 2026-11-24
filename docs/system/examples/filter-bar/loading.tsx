// Caption: While the list loads the caller passes no result label, so the count row stays empty
'use client';

import { useState } from 'react';
import { FilterBar } from '@/components/app';

export default function FilterBarLoading() {
  const [q, setQ] = useState('');
  const loading = true;
  return (
    <FilterBar
      search={{ value: q, onChange: setQ, placeholder: 'Search recipes', label: 'Search recipes' }}
      resultLabel={loading ? undefined : '12 recipes'}
    />
  );
}
