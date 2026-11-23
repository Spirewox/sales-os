'use client';

import { useState } from 'react';
import type { InsightScopeParams } from '@/hooks/use-insights-api';
import { useUrlState } from '@/hooks/use-url-state';
import { Seg } from './analytics-ui';
import { ExploreAsk, type SeedQuery } from './explore-ask';
import { ExploreBuild } from './explore-build';
import { ExploreSimulate } from './explore-simulate';

type Mode = 'ask' | 'build' | 'simulate';
const MODES: [Mode, string][] = [['ask', 'Ask'], ['build', 'Build a chart'], ['simulate', 'What if']];
const MODE_HINT: Record<Mode, string> = {
  ask: 'Ask in plain words and get a chart, a list of records or a comparison.',
  build: 'Pick the data, a measure and a breakdown; add filters to narrow it.',
  simulate: 'Move a lever (price, demand, cost, credit) and see the projected effect.',
};

/**
 * Explore (formerly the Insights page): Ask, a chart builder and what-if scenarios,
 * all scoped by the page's location and period. The mode lives in ?mode=.
 */
export function ExploreTab({ scope }: Readonly<{ scope: InsightScopeParams; periodLabel: string }>) {
  const { get, set } = useUrlState();
  const raw = get('mode');
  const mode: Mode = raw === 'build' || raw === 'simulate' ? raw : 'ask';
  const [seed, setSeed] = useState<SeedQuery | null>(null);
  const [seedKey, setSeedKey] = useState(0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{MODE_HINT[mode]}</p>
        <Seg label="Explore mode" value={mode} onChange={(m) => set({ mode: m === 'ask' ? null : m, ask: null })} options={MODES} />
      </div>
      {mode === 'ask' && (
        <ExploreAsk
          scope={scope}
          initialQ={get('ask') ?? undefined}
          onRefine={(q) => { setSeed(q); setSeedKey((k) => k + 1); set({ mode: 'build', ask: null }); }}
        />
      )}
      {mode === 'build' && <ExploreBuild key={seedKey} scope={scope} seed={seed} />}
      {mode === 'simulate' && <ExploreSimulate scope={scope} />}
    </div>
  );
}
