// Caption: The audit log default, All time, where the range is open on both ends
'use client';

import { useState } from 'react';
import { PeriodSelect } from '@/components/app';
import type { Period } from '@/lib/period';

export default function PeriodSelectAllTime() {
  const [period, setPeriod] = useState<Period>({ preset: 'all' });
  return <PeriodSelect value={period} onChange={setPeriod} />;
}
