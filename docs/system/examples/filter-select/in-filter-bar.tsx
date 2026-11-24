// Caption: Two compact filters in the sales filter bar, beside search and the result count
'use client';

import { useState } from 'react';
import { FilterBar } from '@/components/app/filter-bar';
import { FilterSelect } from '@/components/app';

export default function FilterSelectInFilterBar() {
  const [q, setQ] = useState('');
  const [agent, setAgent] = useState('');
  const [channel, setChannel] = useState('');
  return (
    <FilterBar
      search={{ value: q, onChange: setQ, placeholder: 'Search customer or sale ID', label: 'Search sales' }}
      filters={
        <>
          <FilterSelect
            size="compact"
            ariaLabel="Agent"
            value={agent || 'All'}
            onChange={(v) => setAgent(v === 'All' ? '' : v)}
            options={[
              { value: 'All', label: 'All agents' },
              { value: 'a1', label: 'Ada Okafor' },
              { value: 'a2', label: 'Tunde Bello' },
            ]}
          />
          <FilterSelect
            size="compact"
            ariaLabel="Channel"
            value={channel || 'All'}
            onChange={(v) => setChannel(v === 'All' ? '' : v)}
            options={[
              { value: 'All', label: 'All channels' },
              { value: 'WhatsApp', label: 'WhatsApp' },
              { value: 'Walk-in', label: 'Walk-in' },
            ]}
          />
        </>
      }
      resultLabel="1 to 50 of 812 sales"
    />
  );
}
