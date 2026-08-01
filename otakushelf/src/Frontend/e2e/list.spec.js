import { test, expect } from '@playwright/test';
import { installMocks, seedSession } from './fixtures/mockApi.js';

test.describe('List page', () => {
  test.beforeEach(async ({ page }) => {
    const list = {
      watching: [{ title: 'Naruto', animeId: '1', malId: '101' }],
      completed: [{ title: 'One Piece', animeId: '2', malId: '102' }],
      planned: [{ title: 'Bleach', animeId: '3', malId: '103' }],
      dropped: [],
      favorites: [],
    };
    await seedSession(page);
    await installMocks(page, { list, user: { _id: 'user-123', email: 't@x.com', name: 'Tester' } });
  });

  test('renders all four status tabs and switches between them', async ({ page }) => {
    await page.goto('/list');

    await expect(page.locator('.tabs-row button')).toHaveCount(4);
    await expect(page.locator('.tabs-row button', { hasText: 'Watching' })).toHaveClass('active');

    await page.locator('.tabs-row button', { hasText: 'Completed' }).click();
    await expect(page.locator('.tabs-row button', { hasText: 'Completed' })).toHaveClass('active');

    await page.locator('.tabs-row button', { hasText: 'Planned' }).click();
    await expect(page.locator('.tabs-row button', { hasText: 'Planned' })).toHaveClass('active');
  });
});

test.describe('List page (logged out)', () => {
  test('redirects logged-out users to login', async ({ page }) => {
    // No seeded session; /auth/me returns 401 -> list page bounces to /login
    await installMocks(page);
    await page.goto('/list');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
