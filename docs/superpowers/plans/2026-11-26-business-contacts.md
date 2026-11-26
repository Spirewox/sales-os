# Business Profiles with Multiple Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A business customer holds several named contacts, for example the owner, the buyer and accounts. Each contact has a role, a phone and an optional email, and can be messaged on WhatsApp from the customer's profile. One contact is primary.

**Architecture:**
- **The data:** contacts are an array on the customer. Individual (B2C) customers don't change.
- **The rules:** a pure module, `lib/customer-contacts.ts`, holds them. Exactly one contact is primary, phones aren't repeated within a customer, and each contact has a name and phone. It also gives existing businesses with no contacts a synthesised primary from their current name and phone.
- **Old fields stay:** the primary contact is written back to the customer's own `customer_name`, `customer_phone` and `customer_email`. Lists, search, sales pickers, credit and exports keep working unchanged.
- **The screens:**
  - The customer form shows a Contacts editor for businesses in place of the single Name, Phone and Email fields.
  - The customer profile's Business profile section lists the contacts, each with a WhatsApp button.

**Tech Stack:** Next.js 16.2.3, React 19, TanStack Query, `node --test`, the `@/components/app` kit (`FormSheet`, `FormSection`, `FormField`, `StatusBadge`), `Button`.

**Spec:** The user's request "business profiles with multiple contacts" plus [the shared notes](2026-11-26-README.md).

## API contract (backend)

| Item | Shape and behaviour |
|------|---------------------|
| `ApiCustomer.contacts` | `{ _id: string; name: string; role?: string; phone: string; email?: string; is_primary: boolean }[]`. Present for `b2b` and absent or empty for `b2c`. |
| `ApiCustomer.business_address` | `string`, optional, for `b2b` only. |
| `POST customers`, `PATCH customers/:id` | Accept `contacts` (the full list, which replaces the old one; new contacts have no `_id`) and `business_address`. For `b2b`, the server sets `customer_name`, `customer_phone` and `customer_email` from the primary contact. It answers 400 when a `b2b` customer has no contacts, has other than exactly one primary, or lists a phone twice. |
| `GET customers?search=` | Also matches contact names and phones. |
| `GET customers/export` | Adds the columns `Contacts` (`Name (Role) phone; …`) and `Business address`. |

## Global Constraints

- **Limits:** at most 20 contacts, and at least 1 for a business. The role is free text, at most 40 characters, with suggestions `Owner`, `Buyer`, `Accounts`, `Manager` and `Driver` in a `datalist`.
- **Copy:**
  - Section title: `Contacts`.
  - Add button: `Add contact` (ghost, with a `Plus` icon).
  - Remove button: icon-only, `aria-label="Remove <name or 'this contact'>"`.
  - Primary: a `StatusBadge` with tone `good`, reading `Primary`, on the primary row. The other rows get a ghost xs button, `Make primary`.
  - Field labels: `Name`, `Role` (hint `Optional`), `WhatsApp number`, `Email` (hint `Optional`).
  - Business address field: `Business address` (hint `Optional`).
