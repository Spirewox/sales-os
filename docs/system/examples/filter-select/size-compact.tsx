// Caption: A 36px status filter with an All option first, mapped back to no filter in onChange
'use client';

import { useState } from 'react';
import { FilterSelect } from '@/components/app';

export default function FilterSelectCompact() {
  const [status, setStatus] = useState('');
  return (
    <FilterSelect
      size="compact"
      ariaLabel="Sale status"
      value={status || 'All'}
      onChange={(v) => setStatus(v === 'All' ? '' : v)}
      options={[
        { value: 'All', label: 'Any status' },
        { value: 'Paid', label: 'Paid' },
        { value: 'Part paid', label: 'Part paid' },
        { value: 'Unpaid', label: 'Unpaid' },
      ]}
    />
  );
}
