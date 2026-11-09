import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Shell checks are deterministic and deliberately offline. Live evidence is separate.
  await page.route('https://**', route => route.abort());
});

const routes = [
  ['Markets', '/markets', 'Find your market.'],
  ['Trade', '/trade', 'Start with a checked intent.'],
  ['Execution Inspector', '/executions', 'See what really happened.'],
  ['Positions', '/positions', 'Understand your exposure.'],
  ['Risk Lab', '/positions/risk', 'Explore the what-ifs.'],
  ['Account operations', '/positions/manage', 'Review every permission and transfer.'],
  ['History', '/history', 'Follow your trading record.'],
  ['Developer Test Lab', '/test-lab', 'Verify the integration.'],
  ['Settings', '/settings', 'Settings'],
] as const;

test('all workspace routes work offline without requesting wallet access', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'ethereum', { value: { request: () => { throw new Error('Unexpected wallet request'); } } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Account overview');
  await expect(page.getByLabel('Not available', { exact: true })).toHaveCount(3);
  for (const [label, path, title] of routes) {
    await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByRole('main')).toBeFocused();
    await expect(page.getByText('Testnet only. Every send requires confirmation.')).toBeVisible();
  }
  await expect(page.getByText('EXPECTED DEPLOYMENT')).toBeVisible();
  await expect(page.getByText('50383', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('deep links refresh and unknown routes offer recovery', async ({ page }) => {
  for (const [path, message] of [['/trade/unverified-pool', 'Invalid pool address. Select a verified market.'], ['/executions/unverified-attempt', 'Execution record not found on this device.'], ['/positions/risk', 'Select an account snapshot']] as const) {
    await page.goto(path);
    await page.reload();
    await expect(page.getByText(message!, { exact: false })).toBeVisible();
  }
  await page.goto('/not-a-page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This route isn’t in the workspace.');
  await page.getByRole('link', { name: 'Back to overview' }).click();
  await expect(page).toHaveURL('/');
});

test('theme persists and keyboard skip link moves focus to content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('blocked browser storage does not prevent loading or switching theme', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new DOMException('Storage denied', 'SecurityError'); } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('mobile navigation traps focus, closes with Escape, and focuses selected content', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  const dialog = page.getByRole('dialog', { name: 'Workspace menu' });
  await trigger.click();
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 16; index++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('link', { name: 'Trade', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL('/trade');
  await expect(page.getByRole('main')).toBeFocused();
});

test('layouts fit narrow viewports and produce review screenshots', async ({ page }, testInfo) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1100 : 844 });
    for (const path of ['/', '/markets', '/settings', '/test-lab', '/executions', '/history', '/positions/manage']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('main')!;
        const topbar = document.querySelector('header')!;
        return document.documentElement.scrollWidth > innerWidth || main.scrollWidth > main.clientWidth || topbar.scrollWidth > topbar.clientWidth;
      });
      expect(overflow, `${path} must fit ${width}px`).toBe(false);
    }
    if (width === 390 || width === 1440) {
      await page.goto('/');
      await page.screenshot({ path: testInfo.outputPath(`overview-${width}-dark.png`) });
      await page.getByRole('button', { name: 'Switch to light theme' }).click();
      await page.screenshot({ path: testInfo.outputPath(`overview-${width}-light.png`) });
      await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    }
  }
});

test('configuration copy succeeds and denied clipboard access gives a useful fallback', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Copy MarginBank', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'MarginBank copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('0x478769E1177C0773c43A593DCCc4Ad15F15F1394');
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
  await page.getByRole('button', { name: 'Copy RPC', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Clipboard unavailable. Select and copy the value manually.' })).toBeVisible();
});
