const { test } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test('diagnose mounts initial home load', async ({ page }) => {
  const logs = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (/HOME_MOUNT|HOME_UNMOUNT|PL_MOUNT|PL_UNMOUNT/.test(t)) logs.push(t);
  });

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  console.log('INITIAL HOME:', logs.join(' | '));
  console.log('homeMounts:', await page.evaluate(() => window.__homeMounts));
});

test('diagnose mounts SPA home->login->home', async ({ page }) => {
  const logs = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (/HOME_MOUNT|HOME_UNMOUNT|PL_MOUNT|PL_UNMOUNT/.test(t)) logs.push(t);
  });

  // Load home, then preload login chunk via direct goto, then back to home
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  logs.length = 0;
  console.log('--- cleared; now SPA nav home->login->home ---');

  await page.getByRole('link', { name: /^login$/i }).first().click({ timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.getByRole('link', { name: /^home$/i }).first().click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3500);

  console.log('SPA CYCLE:', logs.join(' | '));
  console.log('homeMounts:', await page.evaluate(() => window.__homeMounts));
});
