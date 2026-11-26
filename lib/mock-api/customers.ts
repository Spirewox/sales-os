/**
 * Mock answers for saving a customer and searching customers, contacts included. Kept apart from
 * handler.ts (which reaches runtime enums) so `npm test` can load it.
 */
import type { ApiCustomer } from '@/types/api';

type ContactInput = { _id?: string; name: string; role?: string; phone: string; email?: string; is_primary: boolean };
type Body = Partial<Omit<ApiCustomer, 'contacts'>> & { contacts?: ContactInput[] };

let seq = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(seq += 1)}`;

/** The text a customer search matches: the customer's own fields and every contact's name and phone. */
export function customerSearchFields(c: ApiCustomer): string[] {
  return [
    c.customer_name, c.company_name ?? '', c.customer_phone, c.customer_email ?? '',
    ...(c.contacts ?? []).flatMap((x) => [x.name, x.phone]),
  ];
}

/** POST customers (id null) or PATCH customers/:id: store the body, contacts with ids, until a reload. */
export function saveCustomer(customers: ApiCustomer[], id: string | null, body: Body): { status: number; data: unknown } {
  const contacts = body.contacts?.map((x) => ({ ...x, _id: x._id ?? nextId('ct') }));
  if (id === null) {
    const created = { ...body, _id: nextId('cust'), contacts, customer_type: String(body.customer_type ?? 'b2c').toUpperCase() } as ApiCustomer;
    customers.push(created);
    return { status: 200, data: created };
  }
  const c = customers.find((x) => x._id === id);
  if (!c) return { status: 404, data: { message: 'Customer not found.' } };
  Object.assign(c, { ...body, ...(contacts ? { contacts } : {}) });
  if (body.customer_type) c.customer_type = String(body.customer_type).toUpperCase();
  return { status: 200, data: c };
}
