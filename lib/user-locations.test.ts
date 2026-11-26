import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { finalAssignment, locationsForRole, managesOtherHubs, mergeAssignedHubs, nextPrimary, primaryFirstIds, startingAssignment, validateUserLocations } from './user-locations';
import type { Hub } from '@/types';

describe('locationsForRole', () => {
  it('keeps every chosen location for a role that may hold several', () => {
    assert.deepEqual(locationsForRole(false, ['a', 'b'], 'b'), { hubIds: ['a', 'b'], primary: 'b' });
  });
  it('keeps only the primary for a cashier, with a note', () => {
    assert.deepEqual(locationsForRole(true, ['a', 'b'], 'b'), { hubIds: ['b'], primary: 'b', note: 'A cashier works at one location.' });
  });
  it('falls back to the first location when the primary is not chosen', () => {
    assert.deepEqual(locationsForRole(false, ['a', 'b'], 'z'), { hubIds: ['a', 'b'], primary: 'a' });
    assert.deepEqual(locationsForRole(true, ['a', 'b'], undefined), { hubIds: ['a'], primary: 'a', note: 'A cashier works at one location.' });
  });
  it('gives a cashier with one location no note', () => {
    assert.deepEqual(locationsForRole(true, ['a'], 'a'), { hubIds: ['a'], primary: 'a' });
  });
});

describe('mergeAssignedHubs', () => {
  it('keeps locations the editor cannot see', () => {
    assert.deepEqual(mergeAssignedHubs(['lagos', 'ife'], new Set(['ife', 'nasarawa']), ['nasarawa']), ['lagos', 'nasarawa']);
  });
  it('lets the editor remove a location they can see', () => {
    assert.deepEqual(mergeAssignedHubs(['ife', 'nasarawa'], new Set(['ife', 'nasarawa']), ['ife']), ['ife']);
  });
});

describe('validateUserLocations', () => {
  it('needs no location for an admin', () => {
    assert.equal(validateUserLocations({ isAdminRole: true, isPosRole: false, hubIds: [] }), null);
  });
  it('needs at least one location', () => {
    assert.equal(validateUserLocations({ isAdminRole: false, isPosRole: false, hubIds: [] }), 'Choose at least one location.');
  });
  it('needs the primary among the chosen', () => {
    assert.equal(validateUserLocations({ isAdminRole: false, isPosRole: false, hubIds: ['a', 'b'], primary: 'c' }), 'The primary location must be one of the chosen locations.');
  });
  it('allows a cashier one location only', () => {
    assert.equal(validateUserLocations({ isAdminRole: false, isPosRole: true, hubIds: ['a', 'b'], primary: 'a' }), 'A cashier works at one location.');
  });
  it('accepts a good choice', () => {
    assert.equal(validateUserLocations({ isAdminRole: false, isPosRole: false, hubIds: ['a', 'b'], primary: 'b' }), null);
  });
});

describe('nextPrimary', () => {
  const editable = new Set(['ife', 'nasarawa']);
  it('keeps the primary while it is still chosen', () => {
    assert.equal(nextPrimary(['lagos', 'ife', 'nasarawa'], 'nasarawa', editable), 'nasarawa');
  });
  it('moves to a location the editor can see when the primary is unticked', () => {
    assert.equal(nextPrimary(['lagos', 'ife'], 'nasarawa', editable), 'ife');
  });
  it('hands back a primary the editor cannot see once one of theirs is chosen, unless it was the original', () => {
    assert.equal(nextPrimary(['lagos', 'ife'], 'lagos', editable, 'nasarawa'), 'ife');
    assert.equal(nextPrimary(['lagos', 'ife'], 'lagos', editable, 'lagos'), 'lagos');
  });
  it('falls back to the first location when none is the editor\'s', () => {
    assert.equal(nextPrimary(['lagos'], 'nasarawa', editable), 'lagos');
    assert.equal(nextPrimary([], 'nasarawa', editable), undefined);
  });
});

const hubOf = (id: string, parent: string | null = null) => ({ id, name: id, isActive: true, parentHubId: parent }) as unknown as Hub;
const HUBS = [hubOf('lagos'), hubOf('lekki', 'lagos'), hubOf('ife'), hubOf('modakeke', 'ife'), hubOf('nasarawa')];

describe('startingAssignment', () => {
  it('starts a new user at the editor\'s own hub, with nothing kept from before', () => {
    assert.deepEqual(startingAssignment({ isNew: true }, HUBS, 'ife'), { original: [], chosen: ['ife'], primary: 'ife' });
  });
  it('starts a new user with nothing when the editor has no hub (an admin picks)', () => {
    assert.deepEqual(startingAssignment({ isNew: true }, HUBS, undefined), { original: [], chosen: [], primary: undefined });
  });
  it('starts an edit from the user\'s locations, or from the location name on older records', () => {
    assert.deepEqual(startingAssignment({ isNew: false, hubIds: ['ife', 'nasarawa'] }, HUBS, 'lagos'), { original: ['ife', 'nasarawa'], chosen: ['ife', 'nasarawa'], primary: 'ife' });
    assert.deepEqual(startingAssignment({ isNew: false, location: 'lagos' }, HUBS, 'ife'), { original: ['lagos'], chosen: ['lagos'], primary: 'lagos' });
  });
});

describe('finalAssignment', () => {
  const editable = new Set(['ife', 'modakeke', 'nasarawa']);
  it('gives an admin no locations', () => {
    assert.deepEqual(finalAssignment({ adminRole: true, isPosRole: false, original: ['ife'], chosen: ['ife'], editable, primary: 'ife' }), { hubIds: [], primary: undefined });
  });
  it('keeps locations the editor cannot see and their primary choice', () => {
    assert.deepEqual(finalAssignment({ adminRole: false, isPosRole: false, original: ['lagos', 'ife'], chosen: ['ife', 'nasarawa'], editable, primary: 'nasarawa' }), { hubIds: ['lagos', 'ife', 'nasarawa'], primary: 'nasarawa' });
  });
  it('moves a cashier to the one location picked, even off a location the editor cannot change', () => {
    assert.deepEqual(finalAssignment({ adminRole: false, isPosRole: true, original: ['old'], chosen: ['ife'], editable, primary: 'ife' }), { hubIds: ['ife'], primary: 'ife' });
  });
  it('keeps a cashier where they are when nothing is picked', () => {
    assert.deepEqual(finalAssignment({ adminRole: false, isPosRole: true, original: ['old'], chosen: [], editable, primary: undefined }), { hubIds: ['old'], primary: 'old' });
  });
});

describe('primaryFirstIds', () => {
  it('puts the user\'s hub first whatever order the list came in', () => {
    assert.deepEqual(primaryFirstIds('nasarawa', ['ife', 'nasarawa']), ['nasarawa', 'ife']);
    assert.deepEqual(primaryFirstIds(undefined, ['ife', 'nasarawa']), ['ife', 'nasarawa']);
    assert.deepEqual(primaryFirstIds('ife', []), ['ife']);
  });
});

describe('managesOtherHubs', () => {
  it('does not count a hub\'s own RSPs', () => {
    assert.equal(managesOtherHubs(['lagos', 'lekki'], 'lagos', HUBS), false);
  });
  it('counts a second hub', () => {
    assert.equal(managesOtherHubs(['ife', 'modakeke', 'nasarawa'], 'ife', HUBS), true);
  });
});
