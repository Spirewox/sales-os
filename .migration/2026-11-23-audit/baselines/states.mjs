// States the baseline and every after-capture reach the same way (migration run 2026-11-23).
// drawer: open the first table row's detail drawer or sheet, then wait for the dialog role.
async function firstRowDrawer(page) {
  const row = page.locator('tbody tr').first();
  await row.waitFor({ state: 'visible', timeout: 15000 });
  await row.click();
  await page.locator('[role=dialog]').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(400);
}
async function kitchenCard(page) {
  const card = page.locator('[data-job-card], [role=button]:has-text("KJ-"), button:has-text("KJ-")').first();
  await card.waitFor({ state: 'visible', timeout: 15000 });
  await card.click();
  await page.locator('[role=dialog]').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(400);
}
export default {
  drawer: firstRowDrawer,
  'kitchen.drawer': kitchenCard,
};
