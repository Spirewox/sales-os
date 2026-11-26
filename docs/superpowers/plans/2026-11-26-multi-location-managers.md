# Multi-Location Managers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A user who isn't a Company Admin can be given several locations. They can then switch between those locations, or look at "All my locations" together, across every screen, the same way an admin switches between all locations.

**Architecture:**
- **The data:** a user gets `hub_ids` (assigned locations), with `hub_id` kept as their primary. The API already sends `visible_hub_ids` on whoami, which `AppUser.visibleHubIds` holds but nothing reads yet.
- **One source for the location list:** a pure module, `lib/hub-visibility.ts`, computes the locations a user may see. `useHubScopeFilter` uses it, so every page that already follows the location switcher gains multi-location support at once.
- **"All" for these users** means the API's own permitted set. The client sends no `hub_id`, and the server limits results to the visible hubs.
- **The user form:** Settings → Users gets a multi-location picker for roles that may hold several locations.
- **Mock mode:** gains a second persona, so the feature can be checked locally.

**Tech Stack:** Next.js 16.2.3, React 19, TanStack Query, `node --test`, the `@/components/app` kit, `Checkbox`.

**Spec:** The user's request "users that manage multiple locations like the admin" plus [the shared notes](2026-11-26-README.md).

## API contract (backend)

| Item | Shape and behaviour |
|------|---------------------|
| User record | `hub_ids: string[]` (assigned locations, at least 1 for non-admin roles) and `hub_id` (primary, one of `hub_ids`). |
| `POST users`, `PATCH users/:id` | Accept `hub_ids` and `hub_id`. Answer 400 `Choose at least one location.` when empty, and 400 `The primary location must be one of the chosen locations.` A POS (cashier) role is answered 400 `A cashier works at one location.` when `hub_ids.length > 1`. A caller can only assign locations in their own visible set (403). |
| `GET users` | Each user gains `hubs: { _id: string; hub_name: string }[]`. `hub_id=` matches users assigned to that hub. |
| `GET auth/whoami` | `visible_hub_ids` = assigned hubs plus their child RSPs. `data_scope` stays `hub`. |
| Every scoped list and metric | With no `hub_id`, the server limits to `visible_hub_ids`. With a `hub_id` outside it, the server answers 403. This is the existing rule for one hub, applied to a set. |

## Global Constraints

- **Who can hold several locations:** every role except Company Admin (who holds all) and the POS cashier role (`isPosRoleSelection`, `lib/settings-helpers.ts:14`), which holds one.
- **Copy:**
  - **User form field:** `Locations`, required. Choosing is a `Checkbox` list. Each hub is followed by its RSPs, indented, with labels from `hubOptionLabel`.
  - **Primary location:** a select labelled `Primary location` (hint `Used for their till PIN and as the default in forms`), listing only the chosen locations. It shows only when 2 or more locations are chosen.
  - **"All" label:**
    - `All my locations` for a non-global user with 2 or more visible locations.
    - `All locations` for a Company Admin, unchanged.
    - The Analytics Locations tab's fixed label follows the same rule.
  - **Users list Location column:** `<primary>` when there is one location, `<primary> +<n>`, with a `title` listing all of them, when there are more.
  - **Validation messages:** the three 400 messages in the contract, checked on the client first.
- **Nothing is removed.**
  - Single-location users see exactly what they see today: no switcher and a locked location name.
  - Admins see exactly what they see today.

## Review Focus

