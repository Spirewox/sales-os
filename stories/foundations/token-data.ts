// Mirrors the :root and .dark blocks of app/globals.css, the one token source. Update both together.
// Swatches render from the live CSS variable; these strings are only the printed values.
export type TokenRow = { name: string; light: string; dark: string; role: string };

export const SURFACES: TokenRow[] = [
  { name: 'background', light: 'oklch(0.985 0.002 155)', dark: 'oklch(0.14 0.015 155)', role: 'Page canvas' },
  { name: 'foreground', light: 'oklch(0.17 0.02 155)', dark: 'oklch(0.95 0.005 155)', role: 'Body text on background' },
  { name: 'card', light: 'oklch(1 0 0)', dark: 'oklch(0.19 0.015 155)', role: 'Cards, tables, drawers' },
  { name: 'card-foreground', light: 'oklch(0.17 0.02 155)', dark: 'oklch(0.95 0.005 155)', role: 'Text on card' },
  { name: 'popover', light: 'oklch(1 0 0)', dark: 'oklch(0.19 0.015 155)', role: 'Menus, popovers' },
  { name: 'popover-foreground', light: 'oklch(0.17 0.02 155)', dark: 'oklch(0.95 0.005 155)', role: 'Text on popover' },
  { name: 'primary', light: 'oklch(0.48 0.17 150)', dark: 'oklch(0.62 0.17 150)', role: 'The one accent: primary actions, active state, "good"' },
  { name: 'primary-foreground', light: 'oklch(0.99 0 0)', dark: 'oklch(0.14 0.02 155)', role: 'Text on primary' },
  { name: 'secondary', light: 'oklch(0.955 0.015 155)', dark: 'oklch(0.24 0.02 155)', role: 'Secondary buttons' },
  { name: 'secondary-foreground', light: 'oklch(0.25 0.03 155)', dark: 'oklch(0.92 0.005 155)', role: 'Text on secondary' },
  { name: 'muted', light: 'oklch(0.96 0.01 155)', dark: 'oklch(0.24 0.015 155)', role: 'Quiet fills, table headers, skeletons' },
  { name: 'muted-foreground', light: 'oklch(0.50 0.02 155)', dark: 'oklch(0.78 0.015 155)', role: 'Secondary text, captions' },
  { name: 'accent', light: 'oklch(0.94 0.025 150)', dark: 'oklch(0.26 0.03 150)', role: 'Hover and selected rows' },
  { name: 'accent-foreground', light: 'oklch(0.25 0.04 150)', dark: 'oklch(0.92 0.01 150)', role: 'Text on accent' },
  { name: 'border', light: 'oklch(0.91 0.01 155)', dark: 'oklch(0.28 0.015 155)', role: 'Hairlines and dividers' },
  { name: 'input', light: 'oklch(0.91 0.01 155)', dark: 'oklch(0.28 0.015 155)', role: 'Control borders' },
  { name: 'ring', light: 'oklch(0.48 0.17 150)', dark: 'oklch(0.62 0.17 150)', role: 'Focus ring' },
];

export const STATUS: TokenRow[] = [
  { name: 'destructive', light: '#C8263A', dark: '#F0707E', role: 'Overdue, out of stock, failed. From brand red #E02B3D, stepped for 4.5:1' },
  { name: 'destructive-foreground', light: 'oklch(0.99 0 0)', dark: '#1A0306', role: 'Text on destructive' },
  { name: 'warning', light: '#8A6A05', dark: '#FFC40B', role: 'Pending, low stock. From brand yellow #FFC40B' },
  { name: 'warning-foreground', light: 'oklch(0.99 0 0)', dark: '#1A1405', role: 'Text on warning' },
  { name: 'primary', light: 'oklch(0.48 0.17 150)', dark: 'oklch(0.62 0.17 150)', role: 'Good, paid, in stock' },
];

