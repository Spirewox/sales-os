import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MULTI_VISIBLE_HUB_IDS, mockPersonaForEmail, parseMockSession } from './mock-personas';
import { hubInScope } from './mock-api/scope';

describe('mockPersonaForEmail', () => {
  it('signs multi@ in as the manager of several locations', () => {
    assert.equal(mockPersonaForEmail('multi@fudfarmer.local'), 'multi');
    assert.equal(mockPersonaForEmail('  MULTI@x.ng '), 'multi');
  });
  it('signs anyone else in as the admin', () => {
    assert.equal(mockPersonaForEmail('demo@fudfarmer.com'), 'admin');
    assert.equal(mockPersonaForEmail(''), 'admin');
  });
});

describe('parseMockSession', () => {
  it('reads the stored session', () => {
    assert.equal(parseMockSession('1'), 'admin');
    assert.equal(parseMockSession('multi'), 'multi');
    assert.equal(parseMockSession(null), null);
  });
});

describe('the multi persona', () => {
  it('sees Ife Hub, Modakeke RSP and Nasarawa Hub', () => {
    assert.deepEqual(MULTI_VISIBLE_HUB_IDS, ['hub_ife', 'rsp_modakeke', 'hub_nasarawa']);
  });
});

describe('hubInScope', () => {
  const visible = ['hub_ife', 'hub_nasarawa'];
  it('lets everything through for the admin', () => {
    assert.equal(hubInScope(null, 'hub_lagos', null), true);
  });
  it('limits "all" to the visible locations', () => {
    assert.equal(hubInScope(null, 'hub_ife', visible), true);
    assert.equal(hubInScope(null, 'hub_lagos', visible), false);
  });
  it('honours a requested location', () => {
    assert.equal(hubInScope('hub_ife', 'hub_ife', visible), true);
    assert.equal(hubInScope('hub_ife', 'hub_nasarawa', visible), false);
  });
  it('shows nothing for a requested location outside the visible ones', () => {
    assert.equal(hubInScope('hub_lagos', 'hub_lagos', visible), false);
  });
});
