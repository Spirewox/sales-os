// Caption: A custom range already applied, so the trigger reads "1 Nov to 20 Nov"
'use client';

import { useState } from 'react';
import { PeriodSelect } from '@/components/app';
import type { Period } from '@/lib/period';

export default function PeriodSelectCustomRange() {
  const [period, setPeriod] = useState<Period>({ preset: 'custom', from: '2026-11-01', to: '2026-11-20' });
  return <PeriodSelect value={period} onChange={setPeriod} />;
}
