// Caption: Stock bar whose More filters panel stays one column with a single SKU field
'use client';

import { useState } from 'react';
import { FilterBar, MoreFilterField } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';

export default function FilterBarOneColumn() {
  const [q, setQ] = useState('');
  const [sku, setSku] = useState('all');
  return (
    <FilterBar
      search={{ value: q, onChange: setQ, placeholder: 'Search product or SKU', label: 'Search stock' }}
      more={
        <MoreFilterField label="SKU">
          <FilterSelect ariaLabel="SKU" value={sku} onChange={setSku} options={[{ value: 'all', label: 'All SKUs' }, { value: 'tom-1kg', label: 'Tomatoes 1kg' }]} />
        </MoreFilterField>
      }
      moreColumns={false}
      moreActiveCount={sku === 'all' ? 0 : 1}
      resultLabel="312 products"
    />
  );
}
