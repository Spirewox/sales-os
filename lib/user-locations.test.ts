import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { locationsForRole, mergeAssignedHubs, nextPrimary, validateUserLocations } from './user-locations';

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
