const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const loaderSelector = '.page-loader';

// Waits for the loader to be visible (or already visible) within the timeout
async function waitForLoaderVisible(page, timeout = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate((sel) => !!document.querySelector(sel), loaderSelector)) return true;
    await page.waitForTimeout(20);
  }
  return false;
}

async function waitForLoaderGone(page, timeout = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await page.evaluate((sel) => !document.querySelector(sel), loaderSelector)) return true;
    await page.waitForTimeout(50);
  }
  return false;
}

test('global loader: shows on initial load, then unloads', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Loader must be present shortly after first paint (curtain animation)
  expect(await waitForLoaderVisible(page, 3000)).toBe(true);

  // Once home data is ready the loader exits and is removed from the DOM
  expect(await waitForLoaderGone(page, 15000)).toBe(true);
});

test('global loader: restarts and unloads on SPA navigation', async ({ page }) => {
  // Preload the login chunk so navigation does not block on a network fetch
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForLoaderGone(page, 15000);

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForLoaderGone(page, 15000);

  // SPA-nav to a route (login) via a real link click
  await page.getByRole('link', { name: /^login$/i }).first().click({ timeout: 15000 });

  // The loader must re-appear as a result of the navigation
  expect(await waitForLoaderVisible(page, 3000)).toBe(true);
  expect(page.url()).toMatch(/\/login$/);

  // And then unload once the login page is ready
  expect(await waitForLoaderGone(page, 15000)).toBe(true);
});
