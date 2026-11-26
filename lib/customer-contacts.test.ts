import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addContact, contactsOf, contactsToIndividual, normalisePhone, primaryContact, removeContact, restoreBusinessContacts, setPrimary, toApiContacts, validateContacts,
  type CustomerContact,
} from './customer-contacts';
import type { Customer } from '@/types';

const B2B = 'B2B' as Customer['type'];
const B2C = 'B2C' as Customer['type'];
const c = (id: string, phone: string, isPrimary = false, name = `Person ${id}`): CustomerContact => ({ id, name, phone, isPrimary });

describe('normalisePhone', () => {
  it('turns a local number into the international one', () => {
    assert.equal(normalisePhone('0803 123 4567'), '2348031234567');
    assert.equal(normalisePhone('+234 803-123-4567'), '2348031234567');
  });
});

describe('contactsOf', () => {
  it('synthesises a primary from a business with no contacts', () => {
    assert.deepEqual(contactsOf({ type: B2B, name: 'Ada Obi', phone: '08031234567', email: 'ada@x.ng' }),
      [{ id: 'legacy-primary', name: 'Ada Obi', phone: '08031234567', email: 'ada@x.ng', isPrimary: true }]);
  });
  it('returns saved contacts, primary first', () => {
    const saved = [c('a', '1'), c('b', '2', true)];
    assert.deepEqual(contactsOf({ type: B2B, name: 'x', phone: '1', contacts: saved }).map((x) => x.id), ['b', 'a']);
  });
  it('gives individuals no contacts', () => {
    assert.deepEqual(contactsOf({ type: B2C, name: 'A', phone: '1' }), []);
  });
});

describe('validateContacts', () => {
  it('requires one contact', () => { assert.equal(validateContacts([]), 'Add at least one contact.'); });
  it('requires name and phone', () => {
    assert.equal(validateContacts([c('a', '0803', true, ' ')]), 'Each contact needs a name and a WhatsApp number.');
    assert.equal(validateContacts([c('a', '', true)]), 'Each contact needs a name and a WhatsApp number.');
  });
  it('finds duplicate phones across formats', () => {
    assert.equal(validateContacts([c('a', '0803 123 4567', true), c('b', '+2348031234567')]), '+2348031234567 is listed twice.');
  });
  it('requires exactly one primary', () => {
    assert.equal(validateContacts([c('a', '1'), c('b', '2')]), 'Choose a primary contact.');
    assert.equal(validateContacts([c('a', '1', true), c('b', '2', true)]), 'Choose a primary contact.');
  });
  it('accepts a good list', () => { assert.equal(validateContacts([c('a', '1', true), c('b', '2')]), null); });
});

describe('editing the list', () => {
  it('setPrimary moves the flag', () => {
    assert.deepEqual(setPrimary([c('a', '1', true), c('b', '2')], 'b').map((x) => x.isPrimary), [false, true]);
  });
  it('removing the primary promotes the first remaining', () => {
    const next = removeContact([c('a', '1', true), c('b', '2'), c('c', '3')], 'a');
    assert.deepEqual(next.map((x) => [x.id, x.isPrimary]), [['b', true], ['c', false]]);
  });
  it('removing another keeps the primary', () => {
    assert.equal(primaryContact(removeContact([c('a', '1', true), c('b', '2')], 'b'))?.id, 'a');
  });
  it('addContact appends an empty contact, primary when the list was empty', () => {
    const one = addContact([]);
    assert.equal(one.length, 1);
    assert.equal(one[0].isPrimary, true);
    assert.match(one[0].id, /^new-/);
    const two = addContact(one);
    assert.equal(two[1].isPrimary, false);
    assert.notEqual(two[0].id, two[1].id);
  });
});

describe('toApiContacts', () => {
  it('drops new- and legacy ids and trims', () => {
    assert.deepEqual(toApiContacts([
      { id: 'new-1', name: ' Bisi ', role: ' Buyer ', phone: ' 0803 ', email: '', isPrimary: true },
      { id: 'legacy-primary', name: 'Old', phone: '1', isPrimary: false },
      { id: 'c9', name: 'Kept', phone: '2', isPrimary: false },
    ]), [
      { name: 'Bisi', role: 'Buyer', phone: '0803', email: undefined, is_primary: true },
      { name: 'Old', role: undefined, phone: '1', email: undefined, is_primary: false },
      { _id: 'c9', name: 'Kept', role: undefined, phone: '2', email: undefined, is_primary: false },
    ]);
  });
});

describe('contactsToIndividual', () => {
  it('takes the primary', () => {
    assert.deepEqual(contactsToIndividual([c('a', '1'), { ...c('b', '2', true), email: 'b@x.ng' }]), { name: 'Person b', phone: '2', email: 'b@x.ng' });
  });
  it('is empty with no contacts', () => {
    assert.deepEqual(contactsToIndividual([]), { name: '', phone: '', email: undefined });
  });
});

describe('review fixes', () => {
  it('blanks a placeholder phone when building the legacy primary', () => {
    assert.equal(contactsOf({ type: B2B, name: 'Old Co', phone: 'N/A' })[0].phone, '');
  });
  it('lets an older business keep a primary with no phone when asked', () => {
    const legacy = contactsOf({ type: B2B, name: 'Old Co', phone: '' });
    assert.equal(validateContacts(legacy), 'Each contact needs a name and a WhatsApp number.');
    assert.equal(validateContacts(legacy, { legacyMayLackPhone: true }), null);
  });
  it('rejects placeholder and digit-free phones', () => {
    assert.equal(validateContacts([c('a', 'n/a', true)]), 'Each contact needs a name and a WhatsApp number.');
    assert.equal(validateContacts([c('a', 'abc', true), c('b', 'xyz')]), 'Each contact needs a name and a WhatsApp number.');
  });
  it('brings the business contacts back after a switch to individual and back, with the primary updated', () => {
    const parked = [{ ...c('a', '0803', true, 'Owner Name'), role: 'Owner' }, c('b', '0812')];
    const back = restoreBusinessContacts(parked, { name: 'Edited Name', phone: '0809', email: 'e@x.ng' });
    assert.deepEqual(back.map((x) => [x.id, x.name, x.phone, x.isPrimary]), [['a', 'Edited Name', '0809', true], ['b', 'Person b', '0812', false]]);
    assert.equal(back[0].role, 'Owner');
  });
  it('starts from the individual when there is nothing to bring back', () => {
    const back = restoreBusinessContacts([], { name: 'Solo', phone: '0700' });
    assert.deepEqual(back.map((x) => [x.name, x.phone, x.isPrimary]), [['Solo', '0700', true]]);
  });
});
