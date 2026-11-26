import type { Customer, CustomerContact } from '@/types';
import { isPlaceholderPhone } from '@/lib/customer-helpers';

export type { CustomerContact };
/** What the API takes: the full list, replacing the old one. New contacts have no `_id`. */
export type ApiCustomerContactInput = { _id?: string; name: string; role?: string; phone: string; email?: string; is_primary: boolean };

export const MAX_CONTACTS = 20;
/** A contact built from a business's own name and phone, before it has saved contacts. */
const LEGACY_ID = 'legacy-primary';

/** Digits only, with a local 11-digit 0803… number written as 234803…, the rule whatsappHref uses. */
export function normalisePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = `234${digits.slice(1)}`;
  return digits;
}

const isBusiness = (type: Customer['type']) => String(type) === 'B2B';
export const primaryFirst = (list: CustomerContact[]) => [...list].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

/**
 * A customer's contacts, primary first. A business saved before contacts existed gets one primary
 * built from its own name, phone and email; it becomes a real contact on the next save.
 */
export function contactsOf(c: Pick<Customer, 'type' | 'name' | 'phone' | 'email' | 'contacts'>): CustomerContact[] {
  if (!isBusiness(c.type)) return [];
  if (c.contacts?.length) return primaryFirst(c.contacts);
  // Older records store a missing phone as a placeholder such as N/A: show an empty field instead.
  const phone = isPlaceholderPhone(c.phone) ? '' : c.phone;
  return [{ id: LEGACY_ID, name: c.name, phone, ...(c.email ? { email: c.email } : {}), isPrimary: true }];
}

/** A number WhatsApp can reach: some digits, and not a placeholder such as N/A. */
const isRealPhone = (phone: string) => /\d/.test(phone) && !isPlaceholderPhone(phone);

/**
 * The first problem with a business's contact list, worded for the form, or null. With
 * `legacyMayLackPhone`, an older business's synthesised primary may have no number, as older
 * records without a phone stay editable.
 */
export function validateContacts(list: CustomerContact[], opts: { legacyMayLackPhone?: boolean } = {}): string | null {
  if (list.length === 0) return 'Add at least one contact.';
  const phoneOk = (x: CustomerContact) => isRealPhone(x.phone) || (opts.legacyMayLackPhone === true && x.id === LEGACY_ID && !x.phone.trim());
  if (list.some((x) => !x.name.trim() || !phoneOk(x))) return 'Each contact needs a name and a WhatsApp number.';
  const seen = new Set<string>();
  for (const x of list) {
    if (!x.phone.trim()) continue;
    const key = normalisePhone(x.phone);
    if (seen.has(key)) return `${x.phone.trim()} is listed twice.`;
    seen.add(key);
  }
  if (list.filter((x) => x.isPrimary).length !== 1) return 'Choose a primary contact.';
  return null;
}

export const setPrimary = (list: CustomerContact[], id: string) => list.map((x) => ({ ...x, isPrimary: x.id === id }));

/** Remove one contact; when it was the primary, the first one left takes over. */
export function removeContact(list: CustomerContact[], id: string): CustomerContact[] {
  const removed = list.find((x) => x.id === id);
  const rest = list.filter((x) => x.id !== id);
  if (removed?.isPrimary && rest.length) return rest.map((x, i) => ({ ...x, isPrimary: i === 0 }));
  return rest;
}

let seq = 0;
/** Append an empty contact; it is the primary when the list was empty. */
export function addContact(list: CustomerContact[]): CustomerContact[] {
  seq += 1;
  return [...list, { id: `new-${Date.now().toString(36)}-${seq}`, name: '', phone: '', isPrimary: list.length === 0 }];
}

export const primaryContact = (list: CustomerContact[]) => list.find((x) => x.isPrimary);

const blank = (s?: string) => (s && s.trim() ? s.trim() : undefined);

export function toApiContacts(list: CustomerContact[]): ApiCustomerContactInput[] {
  return list.map((x) => ({
    ...(x.id.startsWith('new-') || x.id === LEGACY_ID ? {} : { _id: x.id }),
    name: x.name.trim(),
    role: blank(x.role),
    phone: x.phone.trim(),
    email: blank(x.email),
    is_primary: x.isPrimary,
  }));
}

/** Switching a business to an individual: the primary contact becomes the customer's own details. */
export function contactsToIndividual(list: CustomerContact[]): { name: string; phone: string; email?: string } {
  const p = primaryContact(list) ?? list[0];
  return { name: p?.name ?? '', phone: p?.phone ?? '', email: p?.email };
}

/**
 * Switching an individual back to a business in the same form: bring back the contacts set aside
 * on the way to individual, with the primary taking the individual's edited name, phone and email.
 */
export function restoreBusinessContacts(parked: CustomerContact[], individual: { name: string; phone: string; email?: string }): CustomerContact[] {
  if (!parked.length) return contactsOf({ type: 'B2B' as Customer['type'], ...individual });
  return parked.map((x) => (x.isPrimary ? { ...x, name: individual.name, phone: individual.phone, email: individual.email } : x));
}