export const CHART_RAMP: TokenRow[] = [1, 2, 3, 4, 5].map((n) => ({
  name: `chart-${n}`,
  light: ['oklch(0.48 0.17 150)', 'oklch(0.62 0.13 150)', 'oklch(0.74 0.09 150)', 'oklch(0.84 0.05 150)', 'oklch(0.90 0.02 150)'][n - 1],
  dark: ['oklch(0.68 0.16 150)', 'oklch(0.56 0.12 150)', 'oklch(0.45 0.08 150)', 'oklch(0.36 0.05 150)', 'oklch(0.30 0.03 150)'][n - 1],
  role: n === 1 ? 'Single series, or the top of a magnitude scale' : `Magnitude step ${n}`,
}));

export const SERIES: TokenRow[] = [
  { name: 'series-1', light: '#0C7136', dark: '#109648', role: 'First series: brand green' },
  { name: 'series-2', light: '#B2306A', dark: '#C2508A', role: 'Second series: plum' },
  { name: 'series-3', light: '#BF9308', dark: '#B08A08', role: 'Third series: ochre' },
  { name: 'series-4', light: '#15AA98', dark: '#15AA98', role: 'Fourth series: teal' },
  { name: 'series-other', light: 'oklch(0.70 0.01 155)', dark: 'oklch(0.45 0.01 155)', role: 'Fifth series and beyond fold into grey' },
];

export const BRAND: TokenRow[] = [
  { name: 'brand-green', light: '#109648', dark: '#109648', role: 'Identity marks only' },
  { name: 'brand-lime', light: '#BCC906', dark: '#BCC906', role: 'Illustration, empty states' },
  { name: 'brand-teal', light: '#15AA98', dark: '#15AA98', role: 'Avatars, category tags' },
  { name: 'brand-plum', light: '#910C48', dark: '#910C48', role: 'Avatars, category tags' },
  { name: 'brand-red', light: '#E02B3D', dark: '#E02B3D', role: 'Identity only, never status' },
  { name: 'brand-yellow', light: '#FFC40B', dark: '#FFC40B', role: 'Identity only, never status' },
];

export const SIDEBAR: TokenRow[] = [
  { name: 'sidebar', light: 'oklch(0.98 0.005 155)', dark: 'oklch(0.17 0.015 155)', role: 'Sidebar surface' },
  { name: 'sidebar-foreground', light: 'oklch(0.20 0.02 155)', dark: 'oklch(0.92 0.005 155)', role: 'Sidebar text' },
  { name: 'sidebar-primary', light: 'oklch(0.48 0.17 150)', dark: 'oklch(0.62 0.17 150)', role: 'Active nav item' },
  { name: 'sidebar-accent', light: 'oklch(0.94 0.025 150)', dark: 'oklch(0.26 0.03 150)', role: 'Hovered nav item' },
  { name: 'sidebar-border', light: 'oklch(0.91 0.01 155)', dark: 'oklch(0.28 0.015 155)', role: 'Sidebar edge' },
];

export const VISUAL_RULES: { area: string; rule: string }[] = [
  { area: 'Type', rule: 'Geist for UI, Geist Mono only for codes and IDs. Smallest text is text-xs (12px).' },
  { area: 'Type', rule: 'Labels are sentence case; no uppercase-tracked micro labels. Figures use tabular-nums.' },
  { area: 'Colour', rule: 'One accent (primary green). Status colour only for real state: destructive = overdue / out / failed, warning = pending / low, primary = good.' },
  { area: 'Colour', rule: 'Everything else is neutral (foreground / muted-foreground). No per-feature hues.' },
  { area: 'Radius', rule: 'Cards rounded-xl, controls and inputs rounded-md, badges and avatars rounded-full.' },
  { area: 'Charts', rule: 'One series or a magnitude scale uses the chart-1..5 green ramp (chart-1 for a single series).' },
  { area: 'Charts', rule: 'Two to four series use series-1..4 in that fixed order (brand green, plum, ochre, teal); a 5th+ series folds into series-other (grey), never a new hue.' },
  { area: 'Charts', rule: 'Never reorder series colours, never use them for status, and always pair them with a legend or labels.' },
  { area: 'Brand', rule: 'Brand secondaries (--brand-*) are for illustration, empty states and identity marks only, never for status and never for text on white.' },
  { area: 'Copy', rule: 'Customers are contacted by WhatsApp only. Markups are percentages. Sentence case. No em-dashes in UI text.' },
];
