# Customer contacts

Every customer can hold several named contacts. Each has a role, a WhatsApp number and an optional email.

- A **business** (B2B) lists its people, for example the owner, the buyer and accounts. One is primary.
- An **individual** (B2C) is their own primary contact and can add **other contacts**, for example a spouse, a driver
  or a housekeeper (added 27 Nov 2026 at the user's request).

Plan: [2026-11-26-business-contacts.md](../superpowers/plans/2026-11-26-business-contacts.md), which covered businesses
only. Contacts for individuals were added on 27 Nov.

## What a person sees

- **Customer form, for a business:** a **Contacts** editor replaces the single Name, Phone and Email fields. Each
  contact has Name, Role, WhatsApp number and Email. **Add contact** adds one, **Make primary** moves the primary
  mark, and each contact can be removed. There is also a **Business address** field.
- **Customer profile, Overview → Business profile:** the business address, then **Contacts**, each with its role and a
  **WhatsApp** button. There are no Call buttons: customers are contacted by WhatsApp only.
- **Customer form, for an individual:** Full name, Phone and Email stay as they are; they are the individual. An
  optional **Other contacts** section (open when there are some) adds people with Name, Role (suggested: Spouse,
  Family, Driver, Assistant, Housekeeper), WhatsApp number and Email. Each can be removed, down to none.
- **Customer profile, for an individual:** an **Other contacts** list, each with its role and a **WhatsApp** button,
  shown when there are some.
- **Switching type keeps everyone:** a business's primary contact becomes the individual and the rest become their
  other contacts; an individual becomes the business's primary contact, with their other contacts after.
- **Lists, search, sale pickers, credits** keep using the customer's name and phone, which are the primary contact's.
- **Search** finds a customer by any contact's name or phone, an individual's other contacts included.
- **Customer export** adds Business address and Contacts (`Name (Role) phone [primary]; …`), for businesses and for
  individuals with other contacts.

## Rules

`lib/customer-contacts.ts` (tested):
- Exactly one contact is primary, each has a name and a phone, and no phone repeats within a customer
  (`validateContacts`).
- A business saved before contacts existed shows one primary contact made from its current name and phone
  (`contactsOf`).
- The primary contact is written back to the customer's own name, phone and email, so everything that reads those
  keeps working.
- An individual's other contacts each need a name and a WhatsApp number, and no number may repeat, the individual's
  own included (`validateOtherContacts`). `withPerson` puts the individual in the primary place, and `otherContacts`
  lists the rest.

## Backend contract

| Item | Shape and behaviour |
|------|---------------------|
| `ApiCustomer.contacts` | `{ _id: string; name: string; role?: string; phone: string; email?: string; is_primary: boolean }[]`, on `GET customers/:id` **and every row of `GET customers`** (the edit form starts from the list row). For `b2b`, the business's people. For `b2c` (since 27 Nov), absent or empty, or the individual as primary followed by their other contacts. |
| `ApiCustomer.business_address` | `string`, optional, `b2b` only. |
| `POST customers`, `PATCH customers/:id` | Accept `contacts` (the full list, replacing the old one; new contacts have no `_id`) and `business_address`. For `b2b` the server sets `customer_name`, `customer_phone` and `customer_email` from the primary contact. 400 when a `b2b` customer has no contacts, not exactly one primary, or a phone listed twice. For `b2c`, `contacts` is sent only when the individual has other contacts (the individual first, `is_primary: true`, matching `customer_name` and `customer_phone`) or to clear them (`[]`); an older individual's primary may have no phone. 400 when an other contact has no name or phone, or a phone repeats. |
| `GET customers?search=` | Also matches contact names and phones. |

## Files

`lib/customer-contacts.ts`, `lib/mock-api/customers.ts`, `app/(app)/customers/{contacts-editor,customer-form,customer-overview-tab}.tsx`
(`ContactsEditor` has a `mode="others"` for an individual's other contacts),
`lib/exports/customers.ts`.
