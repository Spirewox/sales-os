// Caption: Period control set to Last 30 days, opening presets beside a range calendar
'use client';

import { useState } from 'react';
import { PeriodSelect } from '@/components/app';
import type { Period } from '@/lib/period';

export default function PeriodSelectDefault() {
  const [period, setPeriod] = useState<Period>({ preset: '30d' });
  return <PeriodSelect value={period} onChange={setPeriod} />;
}
