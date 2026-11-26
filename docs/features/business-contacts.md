# Business contacts

A business (B2B) customer holds several named contacts, for example the owner, the buyer and accounts. Each has a
role, a WhatsApp number and an optional email. One is primary. Individual (B2C) customers don't change.

Plan: [2026-11-26-business-contacts.md](../superpowers/plans/2026-11-26-business-contacts.md). Built as planned.

## What a person sees

- **Customer form, for a business:** a **Contacts** editor replaces the single Name, Phone and Email fields. Each
  contact has Name, Role, WhatsApp number and Email. **Add contact** adds one, **Make primary** moves the primary
  mark, and each contact can be removed. There is also a **Business address** field.
- **Customer profile, Overview → Business profile:** the business address, then **Contacts**, each with its role and a
  **WhatsApp** button. There are no Call buttons: customers are contacted by WhatsApp only.
- **Switching a business to an individual** keeps the primary contact as the person; switching back restores the
  contacts that were set aside.
- **Lists, search, sale pickers, credits** keep using the customer's name and phone, which are the primary contact's.
- **Customer export** adds Business address and Contacts (`Name (Role) phone [primary]; …`).

## Rules

`lib/customer-contacts.ts` (tested):
- Exactly one contact is primary, each has a name and a phone, and no phone repeats within a customer
  (`validateContacts`).
- A business saved before contacts existed shows one primary contact made from its current name and phone
  (`contactsOf`).
- The primary contact is written back to the customer's own name, phone and email, so everything that reads those
  keeps working.

## Backend contract

| Item | Shape and behaviour |
|------|---------------------|
| `ApiCustomer.contacts` | `{ _id: string; name: string; role?: string; phone: string; email?: string; is_primary: boolean }[]`. Present for `b2b`, absent or empty for `b2c`, on `GET customers/:id` **and every row of `GET customers`** (the edit form starts from the list row). |
| `ApiCustomer.business_address` | `string`, optional, `b2b` only. |
| `POST customers`, `PATCH customers/:id` | Accept `contacts` (the full list, replacing the old one; new contacts have no `_id`) and `business_address`. For `b2b` the server sets `customer_name`, `customer_phone` and `customer_email` from the primary contact. 400 when a `b2b` customer has no contacts, not exactly one primary, or a phone listed twice. |
| `GET customers?search=` | Also matches contact names and phones. |

## Files

`lib/customer-contacts.ts`, `lib/mock-api/customers.ts`, `app/(app)/customers/{contacts-editor,customer-form,customer-overview-tab}.tsx`,
`lib/exports/customers.ts`.
