'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { axiosGet, axiosPost } from '@/lib/api';
import { requireApi, HAS_API } from '@/lib/require-api';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { useUrlState } from '@/hooks/use-url-state';
import { parsePeriod, periodLabel, periodRange, periodToParams, previousRange, type Period, type PeriodPreset } from '@/lib/period';
import type { AskResult } from '@/lib/ask';
import type { Filter, QueryResult } from '@/lib/explore';
import type { CompareResult, EntityKind } from '@/lib/insights';

/** Analytics opens on the last 30 days. */
export const DEFAULT_PERIOD: PeriodPreset = '30d';

/** Insights endpoints load scoped datasets server-side — allow longer than the default 8s. */
const INSIGHTS_TIMEOUT_MS = 60_000;

export type InsightScopeParams = {
  hub_id?: string;
  period?: string;
  date_from?: string;
  date_to?: string;
};

/** Reject a response that lacks the fields the view needs, so it shows an error instead of crashing. */
function expectShape<T>(value: T, ok: (v: T) => boolean): T {
  if (!value || !ok(value)) throw new Error('This answer is not available right now. Try again later.');
  return value;
}

function unwrapData<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

/** API params for a period: explicit Lagos-day bounds, or `period=all` for all time. */
export function periodToApiParams(p: Period): InsightScopeParams {
  if (p.preset === 'all') return { period: 'all' };
  const { from, to } = periodRange(p);
  return { ...(from ? { date_from: from } : {}), ...(to ? { date_to: to } : {}) };
}

function scopeFromKey(key: string): { scope: InsightScopeParams; prevScope: InsightScopeParams | null } {
  const [hubId, preset, from, to] = key.split('|');
  const p: Period = { preset: preset as Period['preset'], from: from || undefined, to: to || undefined };
  const hub = hubId ? { hub_id: hubId } : {};
  const prev = previousRange(p);
  return { scope: { ...hub, ...periodToApiParams(p) }, prevScope: prev ? { ...hub, date_from: prev.from, date_to: prev.to } : null };
}

/**
 * Location and period for Analytics (including Explore and Compare). The period lives in the URL
 * (?period=30d, or custom from/to), defaulting to Last 30 days; the location follows the app-wide hub.
 * `prevScope` is the equally long period before, for "vs previous" comparisons (null for all time).
 */
export function useInsightScope() {
  const hubScope = useHubScopeFilter();
  const { params, set } = useUrlState();
  const period = parsePeriod(params, DEFAULT_PERIOD);
  const setPeriod = useCallback((p: Period) => set(periodToParams(p, DEFAULT_PERIOD)), [set]);
  // A string key keeps `scope` stable between renders, so effects and query keys only change with it.
  const scopeKey = [hubScope.hubIdForApi ?? '', period.preset, period.from ?? '', period.to ?? ''].join('|');
  const scope = useMemo(() => scopeFromKey(scopeKey).scope, [scopeKey]);
  const prevScope = useMemo(() => scopeFromKey(scopeKey).prevScope, [scopeKey]);

  return { hubScope, period, setPeriod, scope, prevScope, periodLabel: periodLabel(period) };
}

export function useAskInsight() {
  return useMutation({
    mutationFn: async (payload: InsightScopeParams & { question: string }) => {
      requireApi();
      const res = await axiosPost('insights/ask', payload, true, INSIGHTS_TIMEOUT_MS);
      return expectShape(unwrapData<AskResult>(res), (r) => typeof r.narrative === 'string' && Array.isArray(r.rows));
    },
  });
}

export function useExploreQuery() {
  return useMutation({
    mutationFn: async (
      payload: InsightScopeParams & {
        dataset: string;
        measure: string;
        groupBy: string;
        filters?: Filter[];
      },
    ) => {
      requireApi();
      const res = await axiosPost('insights/explore/query', payload, true, INSIGHTS_TIMEOUT_MS);
      return expectShape(
        unwrapData<QueryResult & { measureLabel: string; groupLabel: string; measureKind: 'money' | 'number' }>(res),
        (r) => Array.isArray(r.rows),
      );
    },
  });
}

export function useExploreFieldValues(
  enabled: boolean,
  params: InsightScopeParams & { dataset: string; field: string },
) {
  return useQuery({
    queryKey: ['insight-field-values', params],
    enabled: HAS_API && enabled && !!params.dataset && !!params.field,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await axiosPost(
        'insights/explore/field-values',
        params,
        true,
        INSIGHTS_TIMEOUT_MS,
      );
      const values = unwrapData<{ values?: string[] }>(res)?.values;
      return Array.isArray(values) ? values : [];
    },
  });
}

export function useCompareEntities(kind: EntityKind, scope: InsightScopeParams) {
  return useQuery({
    queryKey: ['insight-compare-entities', kind, scope],
    enabled: HAS_API && !!kind,
    staleTime: 60_000,
    queryFn: async () => {
      const qs = new URLSearchParams({ kind });
      Object.entries(scope).forEach(([k, v]) => {
        if (v != null && v !== '') qs.set(k, String(v));
      });
      const res = await axiosGet(
        `insights/compare/entities?${qs.toString()}`,
        true,
        INSIGHTS_TIMEOUT_MS,
      );
      const entities = unwrapData<{ entities?: { id: string; label: string; sublabel?: string }[] }>(res)?.entities;
      return Array.isArray(entities) ? entities : [];
    },
  });
}

export function useCompareInsight() {
  return useMutation({
    mutationFn: async (
      payload: InsightScopeParams & { kind: EntityKind; aId: string; bId: string },
    ) => {
      requireApi();
      const res = await axiosPost('insights/compare', payload, true, INSIGHTS_TIMEOUT_MS);
      return expectShape(unwrapData<CompareResult>(res), (r) => Array.isArray(r.groups) && Array.isArray(r.insights));
    },
  });
}