1. **A manager with one hub and its RSPs (today's Hub Manager):** they keep today's view. `visibleHubs` with `visibleHubIds` empty falls back to the current rule (`h.id === hubId || h.parentHubId === hubId`), tested.
2. **A location in the URL or saved state that the user can't see:** for example, a link shared by an admin. The scope falls back to "All my locations", because `filterHub` already does this when `activeHubs` lacks the name. Tested through `resolveFilterHub`.
3. **A manager editing a colleague:** they only see and assign locations in their own visible set. When the colleague has a location outside that set, it is kept on save, not dropped. The form shows it as a disabled, checked row with the hint `Outside your locations`. Tested in `mergeAssignedHubs`.
4. **Switching role to cashier with several locations chosen:** the form keeps only the primary and shows `A cashier works at one location.` as a hint. Tested in `locationsForRole`.
5. **Inactive locations:** a deactivated hub disappears from the switcher (today's `isActive` filter), but stays assigned to the user. The form shows it disabled with `Inactive`.

---

### Task 1: The visibility rule

**Files:**
- Create: `lib/hub-visibility.ts`
- Test: `lib/hub-visibility.test.ts`

**Interfaces:**
- Produces:
  - `type ScopeInput = { isGlobal: boolean; hubId: string | null; visibleHubIds?: string[] }`
  - `visibleHubs(hubs: Hub[], scope: ScopeInput): Hub[]`: active hubs only. Global gives all active. A non-empty `visibleHubIds` gives the hubs whose id is in it. Otherwise it is the current rule (the hub and its children).
  - `allLocationsLabel(isGlobal: boolean): 'All locations' | 'All my locations'`
  - `resolveFilterHub(selected: string, visible: Hub[]): string`: `selected` if a visible hub has that name, else `'All'`.
  - `assignedSummary(names: string[]): { label: string; title?: string }`: `['Lagos Hub']` → `{ label: 'Lagos Hub' }`; `['Lagos Hub','Ife Hub','Yaba RSP']` → `{ label: 'Lagos Hub +2', title: 'Lagos Hub, Ife Hub, Yaba RSP' }`.

- [ ] **Step 1: Write the failing tests:**

```ts
it('global sees every active hub', () => { assert.equal(visibleHubs(HUBS, { isGlobal: true, hubId: null }).length, ACTIVE_COUNT); });
it('falls back to hub plus children when visibleHubIds is empty', () => {
  assert.deepEqual(ids(visibleHubs(HUBS, { isGlobal: false, hubId: 'hub_lagos', visibleHubIds: [] })), ['hub_lagos', 'rsp_lekki', 'rsp_yaba']);
});
it('uses visibleHubIds when given', () => {
  assert.deepEqual(ids(visibleHubs(HUBS, { isGlobal: false, hubId: 'hub_ife', visibleHubIds: ['hub_ife', 'rsp_modakeke', 'hub_nasarawa'] })), ['hub_ife', 'rsp_modakeke', 'hub_nasarawa']);
});
it('drops inactive hubs even when visible', () => { /* an inactive id in visibleHubIds is not returned */ });
it('labels All by scope', () => { assert.equal(allLocationsLabel(false), 'All my locations'); });
it('falls back to All for a hidden location', () => { assert.equal(resolveFilterHub('Lagos Hub', visibleIfe), 'All'); });
it('summarises assigned locations', () => { /* the two cases in Interfaces */ });
```

  `HUBS` is a fixture shaped like `lib/mock-api/data.ts` hubs, after `mapHub`.
- [ ] **Step 2:** Run `npm test`. Expected FAIL.
- [ ] **Step 3:** Implement the module.
- [ ] **Step 4:** Run `npm test`. Expected PASS.
- [ ] **Step 5: Commit.** `git commit -m "Add the location visibility rule"`

### Task 2: Scope hooks use it

**Files:**
- Modify: `hooks/use-data-scope.ts`. Return `visibleHubIds: user?.visibleHubIds ?? []` as well.
- Modify: `hooks/use-hub-scope.ts:14-15`. `activeHubs = visibleHubs(hubs, { isGlobal, hubId, visibleHubIds })`, and `filterHub = resolveFilterHub(selectedHub, activeHubs)`. Add `allLabel: allLocationsLabel(isGlobal)` to the return value, so `HubScopeFilter` carries it.
- Modify: `components/app/location-select.tsx:36`. The `All` option's label is `scope.allLabel ?? ALL_LOCATIONS_LABEL`. Make `allLabel` optional on the package's `LocationScope` type (`packages/ui/adapters/location.ts`) so the library stays compatible.
- Modify: `app/(app)/analytics/page.tsx`. The Locations tab's `fixed.label` uses `hubScope.allLabel`.
- **Review only, no expected change:** each direct `useDataScope().canSwitchHubs` reader from this list:
  - `components/layout/sidebar.tsx`
  - `app/(app)/sales/use-sales-filters.ts`
  - `app/(app)/engagement/churn.tsx`
  - `app/(app)/inventory/forms/create-sku-form.tsx` and `edit-sku-form.tsx`
  - `app/(app)/kitchen/settings.tsx` and `job-form-sections.tsx`
  - `app/(app)/settings/use-settings-data.ts`

  Where the reader decides whether a location can be chosen, switch it to `useHubScopeFilter().canSwitchHubs`. Where it decides company-wide admin powers, keep `isGlobal`. Record each decision in the commit message.
- Story: update the `LocationSelect` story with an `All my locations` case.

- [ ] **Step 1:** Make the edits. Run `npm test` and `npx tsc --noEmit`. Expected PASS, no errors.
- [ ] **Step 2:** Run `node scripts/check.mjs`. Expected exit 0. Rebuild the docs with `node scripts/gen-docs.mjs` if the `LocationSelect` twin's call-site count changed.
- [ ] **Step 3: Commit.** `git commit -m "Scope location switching to the user's visible locations"`

### Task 3: A multi-location persona in mock mode

**Files:**
- Modify: `lib/mock-auth.ts`
  - Add `MOCK_MULTI_USER: AppUser`: Kunle Oyewole, Hub Manager, `dataScope: 'hub'`, `hubId: 'hub_ife'`, `visibleHubIds: ['hub_ife','rsp_modakeke','hub_nasarawa']`, with `DEFAULT_ROLE_PERMISSIONS['Hub Manager']` mapped through `PERMISSION_MAP`.
  - Add `mockUserForEmail(email: string): AppUser`, which gives `MOCK_MULTI_USER` for an email starting `multi@`, else `MOCK_USER`. Store the chosen persona with the session (`fudfarmer_mock_session` holds `'1'` or `'multi'`).
- Modify: `lib/mock-api/handler.ts`
  - `auth/login` and `auth/whoami` answer with the session's persona. The handler reads the session through an exported `mockSessionPersona()` from `mock-auth.ts`.
  - When the persona is multi, list routes that take `hub_id` limit rows to its `visibleHubIds` when `hub_id` is absent. Put that in one helper, `scopeRows(rows, hubOf)`, used by the sales, customers, inventory, credits and dashboard routes.
- Modify: `app/login/page.tsx`. The local demo hint adds: `Use multi@fudfarmer.local to see a manager with three locations.`
- Test: `lib/hub-visibility.test.ts`. Add `it('mock multi persona sees three locations')`, using `visibleHubs(mapped mock hubs, MOCK_MULTI_USER)`.

- [ ] **Step 1:** Write the test and see it fail, then implement.
- [ ] **Step 2:** Sign in as `multi@fudfarmer.local`. Check:
  1. The switcher offers All my locations, Ife Hub, Modakeke RSP and Nasarawa Hub.
  2. The dashboard totals change when switching.
  3. Analytics → Locations compares those three only.
  4. A Lagos link (`?hub=Lagos Hub`) falls back to All my locations.
- [ ] **Step 3: Commit.** `git commit -m "Add a multi-location persona to mock mode"`

### Task 4: Assign several locations in Settings → Users

**Files:**
- Create: `lib/user-locations.ts`
- Test: `lib/user-locations.test.ts`
- Create: `app/(app)/settings/locations-picker.tsx`
- Modify: `app/(app)/settings/user-form-sheet.tsx:126-141`. For non-admin roles, the single Location select gives way to `LocationsPicker`, plus `Primary location` when 2 or more are chosen. The save sends `hub_ids` and `hub_id`.
- Modify: `lib/settings-helpers.ts:119-143`. `resolveUserHubId` stays for the primary. `validateUserSave` takes `hubIds: string[]` and returns the contract messages.
- Modify: `types.ts` (`Agent` gains `hubIds?: string[]` and `hubNames?: string[]`), `types/api.ts` (`ApiAgentUser.hubs`), and `lib/api-mappers.ts:470-485` (map `hubs`).
- Modify: `app/(app)/settings/users-section.tsx`
  - The `:98` Location column uses `assignedSummary(a.hubNames ?? [a.location])`.
  - The `:47` location filter matches a user when any assigned name matches.
- Modify: `hooks/use-queries.ts`. The `useCreateAgent` and `useUpdateAgent` payloads accept `hub_ids`.
- Modify: `lib/mock-api/data.ts` and `handler.ts`. Users carry `hubs`. Kunle has Ife and Nasarawa. PATCH and POST `users` keep `hub_ids` in memory.
- Story: `stories/locations-picker.stories.tsx`, with these stories: one chosen, three chosen with a primary, one outside your locations, and one inactive.

**Interfaces:**
- Consumes: Task 1 `visibleHubs`, `assignedSummary`.
- Produces:
  - `locationsForRole(isPosRole: boolean, hubIds: string[], primary: string | undefined): { hubIds: string[]; primary: string | undefined; note?: string }`
  - `mergeAssignedHubs(original: string[], editable: Set<string>, chosen: string[]): string[]`: keeps original ids outside `editable`.
  - `validateUserLocations(input: { isAdminRole: boolean; isPosRole: boolean; hubIds: string[]; primary?: string }): string | null`
  - `LocationsPicker({ hubs, editableIds, value, onChange, single }: { hubs: Hub[]; editableIds: Set<string>; value: string[]; onChange: (ids: string[]) => void; single: boolean })`. With `single`, it renders today's `SheetSelect` instead of checkboxes.

- [ ] **Step 1: Write the failing tests** for the three helpers:
  - A cashier keeps only the primary and gets the note. The note text is the cashier message from the contract.
  - Merging keeps an out-of-scope id.
  - Validation: empty gives the first message, and a primary that isn't chosen gives the second.
- [ ] **Step 2:** Run `npm test`. Expected FAIL. Implement. Run again. Expected PASS.
- [ ] **Step 3:** Build `LocationsPicker` and wire the form and list.
- [ ] **Step 4: Check in mock mode.**
  1. As admin, give Emeka (Customer Success) Lagos Hub and Ife Hub, with Ife as primary. The list shows `Ife Hub +1`.
  2. Switch Emeka to Cashier. Only Ife stays, with the note.
  3. As `multi@`, edit a Lagos-only colleague. Lagos shows checked, disabled and marked `Outside your locations`, and is kept on save.
- [ ] **Step 5:** Run `node scripts/check.mjs` (exit 0). Check the form at 390 and 1280 px, in light and dark.
- [ ] **Step 6: Commit.** `git commit -m "Assign several locations to a user"`
