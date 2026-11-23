// Caption: Enquiry drawer holding an unsaved note, so Escape and a backdrop click do nothing.
'use client';

import { useState } from 'react';
import { EntityDrawer } from '@/components/app';
import { StatusBadge } from '@/components/app/status-badge';

export default function EntityDrawerLocked() {
  const saved = '';
  const [note, setNote] = useState('Called back, wants a bulk price');
  return (
    <EntityDrawer
      onClose={() => {}}
      dismissible={note === saved}
      title="Bulk order for December"
      subtitle="Enquiry from Mama Put Kitchen"
      status={<StatusBadge domain="work" status="Open" />}
    >
      <label className="block text-sm font-medium" htmlFor="resolution">Resolution note</label>
      <textarea id="resolution" className="mt-1 w-full rounded-md border p-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
    </EntityDrawer>
  );
}
