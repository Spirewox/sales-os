// Caption: Audit log bar whose More filters panel lays three fields out in two columns
'use client';

import { useState } from 'react';
import { FilterBar, MoreFilterField } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';

const ALL = [{ value: 'All', label: 'All' }];

export default function FilterBarMoreColumns() {
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('All');
  const [module, setModule] = useState('All');
  const [agent, setAgent] = useState('All');
  return (
    <FilterBar
      search={{ value: q, onChange: setQ, placeholder: 'Search by user or action', label: 'Search audit log' }}
      more={
        <>
          <MoreFilterField label="Record type">
            <FilterSelect ariaLabel="Record type" value={entity} onChange={setEntity} options={[...ALL, { value: 'Sale', label: 'Sale' }]} />
          </MoreFilterField>
          <MoreFilterField label="Module">
            <FilterSelect ariaLabel="Module" value={module} onChange={setModule} options={[...ALL, { value: 'pos', label: 'POS' }]} />
          </MoreFilterField>
          <MoreFilterField label="User">
            <FilterSelect ariaLabel="User" value={agent} onChange={setAgent} options={[...ALL, { value: 'ada', label: 'Ada Okafor' }]} />
          </MoreFilterField>
        </>
      }
      moreColumns
      moreActiveCount={[entity, module, agent].filter((v) => v !== 'All').length}
      resultLabel="1,204 entries"
    />
  );
}
