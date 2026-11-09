import { test, expect } from '@playwright/test';

test('mobile header wallet picker works on every page with no extension or signature', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 680 });
  await page.route('https://**', route => route.abort());
  for (const path of ['/', '/markets', '/trade', '/executions', '/positions', '/positions/risk', '/positions/manage', '/history', '/test-lab', '/settings']) {
    await page.goto(path);
    const trigger = page.getByRole('button', { name: 'Connect wallet', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Connect a wallet' });
    await expect(dialog.getByText(/No browser wallet detected/)).toBeVisible();
    const rect = await dialog.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(320);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    expect(await page.getByRole('main').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
});

test('new route starts at the top and Back restores the scroll pane', async ({ page }) => {
  await page.route('https://**', route => route.abort());
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto('/test-lab');
  const main = page.getByRole('main');
  await main.evaluate(el => { el.scrollTop = 375; });
  await expect.poll(() => main.evaluate(el => el.scrollTop)).toBe(375);
  await page.getByRole('navigation').getByRole('link', { name: 'Overview', exact: true }).click();
  await expect.poll(() => main.evaluate(el => el.scrollTop)).toBe(0);
  await page.goBack();
  await expect.poll(() => main.evaluate(el => el.scrollTop)).toBe(375);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('existing Test Lab notes survive navigation and filter changes', async ({ page }) => {
  await page.route('https://**', route => route.abort());
  await page.goto('/test-lab');
  await page.evaluate(() => sessionStorage.setItem('pei.manual-tests.v1.50383.viewer.none', JSON.stringify({ U04: {status:'FAIL', notes:'Existing scenario observation'}, U01:{status:'PASS', notes:''} })));
  await page.reload();
  await page.getByLabel('Show scenarios').selectOption('attention');
  await expect(page.locator('.guided-tests details')).toHaveCount(1);
  await page.locator('.guided-tests summary').click();
  await expect(page.getByLabel('Observations for U04')).toHaveValue('Existing scenario observation');
  await page.getByLabel('Show scenarios').selectOption('notes');
  await expect(page.locator('.guided-tests details')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pei.manual-tests.v1.50383.viewer.none')!).U01.status)).toBe('PASS');
});
