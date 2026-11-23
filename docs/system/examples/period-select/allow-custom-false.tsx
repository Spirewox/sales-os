// Caption: Presets only, limited to Today, Last 7 days and Last 30 days, with no calendar
'use client';

import { useState } from 'react';
import { PeriodSelect } from '@/components/app';
import type { Period } from '@/lib/period';

export default function PeriodSelectPresetsOnly() {
  const [period, setPeriod] = useState<Period>({ preset: '7d' });
  return <PeriodSelect value={period} onChange={setPeriod} allowCustom={false} allowAll={false} presets={['today', '7d', '30d']} />;
}
