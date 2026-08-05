const { test } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const sel = '.page-loader';

async function timeline(page, label, durationMs) {
  const events = [];
  let present = false;
  const t0 = Date.now();
  while (Date.now() - t0 < durationMs) {
    const now = await page.evaluate((s) => !!document.querySelector(s), sel);
    if (now !== present) {
      events.push({ t: Date.now() - t0, state: now ? 'SHOW' : 'HIDE' });
      present = now;
    }
    await page.waitForTimeout(15);
  }
  console.log(label, JSON.stringify(events));
}

test('diagnose home loader timeline', async ({ page }) => {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await timeline(page, 'HOME', 12000);
  console.log('home content present:', await page.locator('.anime-section, .home-page, .section-container').count());
});

test('diagnose profile loader timeline', async ({ page }) => {
  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await timeline(page, 'PROFILE', 12000);
  console.log('profile root html len:', await page.evaluate(() => document.getElementById('root')?.innerHTML.length));
  console.log('profile loader still present:', await page.evaluate((s) => !!document.querySelector(s), sel));
});
