// Caption: Two filters set inside More filters, so the trigger carries the count 2
'use client';

import { FilterBar, MoreFilterField } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';

export default function FilterBarMoreActive() {
  return (
    <FilterBar
      more={
        <>
          <MoreFilterField label="Till" htmlFor="ex-till">
            <FilterSelect id="ex-till" value="front" onChange={() => {}} options={[{ value: 'front', label: 'Front till' }]} />
          </MoreFilterField>
          <MoreFilterField label="Cashier" htmlFor="ex-cashier">
            <FilterSelect id="ex-cashier" value="ada" onChange={() => {}} options={[{ value: 'ada', label: 'Ada Okafor' }]} />
          </MoreFilterField>
        </>
      }
      moreActiveCount={2}
    />
  );
}
