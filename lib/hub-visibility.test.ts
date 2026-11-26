import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { allLocationsLabel, assignedSummary, resolveFilterHub, visibleHubs } from './hub-visibility';
import type { Hub } from '@/types';

const hub = (id: string, name: string, parent: string | null = null, isActive = true) =>
  ({ id, name, isActive, parentHubId: parent, locationType: parent ? 'rsp' : 'hub', createdDate: '2026-01-01' }) as unknown as Hub;
const HUBS = [
  hub('hub_lagos', 'Lagos Hub'), hub('rsp_lekki', 'Lekki RSP', 'hub_lagos'), hub('rsp_yaba', 'Yaba RSP', 'hub_lagos'),
  hub('hub_ife', 'Ife Hub'), hub('rsp_modakeke', 'Modakeke RSP', 'hub_ife'), hub('hub_nasarawa', 'Nasarawa Hub'),
  hub('hub_old', 'Old Hub', null, false),
];
const ids = (hs: Hub[]) => hs.map((h) => h.id);

describe('visibleHubs', () => {
  it('global sees every active hub', () => {
    assert.equal(visibleHubs(HUBS, { isGlobal: true, hubId: null }).length, 6);
  });
  it('falls back to hub plus children when visibleHubIds is empty', () => {
    assert.deepEqual(ids(visibleHubs(HUBS, { isGlobal: false, hubId: 'hub_lagos', visibleHubIds: [] })), ['hub_lagos', 'rsp_lekki', 'rsp_yaba']);
  });
  it('uses visibleHubIds when given', () => {
    assert.deepEqual(ids(visibleHubs(HUBS, { isGlobal: false, hubId: 'hub_ife', visibleHubIds: ['hub_ife', 'rsp_modakeke', 'hub_nasarawa'] })), ['hub_ife', 'rsp_modakeke', 'hub_nasarawa']);
  });
  it('drops inactive hubs even when visible', () => {
    assert.deepEqual(ids(visibleHubs(HUBS, { isGlobal: false, hubId: 'hub_ife', visibleHubIds: ['hub_ife', 'hub_old'] })), ['hub_ife']);
  });
});

describe('allLocationsLabel', () => {
  it('labels All by scope', () => {
    assert.equal(allLocationsLabel(true), 'All locations');
    assert.equal(allLocationsLabel(false), 'All my locations');
  });
});

describe('resolveFilterHub', () => {
  const visibleIfe = visibleHubs(HUBS, { isGlobal: false, hubId: 'hub_ife', visibleHubIds: ['hub_ife', 'rsp_modakeke'] });
  it('keeps a visible location', () => { assert.equal(resolveFilterHub('Ife Hub', visibleIfe), 'Ife Hub'); });
  it('falls back to All for a hidden location', () => { assert.equal(resolveFilterHub('Lagos Hub', visibleIfe), 'All'); });
});

describe('assignedSummary', () => {
  it('names one location', () => { assert.deepEqual(assignedSummary(['Lagos Hub']), { label: 'Lagos Hub' }); });
  it('shows the first and a count for several', () => {
    assert.deepEqual(assignedSummary(['Lagos Hub', 'Ife Hub', 'Yaba RSP']), { label: 'Lagos Hub +2', title: 'Lagos Hub, Ife Hub, Yaba RSP' });
  });
  it('handles none', () => { assert.deepEqual(assignedSummary([]), { label: '-' }); });
});
