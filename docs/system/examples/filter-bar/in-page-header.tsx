// Caption: The Recipes screen, a page header with a filter bar under it and a trailing action
'use client';

import { useState } from 'react';
import { FilterBar } from '@/components/app';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';

export default function FilterBarInPage() {
  const [q, setQ] = useState('');
  return (
    <div className="space-y-4">
      <PageHeader title="Recipes" />
      <FilterBar
        search={{ value: q, onChange: setQ, placeholder: 'Search recipes', label: 'Search recipes' }}
        resultLabel="12 recipes"
        trailing={<Button variant="outline" size="sm">Export</Button>}
      />
    </div>
  );
}
