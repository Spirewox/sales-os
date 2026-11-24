Ready to ship: yes, with fixes. Nothing blocks the dashboard, but on phones the Top Customers names disappear and several buttons don't do what their labels say (blocking 0, should-fix 8, note 6, 2 accessibility questions for a person).

# Dashboard UX review — 2026-11-20

## 1. Review record

- **Source:** local dev build, `http://localhost:3457/`, branch `jeph/new-branch-from-update-71db62` at `03f1417` plus uncommitted mock-data changes. The data comes from the dev-only mock API (`lib/mock-api`) with the mock admin user.
- **Tool:** the Claude built-in browser pane (viewport emulation, in-page scripts) and axe-core 4.x from the repo's `node_modules`, served from a temporary file that was removed afterwards. The `capture.mjs` / `state-timeline.js` scripts were not used, because the screen sits behind the mock sign-in, which only the pane's session has.
- **Viewports:** 1280×900 and 390×844. **Theme:** dark only, the app's current theme. Light was not captured.
- **Criteria:** `ui-review/references/review-criteria.md` (default set). No installed design system (`.claude/skills` and `.agents/skills` are absent from the repo). No component specs (`docs/system` is absent), so the spec check was skipped.
- **Pass:** first pass.
- **Purpose (assumed):** gives a hub manager or admin a daily at-a-glance view of sales, credit risk, stock and customer issues, and a jump-off to act on them.
- **Lint:** `npx eslint "app/(app)/page.tsx"`, exit 1. One `no-explicit-any` error (line 120) and 10 warnings: unused imports and variables (`UserCheck`, `Plus`, `ShoppingCart`, `ClipboardList`, `CREDIT_COLORS`, `feedbacks`, `enquiries`) and three `exhaustive-deps` warnings. None of these shows on screen.
- **Gaps:** light theme, loading and error states (the mock API can't be made slow or failing from the page), a real backend's latency, touch-device behaviour, and reduced motion.
- **n/a:** 8. Nothing on this screen is destructive. 9. There are no forms on this screen.

## 2. Summary

The dashboard asks: "How is the business doing today, and what needs my attention?" What works:
- The KPI row puts today's revenue, credit, overdue, stock alerts, tickets and customers first, with colour-coded alert states.
- The period toggles respond in about 80ms.
- There's no sideways scrolling at either width, and the sections are clearly headed.

What most needs attention:
- **Phones:** Top Customers loses the names at phone width.
- **Quick Actions:** the "create" buttons only open list pages, and all six carry equal weight.
- **Counts:** the same word ("Overdue") shows different counts with no unit.
- **Number formats:** the chart axes use a different money format from everything else.
- **Length:** the page runs about 3.5 screens at desktop width and about 5.3 on a phone.

## 3. Findings

### should-fix

**S1. At phone width, Top Customers rows show no customer name.** Each row shows only rank, a B2B badge, the amount and "Purchase History". The name element `span.flex-1.truncate` (for example "Temitope Ojo") measures **0px wide**.
- Where: Top Customers list, all 10 rows (`dashboard-390-customers.jpg`). Viewport 390. Tier high (list rows, assumed).
- Criterion: 12. It works at every reviewed width.
- Why it matters: the list exists to say *who* your best customers are, and on a phone it can't.
- Evidence: measured (`getBoundingClientRect().width = 0`) and seen. Key `12|Top Customers row name`.
- Chose should-fix over blocking because the names are still reachable through "View All".

**S2. The Quick Actions labels promise to create something but only open a list.** "Record Sale" lands on `/sales` ("Sales Manager"), and no dialog opens.
- Where: Quick Actions row: button "Record Sale", "Add Customer", "Add Stock", "Log Feedback" (`dashboard-1280-top.jpg`). Both viewports. Tier high.
- Criterion: 5. Labels name the result.
- Why it matters: the user has to find the real "Record Sale" button again on the next page, which doubles the clicks for the most common job.
- Evidence: measured for "Record Sale" (path `/sales`, `[role=dialog]` absent). The other three are inferred from `router.push` at `app/(app)/page.tsx:399-414`. Key `5|Quick Actions create buttons` (×4).

**S3. No action leads in Quick Actions.** Six identical outlined buttons sit in a row. "Record Sale", the most likely next step, has the same weight as "Analytics", which repeats the sidebar link.
- Where: Quick Actions row (`dashboard-1280-top.jpg`). Both viewports. Tier high.
- Criterion: 2. One action leads.
- Why it matters: the eye has no starting point, and a duplicate nav item takes up space.
- Evidence: seen. Key `2|Quick Actions row`.

**S4. "Overdue" means two different counts, and neither says which.** The Overdue KPI card shows badge **10** (credit items), while Credit Book shows **9 Overdue** (customers). "Outstanding 20" and "Pending 11" have no unit either. The badges' accessible names read "10 ₦2.9M OVERDUE" and "7 7 STOCK ALERTS".
- Where: KPI card button "OVERDUE" (`dashboard-1280-top.jpg`) and Credit Book stat tiles (`dashboard-1280-bottom.jpg`). Both viewports. Tier high.
- Criterion: 5. Labels name the result (and 10, consistency inside the screen).
- Why it matters: a manager can't tell whether 9 or 10 is right, so they lose trust in both numbers.
- Evidence: seen, plus the accessible names, measured. Key `5|Overdue count`.

**S5. The "Overdue" card opens all credits, not the overdue ones.** Clicking it lands on `/credits` with the "Overdue only" filter off.
- Where: KPI card button "OVERDUE". Both viewports. Tier high.
- Criterion: 5. Labels name the result.
- Evidence: measured (path `/credits`, no query). Key `5|KPI OVERDUE destination`.
- Note: "Outstanding credit" opens the same page, so the two cards are indistinguishable once clicked.

**S6. The period toggles don't expose which option is selected.** The Daily / Weekly / Monthly / All buttons (×2 sets) and All / B2B / B2C have `aria-pressed` and `aria-selected` both null, so a screen reader can't tell which is on.
- Where: the Sales, Revenue per Category and Top Customers headers. Both viewports. Tier high.
- Criterion: accessibility (WCAG 4.1.2 Name, Role, Value).
- Evidence: measured (attributes read in-page). Key `a11y|segmented toggle state`. Adding the state is adds-only.

**S7. The mobile menu button has no accessible name.** axe `button-name`, critical, on the `.top-3` hamburger.
- Where: the fixed top-left menu button (`dashboard-390-top.jpg`). Viewport 390. Tier high (nav).
- Criterion: accessibility (WCAG 4.1.2).
- Evidence: measured (axe). Key `a11y|mobile menu button`. The fix is adds-only (`aria-label`).
- system-caused: the sidebar/layout component (`components/layout/sidebar.tsx`), not this page.

**S8. The sidebar count badges fail contrast.** White on red measures 2.88:1, where 4.5:1 is needed. This hits the Engagement and Credits badges.
- Where: the sidebar nav links "Engagement" and "Credits" (`dashboard-1280-top.jpg`). Viewport 1280. Tier high (nav).
- Criterion: accessibility (WCAG 1.4.3).
- Evidence: measured (axe `color-contrast`, serious, 2 nodes). Key `a11y|nav badge contrast`.
- system-caused: the `bg-destructive` token used by the sidebar badge.

### note

**N1. The chart axes use a different money format.** Axes read "₦12000k" and "₦20000k" while every figure around them reads "₦50.6M". Seen in the Sales chart, the Revenue per Category chart and Inventory's Value by category (`dashboard-1280-top.jpg`, `dashboard-1280-category.jpg`). Criterion 10, consistency. Key `10|chart axis currency format` (×3).

**N2. The Revenue per Category chart repeats its own list and loses labels.** The bar chart labels only every other category (Fish, Sausage, Turkey…). It fills about a fifth of the card height and leaves a large empty block beside the 19-row list that repeats the same data (`dashboard-1280-category.jpg`). Criterion 3, visual order follows importance. Key `3|Revenue per Category chart`.

**N3. Inventory's "Value by category" axis labels are rotated and clipped.** The first label reads "ains & Staples" (`dashboard-1280-bottom.jpg`). Criterion 11, content holds up at the extremes. Key `11|Inventory value chart labels`.

**N4. The Quick Actions row is cut off at phone width with no scroll cue.** "Add Customer" is clipped at the edge, and four more actions sit off-screen (`dashboard-390-top.jpg`). Criterion 12. Key `12|Quick Actions overflow`. It's still reachable by swiping, so this is a note.

**N5. Headings and labels wrap awkwardly at phone width.** "Revenue per Category" wraps to three lines beside its toggles, and "Walk-In" breaks across two lines (`dashboard-390-sales.jpg`). Criterion 12. Key `12|section header wrap`.

**N6. Ten identical "Purchase History" buttons compete inside one card.** They're green outlined, one per row (`dashboard-1280-customers.jpg`). Criterion 2, one action leads. Key `2|Purchase History repeated`. The row itself could be the target.

## 4. Edge cases not shown

- **Empty, with no data:** not shown. Earlier, with no API, the KPI tiles stayed as skeletons indefinitely; that state can't occur in production, but a real empty account was never seen.
- **Loading and slow loading:** not measured (the mock answers in 150–350ms).
- **Error, or some widgets failing:** not shown.
- **Long content:** not tested (names over 30 characters, ₦ values over ₦1bn).
- **Width where the sidebar collapses:** not tested (between 390 and 1280).
- **Read-only or limited roles:** not shown (the mock user is Company Admin with every permission).
- **Offline:** not shown. The "Live" pill shows regardless of the mock's connection.
- **Light theme:** not shown.
- **Touch device:** not shown.
- **Reduced motion:** not shown.
- **First-day user:** not shown.

## 5. For a person to decide

1. **Default period:** should the dashboard open on *today* or *this month* instead of *All time*? The KPI row is "today" while Sales and Revenue per Category default to all time, and the only signal is a 10px caption. That's a product decision.
2. **B2B customer names:** should B2B rows in Top Customers show the business name ("Eko Grill House") instead of the contact person? Product decision.
3. **Page order:** should operational alerts (Inventory low stock, Credit Book recent overdue) move above the analytical charts? They sit about 2.5 screens down at 1280 and about 4 on a phone. Product decision.
4. **QA:** the lint error at `page.tsx:120` (`no-explicit-any`) and the unused imports.
5. **Small text (accessibility):** many labels render at 10px (Quick Actions, Channels, AOV, captions). Is 10px acceptable for this audience? Readability question.
6. **Contrast (accessibility):** axe left 12–14 contrast checks incomplete, on text over gradients and tinted cards. Someone should check them by eye.

## 6. Left out

- The colour choices on the KPI cards: taste.
- The sidebar spacing and density: follows the existing system, no criterion.
- The donut chart style in Credit Book: taste.

Coverage: route `/` at 1280 and 390 in dark theme. axe WCAG A/AA at both widths. Probes: KPI card navigation (6 cards), Quick Action "Record Sale" destination, period-toggle response time (about 80ms), sideways overflow (none), control accessible names. Not covered: light theme, loading/error/empty states, widths between 390 and 1280, touch, reduced motion, long-content stress, non-admin roles.
