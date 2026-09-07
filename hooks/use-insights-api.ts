'use client';

import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { axiosGet, axiosPost } from '@/lib/api';
import { requireApi, HAS_API } from '@/lib/require-api';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { useMetricsPeriod } from '@/components/metrics-period-bar';
import type { AskResult } from '@/lib/ask';
import type { Filter, QueryResult } from '@/lib/explore';
import type { CompareResult, EntityKind } from '@/lib/insights';
import type { Levers, ScenarioKey, SimOutput } from '@/lib/simulate';

export type InsightScopeParams = {
  hub_id?: string;
  period?: string;
  date_from?: string;
  date_to?: string;
};

function unwrapData<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

export function useInsightScope() {
  const hubScope = useHubScopeFilter();
  const metricsPeriod = useMetricsPeriod('month');

  const scope: InsightScopeParams = useMemo(() => {
    const params: InsightScopeParams = {};
    if (hubScope.hubIdForApi) params.hub_id = hubScope.hubIdForApi;
    if (metricsPeriod.apiParams.date_from) params.date_from = metricsPeriod.apiParams.date_from;
    if (metricsPeriod.apiParams.date_to) params.date_to = metricsPeriod.apiParams.date_to;
    if (metricsPeriod.apiParams.period) params.period = metricsPeriod.apiParams.period;
    return params;
  }, [hubScope.hubIdForApi, metricsPeriod.apiParams]);

  const periodLabel = metricsPeriod.isCustom
    ? `${metricsPeriod.dateFrom} → ${metricsPeriod.dateTo}`
    : metricsPeriod.preset;

  return { hubScope, metricsPeriod, scope, periodLabel };
}

export function useAskInsight() {
  return useMutation({
    mutationFn: async (payload: InsightScopeParams & { question: string }) => {
      requireApi();
      const res = await axiosPost('insights/ask', payload, true);
      return unwrapData<AskResult>(res);
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
      const res = await axiosPost('insights/explore/query', payload, true);
      return unwrapData<
        QueryResult & { measureLabel: string; groupLabel: string; measureKind: 'money' | 'number' }
      >(res);
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
      const res = await axiosPost('insights/explore/field-values', params, true);
      return unwrapData<{ values: string[] }>(res).values;
    },
  });
}

export function useSimulateTargets(scope: InsightScopeParams) {
  return useQuery({
    queryKey: ['insight-simulate-targets', scope],
    enabled: HAS_API,
    staleTime: 60_000,
    queryFn: async () => {
      const qs = new URLSearchParams();
      Object.entries(scope).forEach(([k, v]) => {
        if (v != null && v !== '') qs.set(k, String(v));
      });
      const res = await axiosGet(`insights/simulate/targets?${qs.toString()}`, true);
      return unwrapData<{
        targets: { value: string; label: string }[];
        segments: string[];
      }>(res);
    },
  });
}

export function useSimulateInterpret() {
  return useMutation({
    mutationFn: async (payload: InsightScopeParams & { question: string }) => {
      requireApi();
      const res = await axiosPost('insights/simulate/interpret', payload, true);
      return unwrapData<{ scenario: ScenarioKey; levers: Levers; understood: string }>(res);
    },
  });
}

export function useSimulateRun() {
  return useMutation({
    mutationFn: async (
      payload: InsightScopeParams & { scenario: ScenarioKey; levers: Levers },
    ) => {
      requireApi();
      const res = await axiosPost('insights/simulate/run', payload, true);
      return unwrapData<SimOutput>(res);
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
      const res = await axiosGet(`insights/compare/entities?${qs.toString()}`, true);
      return unwrapData<{ entities: { id: string; label: string; sublabel?: string }[] }>(res)
        .entities;
    },
  });
}

export function useCompareInsight() {
  return useMutation({
    mutationFn: async (
      payload: InsightScopeParams & { kind: EntityKind; aId: string; bId: string },
    ) => {
      requireApi();
      const res = await axiosPost('insights/compare', payload, true);
      return unwrapData<CompareResult>(res);
    },
  });
}