- **Validation messages** (shown with the form's existing `toast.error` and `disabledReason`):
  - `Add at least one contact.`
  - `Each contact needs a name and a WhatsApp number.`
  - `<phone> is listed twice.`
  - `Choose a primary contact.`
- **WhatsApp only.**
  - Each contact row in the profile has a WhatsApp `Button` rendered as a link to `whatsappHref(phone)` (`app/(app)/customers/customer-links.ts:17`), with `aria-label="WhatsApp <name>"`.
  - There is no Call button. A contact without a real phone (`hasPhone` is false) gets no button.
- **Nothing is removed.** Category stays in Business profile. The B2C form doesn't change.

## Review Focus

1. **Existing businesses with no contacts:** the profile shows one primary contact built from the customer's name, phone and email. Editing and saving writes it as a real contact. Tested in `contactsOf`.
2. **Removing the primary contact:** the first remaining contact becomes primary, so the form never sits in the "Choose a primary contact" state after a remove. Tested in `removeContact`.
3. **Switching a business to an individual:** the form drops the contacts, the primary's name, phone and email fill the B2C fields, and the save sends `contacts: []`. Tested in `contactsToIndividual`.
4. **Phone formats:** `0803 123 4567` and `+2348031234567` count as the same number for the duplicate check. `normalisePhone` uses the same rule as `whatsappHref`, and is tested.
5. **Leaving with edits:** the form sheet's existing unsaved-changes guard sees contact edits as dirty. The contacts array is part of the form state the guard compares.

---

### Task 1: The contacts rule

**Files:**
- Create: `lib/customer-contacts.ts`
- Test: `lib/customer-contacts.test.ts`
- Modify: `types.ts`. Add `CustomerContact` and `Customer.contacts?: CustomerContact[]`, `Customer.businessAddress?: string`.
- Modify: `types/api.ts` (`ApiCustomer` fields from the contract)
- Modify: `lib/api-mappers.ts:204` (`mapCustomer` maps `contacts` and `business_address`)

**Interfaces:**
- Produces:
  - `type CustomerContact = { id: string; name: string; role?: string; phone: string; email?: string; isPrimary: boolean }`. A new, unsaved contact has an id starting `new-`.
  - `normalisePhone(phone: string): string`: digits, with a leading `0` on 11 digits replaced by `234`.
  - `contactsOf(c: Pick<Customer, 'type' | 'name' | 'phone' | 'email' | 'contacts'>): CustomerContact[]`
  - `validateContacts(list: CustomerContact[]): string | null`
  - `setPrimary(list: CustomerContact[], id: string): CustomerContact[]`
  - `removeContact(list: CustomerContact[], id: string): CustomerContact[]`
  - `addContact(list: CustomerContact[]): CustomerContact[]`: appends an empty contact, primary if the list was empty.
  - `primaryContact(list: CustomerContact[]): CustomerContact | undefined`
  - `toApiContacts(list: CustomerContact[]): ApiCustomerContactInput[]`: strips `new-` ids and trims the strings.
  - `contactsToIndividual(list: CustomerContact[]): { name: string; phone: string; email?: string }`

- [ ] **Step 1: Write the failing tests:**

```ts
it('synthesises a primary from a business with no contacts', () => {
  assert.deepEqual(contactsOf({ type: CustomerType.B2B, name: 'Ada Obi', phone: '08031234567', email: 'ada@x.ng' }),
    [{ id: 'legacy-primary', name: 'Ada Obi', phone: '08031234567', email: 'ada@x.ng', isPrimary: true }]);
});
it('gives individuals no contacts', () => { assert.deepEqual(contactsOf({ type: CustomerType.B2C, name: 'A', phone: '1' }), []); });
it('requires one contact', () => { assert.equal(validateContacts([]), 'Add at least one contact.'); });
it('requires name and phone', () => { /* name '' → 'Each contact needs a name and a WhatsApp number.' */ });
it('finds duplicate phones across formats', () => {
  assert.equal(validateContacts([c('a', '0803 123 4567', true), c('b', '+2348031234567')]), '+2348031234567 is listed twice.');
});
it('requires exactly one primary', () => { /* none primary → 'Choose a primary contact.' */ });
it('setPrimary moves the flag', () => { /* only the chosen id is primary */ });
it('removing the primary promotes the first remaining', () => { /* remove a(primary) from [a,b,c] → b primary */ });
it('toApiContacts drops new- ids and trims', () => { /* { id: 'new-1', name: ' Bisi ' } → { name: 'Bisi', is_primary } with no _id */ });
it('contactsToIndividual takes the primary', () => { /* returns the primary's name, phone, email */ });
```

- [ ] **Step 2:** Run `npm test`. Expected FAIL (module missing).
- [ ] **Step 3:** Implement the module, the types and the mapper.
- [ ] **Step 4:** Run `npm test`. Expected PASS.
- [ ] **Step 5: Commit.** `git commit -m "Add the business contacts rule"`

### Task 2: Save contacts, and the mock

**Files:**
- Modify: `hooks/use-queries.ts:967` and `:1005`. The payloads of `useCreateCustomer` and `useUpdateCustomer` accept `contacts?: ApiCustomerContactInput[]` and `business_address?: string`.
- Modify: `lib/mock-api/handler.ts`
  - `customers/:id` GET returns the stored contacts.
  - POST and PATCH `customers` keep `contacts` in memory on `db.customers`, so a saved edit shows until reload.
  - The `customers` list search also matches contact names and phones.
- Modify: `lib/mock-api/data.ts`. Give the first three B2B customers 2 to 3 contacts each (`Owner`, `Buyer`, `Accounts`). Leave one business with none, to show Review Focus 1.

- [ ] **Step 1:** Make the edits. Run `npx tsc --noEmit`. Expected no errors.
- [ ] **Step 2: Commit.** `git commit -m "Send and store customer contacts"`

### Task 3: The Contacts editor in the customer form

**Files:**
- Create: `app/(app)/customers/contacts-editor.tsx`
- Modify: `app/(app)/customers/customer-form.tsx`
  - **Business selected:** the separate Name, Phone and Email fields give way to `<ContactsEditor>` in a `FormSection` titled `Contacts`. Company name stays required and above it. Business address sits under Category.
  - **On save** (`:149-190`): run `validateContacts` first, show its message, and send `contacts: toApiContacts(list)`. Also send `customer_name`, `customer_phone` and `customer_email` from `primaryContact(list)`, so an older API that ignores `contacts` still saves the main person.
  - **Switching type** (`:221`): to Individual, use `contactsToIndividual`. To Business, seed the list with `contactsOf` of the current name, phone and email.
  - **`disabledReason`:** it includes `validateContacts(list)` when the type is Business.
- Create: `stories/contacts-editor.stories.tsx`, with these stories: one contact, three contacts, a duplicate phone, and empty.

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces: `ContactsEditor({ contacts, onChange, idPrefix }: { contacts: CustomerContact[]; onChange: (next: CustomerContact[]) => void; idPrefix: string })`

- [ ] **Step 1: Build `ContactsEditor`.**
  - Each contact is a bordered `rounded-md` block. It holds Name, Role (`input list="contact-roles"`), WhatsApp number (`type="tel"`) and Email (`type="email"`), using `FormField` and `fieldClass`.
  - The block header holds the `Primary` badge or the `Make primary` button, and the remove icon button. Remove is hidden when only one contact is left.
  - The `Add contact` button goes last and is disabled at 20.
  - At 390 px the four fields stack. From `sm` up, Name and Role share a row, as do WhatsApp number and Email.
- [ ] **Step 2: Wire it into the form, then check in mock mode.**
  1. Create a business with two contacts.
  2. Make the second primary and save. The list row shows the new primary's name and phone.
  3. Edit the business with no contacts. It opens with one primary built from its fields.
  4. Remove the primary. The next contact becomes primary.
  5. Enter a duplicate phone. Save is disabled with the message.
- [ ] **Step 3:** Run `node scripts/check.mjs` (exit 0). Check the form at 390 and 1280 px, in light and dark.
- [ ] **Step 4: Commit.** `git commit -m "Edit several contacts on a business customer"`

### Task 4: Contacts on the customer profile

**Files:**
- Modify: `app/(app)/customers/customer-overview-tab.tsx:116-123`
  - For B2B, Business profile keeps its rows (Category, plus Business address when set).
  - Below it, add a `Contacts` sub-list from `contactsOf(customer)`. Each row reads name, then role in muted `text-xs`, then the phone, the `Primary` badge on the primary row, and a WhatsApp `Button` (`variant="outline" size="sm"`, rendered as a link to `whatsappHref(phone)`).
  - The primary comes first, then the rest in saved order.
- Modify: `app/(app)/customers/customer-detail-panel.tsx`. The header WhatsApp action, if present, uses the primary contact's phone, which is still `customer.phone`, so check this rather than change it.

- [ ] **Step 1:** Make the edit. In mock mode, open a business with three contacts. Check that each WhatsApp link points at that contact's `wa.me` number and that there is no Call action.
- [ ] **Step 2:** Run `node scripts/check.mjs` (exit 0). Check the profile at 390 and 1280 px, in light and dark.
- [ ] **Step 3: Commit.** `git commit -m "Show business contacts with WhatsApp on the customer profile"`

**Left for later** (not part of this plan): recording which contact placed a sale. That needs `contact_id` on sales, and the sale form would offer the customer's contacts.
