# Multi-location managers

A user who isn't a Company Admin can be given several locations. They switch between those locations, or look at
**All my locations** together, on every screen, the way an admin switches between all locations.

Plan: [2026-11-26-multi-location-managers.md](../superpowers/plans/2026-11-26-multi-location-managers.md). Built as planned.

## What a person sees

- **Settings → Users → a user's form:**
  - **Locations**: a checklist of hubs, each followed by its RSPs, for roles that may hold several.
  - **Primary location**: one of the chosen locations, "used for their till PIN and as the default in forms".
  - A **cashier** (POS role) keeps one **Location**: their till PIN is tied to it.
  - Locations the editor can't see are shown locked and kept as they are when the form is saved.
- **Settings → Users list:** a user with several locations shows "Ife Hub +2", with all of them on hover.
- **The location switcher** (sidebar and page filters) lists the user's locations plus **All my locations**. An admin
  still sees **All locations**.
- **"All my locations"** sends no `hub_id`; the server limits results to the user's visible locations. Every page that
  follows the location switcher works this way, Analytics and Reports included.
- Approving and fulfilling stock requests is allowed at any of the user's visible locations.

## Rules

- `lib/hub-visibility.ts` (tested): `visibleHubs` (the locations a user may see), `allLocationsLabel`,
  `resolveFilterHub`, `assignedSummary`, `canActAt`. `useHubScopeFilter` uses it, so every scoped page gained
  multi-location support at once.
- `lib/user-locations.ts` (tested): `validateUserLocations` (at least one; the primary is one of them; a cashier has
  exactly one), `nextPrimary`, `startingAssignment`, `finalAssignment` (keeps locations the editor can't see),
  `locationsForRole`.

## Backend contract

| Item | Shape and behaviour |
|------|---------------------|
| User record | `hub_ids: string[]` (assigned, at least 1 for non-admin roles) and `hub_id` (primary, one of `hub_ids`). |
| `POST users`, `PATCH users/:id` | Accept `hub_ids` and `hub_id`. 400 "Choose at least one location." when empty; 400 "The primary location must be one of the chosen locations."; 400 "A cashier works at one location." for a POS role with more than one. A caller may only add or remove locations in their own visible set (403); locations outside it that the save leaves unchanged must be accepted. |
| `GET users` | Each user gains `hubs: { _id: string; hub_name: string }[]`. `hub_id=` matches users assigned to that hub. |
| `GET auth/whoami` | `visible_hub_ids` = assigned hubs plus their child RSPs. `data_scope` stays `hub`. |
| Every scoped list and metric | With no `hub_id`, limit to `visible_hub_ids`. With a `hub_id` outside it, 403. |

## Mock mode

Sign in with an email starting `multi@` to be **Kunle Oyewole**, a Hub Manager of Ife Hub, Modakeke RSP and Nasarawa
Hub (`lib/mock-personas.ts`, `lib/mock-auth.ts`). Any other email is the Company Admin.

## Files

`lib/hub-visibility.ts`, `lib/user-locations.ts`, `lib/mock-personas.ts`, `lib/mock-auth.ts`, `hooks/use-hub-scope.ts`,
`app/(app)/settings/{locations-picker,user-form-sheet,users-section,use-settings-data}`.
