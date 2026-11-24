# @fudfarmer/ui

The Sales OS design system as an installable library: the colour, type and radius tokens, 19 primitives (Button, Checkbox, Select, Switch, Textarea, ModalDialog and more) and the app kit (PageHeader, SectionTabs, FilterBar, PeriodSelect, KpiStrip, DataTable, EntityDrawer, FormSheet, StatusBadge, EmptyState and more).

It works in any React 19 app that uses Tailwind CSS v4: Next.js, Vite, Remix or others.

The Storybook shows every component and its states. The written rules are in Storybook's `/system/` pages.

## Install

From the file you were sent:

```bash
npm install ./fudfarmer-ui-0.1.0.tgz
```

Your app needs `react` and `react-dom` 19 and `tailwindcss` 4. The library brings its own `@base-ui/react`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge` and `tw-animate-css`.

## Set up the styles

In your main CSS file, import the library's styles right after Tailwind:

```css
@import "tailwindcss";
@import "@fudfarmer/ui/styles.css";
```

That brings in the tokens (`--primary`, `--series-1`, `--brand-yellow` and the rest) for light and dark. It also points Tailwind at the library, so the classes its components use are generated.

- **Dark mode:** put the `dark` class on `<html>`. Menus and dialogs open at the end of `<body>`, so a `dark` class on an inner element won't reach them.
- **Font:** the system uses Geist. Load it (for example with `next/font/google`, setting the `--font-geist` variable) or install it. Without it, text falls back to the system sans-serif.

## Use it

The app kit and every primitive come from the package root:

```tsx
import { Button, DataTable, KpiStrip, PageHeader, StatusBadge, type Column } from '@fudfarmer/ui';

<PageHeader title="Sales" description="Every sale, newest first." actions={<Button size="control">Record sale</Button>} />
```

Each primitive also has its own entry point, matching the app's file names:

```tsx
import { Switch } from '@fudfarmer/ui/switch';
```

## Links and the URL

- **Links:** KpiStrip cells, DataTable row actions and OverflowMenu items with an `href` render a plain `<a>` by default. For client-side navigation, give the library your router's link once at the root:

  ```tsx
  import NextLink from 'next/link';
  import { UILinkProvider } from '@fudfarmer/ui';

  <UILinkProvider link={NextLink}>{children}</UILinkProvider>
  ```

- **Tabs in the URL:** SectionTabs keeps the chosen tab in `?tab=` through the History API, which works in any app, Next.js included. Pass `value` and `onChange` instead for tabs that stay local.

## Things that come from Sales OS

- **PeriodSelect** counts days in Lagos time (`Africa/Lagos`).
- **LocationSelect** expects a location scope: `canSwitchHubs`, `hubName`, `filterHub`, `setFilterHub` and `hubOptionsDetailed`. The `LocationScope` type describes it. Build it from your own location data.
- **Remembered page sizes:** DataTable keeps each list's rows-per-page in `localStorage` under `fudfarmer_rows:<key>`.

## For maintainers

The package is generated from the Sales OS app's own `components/ui`, `components/app` and `app/globals.css`, so the app stays the one source. Change a component there, then rebuild:

```bash
npm run build:ui
```

The build writes `packages/ui/fudfarmer-ui-<version>.tgz`. Raise `version` in `packages/ui/package.json` before sharing a new build. The small package-only files that replace the app's Next.js ties are in `packages/ui/adapters`.
