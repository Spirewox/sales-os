// Caption: Inside the customers filter bar, beside search, writing the period to the URL
'use client';

import { useState } from 'react';
import { FilterBar } from '@/components/app/filter-bar';
import { PeriodSelect } from '@/components/app';
import type { Period } from '@/lib/period';

export default function PeriodSelectInFilterBar() {
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState<Period>({ preset: '30d' });
  return (
    <FilterBar
      search={{ value: q, onChange: setQ, placeholder: 'Search name, phone, email, company', label: 'Search customers' }}
      filters={<PeriodSelect value={period} onChange={setPeriod} />}
      resultLabel="1 to 50 of 1,204 customers"
    />
  );
}
