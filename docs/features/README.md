# Features added in November 2026

Branch `ds/2026-11-23-harden`, from `update`. Five features, built from the plans in
[`docs/superpowers/plans/`](../superpowers/plans/2026-11-26-README.md), then changed at the user's request
while they were reviewed. These pages describe what was **built**. Where it differs from a plan, the page says so.

| Feature | What a person gets | Page |
|---|---|---|
| Data export | A visible Export button on every list, with Excel, CSV and PDF, holding every row the filters match | [data-export.md](data-export.md) |
| Inventory archiving | Archive a product (with a warning if it still has stock), find it under Archived, restore it | [inventory-archiving.md](inventory-archiving.md) |
| Business contacts | Several named contacts per business customer, each with WhatsApp | [business-contacts.md](business-contacts.md) |
| Multi-location managers | A user can be given several locations, and switch between them or see "All my locations" | [multi-location-managers.md](multi-location-managers.md) |
| Reports | Analytics → Reports: 9 ready-made reports, custom reports you build, save, edit and export, and Ask (Explore moved here) | [reports.md](reports.md) |

## What changed for people using the app

- **Every list can be exported.** Customers, Sales, Credits, Suppliers, Stock, Stock movements, Stock requests,
  Engagement, POS transactions, Kitchen jobs, Audit trail and Settings → Users have an **Export** button in their
  filter bar. It offers Excel, CSV and PDF and exports every row the current filters match (up to 10,000).
- **Inventory → Stock** has a status filter (Active, Archived, Active and archived). A product's drawer has
  **Archive** and, once archived, **Restore**.
- **Business customers** have a Contacts list in their form and profile, instead of one name and phone.
- **Settings → Users** can give a user several locations. That user's location switcher lists them, plus
  "All my locations".
- **Analytics → Reports** is new, and **Analytics → Explore is gone**: its Ask is now a view of Reports, its
  Build a chart became the report builder (New report), and What if was removed.

## For the backend team

The Nest API is not in this repo. Every feature works in mock mode against `lib/mock-api/handler.ts`, but the
real API needs these changes. Each page has the full contract.

| Feature | Backend work |
|---|---|
| Data export | None. Exports page through the existing list endpoints in the browser. |
| Inventory archiving | `PATCH inventory/:id/archive` and `/restore`, `?status=` on `GET inventory`, 409 on stock changes to an archived product, `archive_sku` permission |
| Business contacts | `contacts` and `business_address` on customers (list rows too), validation, search by contact |
| Multi-location managers | `hub_ids` on users, `hubs` on `GET users`, `visible_hub_ids` scoping on every list and metric |
| Reports | `GET analytics/reports/:key` for 9 reports, saved reports (`GET`, `POST`, `PUT`, `DELETE`) with `measures`, new Explore measure keys, `insights/explore/field-values`. The `insights/simulate/*` endpoints are no longer called. |

## Trying it locally

```bash
npm run dev
```

Open http://localhost:3000 (or run `npm run dev -- -p 3456`, the port the in-app preview uses). With no
`NEXT_PUBLIC_API_URL` it uses mock mode: sign in with any email and password.

- An email starting `multi@` signs in as **Kunle Oyewole**, a Hub Manager of Ife Hub, Modakeke RSP and Nasarawa Hub,
  to try multi-location scoping.
- Any other email signs in as the Company Admin.
- Mock data, saved reports included, resets on a full page reload.

## Checks

```bash
npm test
```

```bash
node scripts/check.mjs
```

`npm test` runs `node --test` over `lib/**/*.test.ts` (267 tests at the time of writing). The rules of each feature
live in pure `lib/` modules so they can be tested; screens are checked in the browser at 390 and 1280 px in both
themes. `node scripts/check.mjs` is the design-system check and must exit 0.
