// States the baseline and every after-capture reach the same way (migration run 2026-11-23).
// drawer: open the first table row's detail drawer or sheet, then wait for the dialog role.
async function firstRowDrawer(page) {
  const row = page.locator('tbody tr').first();
  await row.waitFor({ state: 'visible', timeout: 15000 });
  await row.click();
  await page.locator('dialog[open], [role=dialog]').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(400);
}
async function kitchenCard(page) {
  const card = page.locator('[data-job-card], [role=button]:has-text("KJ-"), button:has-text("KJ-")').first();
  await card.waitFor({ state: 'visible', timeout: 15000 });
  await card.click();
  await page.locator('dialog[open], [role=dialog]').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(400);
}
// ready: the page after its data has drawn (load-state captures caught the splash or skeletons; inbox/analytics.1 report).
// Waits for main and its h1, no skeleton or pulse, charts drawn when the page has chart containers, and hides the
// Next.js dev indicator (nextjs-portal), the only no-change noise the control capture found (baselines/noise.txt).
async function ready(page) {
  await page.locator('main h1, h1, form').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector('[data-slot=skeleton], .animate-pulse'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForFunction(() => { const c = document.querySelectorAll('.recharts-responsive-container').length; return c === 0 || document.querySelectorAll('.recharts-surface').length >= c; }, null, { timeout: 15000 }).catch(() => {});
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(800);
}
async function readyThenDrawer(page) { await ready(page); await firstRowDrawer(page); }
async function readyThenCard(page) { await ready(page); await kitchenCard(page); }
export default {
  ready,
  drawer: readyThenDrawer,
  'kitchen.drawer': readyThenCard,
};
