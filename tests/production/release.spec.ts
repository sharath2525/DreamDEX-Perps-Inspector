import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('public build removes lab routing and navigation without deleting saved notes', async ({ page }) => {
  await page.route('https://**', route => route.abort());
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('pei.manual-tests.v1.50383.viewer.none', 'saved observation'));
  await expect(page.getByRole('link', { name: 'Developer Test Lab', exact: true })).toHaveCount(0);
  await page.goto('/test-lab');
  await expect(page.getByRole('button', { name: 'Run read-only diagnostics' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This route isn’t in the workspace.');
  expect(await page.evaluate(() => localStorage.getItem('pei.manual-tests.v1.50383.viewer.none'))).toBe('saved observation');
});

test('public routes remain usable with Vercel CSP and mobile wallet control', async ({ page }, info) => {
  const config = JSON.parse(await readFile('vercel.json', 'utf8'));
  const headers = Object.fromEntries(config.headers[0].headers.map((h: { key: string; value: string }) => [h.key, h.value]));
  await page.route('https://**', route => route.abort());
  await page.route('http://127.0.0.1:4173/**', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/trade', '/markets', '/executions', '/history', '/positions', '/positions/risk', '/positions/manage', '/settings']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Developer Test Lab', exact: true })).toHaveCount(0);
    expect(await page.getByRole('main').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Connect a wallet' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/');
  await page.screenshot({ path: info.outputPath('production-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: info.outputPath('production-desktop.png'), fullPage: true });
});
