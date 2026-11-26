# Sales OS (FudFarmer CRM)

The web app for FudFarmer's sales, customers, credit, inventory, suppliers, kitchen, POS and analytics. Next.js 16
(App Router), React 19, TanStack Query and Tailwind v4, talking to a separate Nest API.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000 (the in-app preview runs it on 3456: `npm run dev -- -p 3456`).

- **With an API:** set `NEXT_PUBLIC_API_URL` to the Nest API.
- **Without one (mock mode):** leave it unset. `next dev` then answers every call from sample data in
  `lib/mock-api/`, so the whole app can be used and designed without a backend. Sign in with any email and password
  (the Company Admin), or an email starting `multi@` (a Hub Manager of three locations). Data resets on a full reload.

## Check it

```bash
npm test
```

```bash
node scripts/check.mjs
```

```bash
npm run lint
```

- `npm test` runs `node --test` over `lib/**/*.test.ts`. Feature rules live in pure `lib/` modules so they can be
  tested without a browser.
- `node scripts/check.mjs` is the design-system check (components, tokens, copy rules and the docs in `docs/system`).
  It must exit 0. `node scripts/check-system.mjs --explain <rule-id>` explains a finding.
- `npm run storybook` shows the component kit on port 6006.

## Docs

| | |
|---|---|
| [docs/features](docs/features/README.md) | Features added in November 2026: data export, inventory archiving, business contacts, multi-location managers, reports. Each page has what a person sees, the rules and the backend API contract. |
| [docs/restoration](docs/restoration/README.md) | Every KPI, chart, column and field of the old UI, and where it is now |
| [docs/system](docs/system) and [public/system](public/system) | The design system: one page per component, and the rules |
| [docs/superpowers/plans](docs/superpowers/plans/2026-11-26-README.md) | The implementation plans the November features were built from |
| [AGENTS.md](AGENTS.md) | Rules for anyone (or any agent) changing the UI |

## Conventions

- Use the kit in `@/components/app` and the primitives in `@/components/ui`, with the tokens in `app/globals.css`.
- UI copy is in sentence case with no em-dashes. Customers are contacted by WhatsApp only: no Call buttons.
- Never remove a KPI, chart, section, column or field unless the same information is visible elsewhere; record moves in
  `docs/restoration`.
- This is Next.js 16: read the relevant guide in `node_modules/next/dist/docs/` before changing routing or data code.
