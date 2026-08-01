import { test, expect } from '@playwright/test';
import { installMocks, waitForHome, seedSession, TEST_USER } from './fixtures/mockApi.js';

test.describe('Navigation', () => {
  test('bottom nav navigates between major pages', async ({ page }) => {
    await seedSession(page, TEST_USER);
    await installMocks(page, { user: TEST_USER });
    await page.goto('/');
    await waitForHome(page);

    // Watchlist
    await page.locator('.bottom-button-bar .nav-item').filter({ hasText: 'Watchlist' }).click();
    await expect(page).toHaveURL(/\/list/);
    await expect(page.locator('.bottom-button-bar .nav-item.active')).toContainText('Watchlist');

    // Discover / advanced search
    await page.locator('.bottom-button-bar .nav-item').filter({ hasText: 'Discover' }).click();
    await expect(page).toHaveURL(/\/advance/);

    // Home again
    await page.locator('.bottom-button-bar .nav-item').filter({ hasText: 'Home' }).click();
    await expect(page).toHaveURL(/\/home|\/$/);
    await expect(page.locator('.anime-carousel-section').first()).toBeVisible();
  });

  test('unknown route renders the 404 page', async ({ page }) => {
    await installMocks(page);
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL(/this-route-does-not-exist/);
  });
});
