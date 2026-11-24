// Caption: A 40px form field for the product category, tied to its visible label by id
'use client';

import { useState } from 'react';
import { FilterSelect } from '@/components/app';

const CATEGORIES = ['Fish', 'Poultry', 'Beef', 'Other'];

export default function FilterSelectDefault() {
  const [category, setCategory] = useState('Fish');
  return (
    <div className="grid max-w-sm gap-1.5">
      <label htmlFor="example-category" className="text-sm font-medium">
        Category
      </label>
      <FilterSelect
        id="example-category"
        value={category}
        onChange={setCategory}
        options={CATEGORIES.map((c) => ({ value: c, label: c }))}
      />
    </div>
  );
}
