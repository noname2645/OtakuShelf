const { test, expect } = require('@playwright/test');
const { installMocks, EMPTY_LIST, SECTIONS } = require('./fixtures/mockApi');

// Regression guard: the anime sections must become VISIBLE when scrolled into
// view. Previously `content-visibility: auto` on .anime-carousel-section
// interfered with framer-motion's whileInView, leaving sections stuck at
// opacity 0 (invisible but clickable).
test('sections become visible when scrolled into view', async ({ page }) => {
  await installMocks(page, { list: EMPTY_LIST, user: null, sections: SECTIONS });
  await page.goto('/');

  const firstSection = page.locator('.anime-carousel-section').first();
  await expect(firstSection).toBeVisible({ timeout: 15_000 });

  // Before scrolling, the section may legitimately be at opacity 0 (below the fold).
  // Scroll it into view and confirm the whileInView animation resolves to opacity 1.
  await firstSection.scrollIntoViewIfNeeded();
  await expect(firstSection).toHaveCSS('opacity', '1', { timeout: 5_000 });

  // Cards inside must also be clickable AND visible (not painted over by anything).
  const card = firstSection.locator('.anime-card-premium').first();
  await expect(card).toBeVisible();
  const cardOpacity = await card.evaluate((el) => getComputedStyle(el).opacity);
  expect(Number(cardOpacity)).toBe(1);
});
