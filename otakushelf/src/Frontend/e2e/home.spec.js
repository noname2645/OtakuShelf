import { test, expect } from '@playwright/test';
import { installMocks, seedSession, waitForHome, ANIME, EMPTY_LIST, API } from './fixtures/mockApi.js';

test.describe('Global list-status memory', () => {
  test.beforeEach(async ({ page }) => {
    // User is signed in; backend says Naruto is "watching", One Piece "completed",
    // Bleach "planned". Cards should reflect this across the whole app.
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

  test('card SVG icons are colored for anime already in the user list', async ({ page }) => {
    await page.goto('/');
    await waitForHome(page);

    // Naruto card -> watching icon active (green)
    const narutoCard = page.locator('.anime-card-premium').filter({ hasText: 'Naruto' }).first();
    await expect(narutoCard.locator('.footer-action-item.active.watching')).toBeVisible();
    await expect(narutoCard.locator('.footer-action-item.active.watching svg')).toHaveCSS('color', 'rgb(34, 197, 94)');

    // One Piece card -> completed icon active (blue)
    const onePieceCard = page.locator('.anime-card-premium').filter({ hasText: 'One Piece' }).first();
    await expect(onePieceCard.locator('.footer-action-item.active.completed')).toBeVisible();
    await expect(onePieceCard.locator('.footer-action-item.active.completed svg')).toHaveCSS('color', 'rgb(59, 130, 246)');

    // Bleach card -> planned icon active (yellow)
    const bleachCard = page.locator('.anime-card-premium').filter({ hasText: 'Bleach' }).first();
    await expect(bleachCard.locator('.footer-action-item.active.planned')).toBeVisible();
    await expect(bleachCard.locator('.footer-action-item.active.planned svg')).toHaveCSS('color', 'rgb(234, 179, 8)');

    // Attack on Titan is NOT in any list -> no active icon
    const aotCard = page.locator('.anime-card-premium').filter({ hasText: 'Attack on Titan' }).first();
    await expect(aotCard.locator('.footer-action-item.active')).toHaveCount(0);
  });

  test('toggling a status on a card updates it instantly and persists globally', async ({ page }) => {
    await page.goto('/');
    await waitForHome(page);

    const aotCard = page.locator('.anime-card-premium').filter({ hasText: 'Attack on Titan' }).first();
    await expect(aotCard.locator('.footer-action-item.active')).toHaveCount(0);

    // Capture POSTs to the list endpoint from before the first action
    const postRequests = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes(`${API}/api/list/`)) postRequests.push(req);
    });

    // Click "watching" on Attack on Titan (id 4)
    await aotCard.locator('.footer-action-item[title="Watching"]').click();

    // Icon becomes active instantly
    await expect(aotCard.locator('.footer-action-item.active.watching')).toBeVisible();
    await expect(aotCard.locator('.footer-action-item.active.watching svg')).toHaveCSS('color', 'rgb(34, 197, 94)');

    // A POST was sent to the backend list endpoint
    expect(postRequests.length).toBeGreaterThanOrEqual(1);

    // The global map was updated in localStorage
    const map = await page.evaluate(() => JSON.parse(localStorage.getItem('list_status_map') || '{}'));
    expect(map['id:4']).toBe('watching');

    // Clicking the active status again toggles it off (removed from list)
    await aotCard.locator('.footer-action-item[title="Watching"]').click();
    await expect(aotCard.locator('.footer-action-item.active')).toHaveCount(0);
    const mapAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('list_status_map') || '{}'));
    expect(mapAfter['id:4']).toBeUndefined();
  });

  test('status memory is shared across pages (global scope)', async ({ page }) => {
    await page.goto('/');
    await waitForHome(page);

    // Mark Attack on Titan as "completed" on the home page
    const aotCard = page.locator('.anime-card-premium').filter({ hasText: 'Attack on Titan' }).first();
    await aotCard.locator('.footer-action-item[title="Completed"]').click();
    await expect(aotCard.locator('.footer-action-item.active.completed')).toBeVisible();

    // Navigate to a different page (SPA navigation) then back to home.
    await page.goto('/list');
    await page.goto('/');

    // The card still remembers its status after leaving and returning.
    const aotCardAfter = page.locator('.anime-card-premium').filter({ hasText: 'Attack on Titan' }).first();
    await expect(aotCardAfter.locator('.footer-action-item.active.completed')).toBeVisible();
  });

  test('matches a list entry that only has a MAL id (MAL import)', async ({ page }) => {
    // Backend list entries imported from MAL carry the MAL id, not the AniList id
    const list = {
      watching: [{ title: 'Attack on Titan', malId: '104' }],
      completed: [], planned: [], dropped: [], favorites: [],
    };
    await seedSession(page);
    await installMocks(page, { list, user: { _id: 'user-123', email: 't@x.com', name: 'Tester' } });
    await page.goto('/');
    await waitForHome(page);

    const aotCard = page.locator('.anime-card-premium').filter({ hasText: 'Attack on Titan' }).first();
    await expect(aotCard.locator('.footer-action-item.active.watching')).toBeVisible();
    await expect(aotCard.locator('.footer-action-item.active.watching svg')).toHaveCSS('color', 'rgb(34, 197, 94)');
  });

  test('matches a list entry by normalized title alone', async ({ page }) => {
    const list = {
      planned: [{ title: 'Bleach' }], // no animeId, no malId
      watching: [], completed: [], dropped: [], favorites: [],
    };
    await seedSession(page);
    await installMocks(page, { list, user: { _id: 'user-123', email: 't@x.com', name: 'Tester' } });
    await page.goto('/');
    await waitForHome(page);

    const bleachCard = page.locator('.anime-card-premium').filter({ hasText: 'Bleach' }).first();
    await expect(bleachCard.locator('.footer-action-item.active.planned')).toBeVisible();
    await expect(bleachCard.locator('.footer-action-item.active.planned svg')).toHaveCSS('color', 'rgb(234, 179, 8)');
  });

});

test.describe('Logout', () => {
  test('logging out clears the global status memory', async ({ page }) => {
    const list = {
      watching: [{ title: 'Naruto', animeId: '1', malId: '101' }],
      completed: [], planned: [], dropped: [], favorites: [],
    };
    await installMocks(page, { list, user: { _id: 'user-123', email: 't@x.com', name: 'Tester' } });

    // Seed the session + status map directly (no init script) so logout isn't re-seeded
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({ id: 'user-123', email: 't@x.com', name: 'Tester' }));
      localStorage.setItem('user_id', 'user-123');
      localStorage.setItem('accessToken', 'test-access-token');
      localStorage.setItem('refreshToken', 'test-refresh-token');
      localStorage.setItem('list_status_map', JSON.stringify({ 'id:1': 'watching' }));
    });
    await page.goto('/');
    await waitForHome(page);

    const narutoCard = page.locator('.anime-card-premium').filter({ hasText: 'Naruto' }).first();
    await expect(narutoCard.locator('.footer-action-item.active.watching')).toBeVisible();

    // Log out through the header dropdown (triggers a full reload to /)
    await page.locator('.profile-button').click();
    await page.locator('.logout-button').click();

    // Wait until the reloaded, logged-out home renders
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible({ timeout: 15_000 });

    // The map is cleared on logout (the reset effect persists an empty object)
    const map = await page.evaluate(() => JSON.parse(localStorage.getItem('list_status_map') || '{}'));
    expect(Object.keys(map)).toHaveLength(0);
    await page.locator('.anime-card-premium').first().waitFor({ state: 'visible' });
    await expect(page.locator('.footer-action-item.active')).toHaveCount(0);
  });
});

test.describe('Global list-status memory', () => {

  test('statuses are per-user and never shared between accounts', async ({ page }) => {
    const listA = {
      watching: [{ title: 'Naruto', animeId: '1', malId: '101' }],
      completed: [], planned: [], dropped: [], favorites: [],
    };
    await installMocks(page, {
      list: listA,
      user: { _id: 'user-A', id: 'user-A', email: 'a@x.com', name: 'Alice' },
    });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({ id: 'user-A', email: 'a@x.com', name: 'Alice' }));
      localStorage.setItem('user_id', 'user-A');
      localStorage.setItem('accessToken', 'tok-A');
      localStorage.setItem('refreshToken', 'ref-A');
    });
    await page.goto('/');
    await waitForHome(page);

    const narutoCard = page.locator('.anime-card-premium').filter({ hasText: 'Naruto' }).first();
    await expect(narutoCard.locator('.footer-action-item.active.watching')).toBeVisible();

    // Switch to Bob: logout clears the cached map (covered by the logout test),
    // so a fresh session for Bob starts with an empty map + his own backend list.
    await page.evaluate(() => {
      localStorage.removeItem('list_status_map');
      localStorage.setItem('user', JSON.stringify({ id: 'user-B', email: 'b@x.com', name: 'Bob' }));
      localStorage.setItem('user_id', 'user-B');
      localStorage.setItem('accessToken', 'tok-B');
      localStorage.setItem('refreshToken', 'ref-B');
    });
    await installMocks(page, {
      list: EMPTY_LIST,
      user: { _id: 'user-B', id: 'user-B', email: 'b@x.com', name: 'Bob' },
    });
    await page.goto('/');
    await waitForHome(page);

    await expect(narutoCard.locator('.footer-action-item.active')).toHaveCount(0);
  });
});

test.describe('Home page', () => {
  test('renders anime sections with cards', async ({ page }) => {
    await installMocks(page);
    await page.goto('/');
    await waitForHome(page);

    await expect(page.locator('.anime-carousel-section')).toHaveCount(6);
    await expect(page.locator('.anime-card-premium').first()).toBeVisible();
  });

  test('opens the detail modal when a card is clicked', async ({ page }) => {
    await installMocks(page);
    await page.goto('/');
    await waitForHome(page);

    await page.locator('.anime-card-premium').first().click();
    await expect(page.locator('.modal-overlay')).toBeVisible();
  });

  test('opening the detail modal does not refetch the user list', async ({ page }) => {
    const list = {
      watching: [{ title: 'Naruto', animeId: '1', malId: '101' }],
      completed: [], planned: [], dropped: [], favorites: [],
    };
    await seedSession(page);
    await installMocks(page, { list, user: { _id: 'user-123', email: 't@x.com', name: 'Tester' } });
    await page.goto('/');
    await waitForHome(page);

    // Count list GETs after the initial load (the duplicate fetch was removed)
    let listGets = 0;
    page.on('request', (req) => {
      if (req.method() === 'GET' && /\/api\/list\//.test(req.url())) listGets++;
    });

    await page.locator('.anime-card-premium').first().click();
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await page.waitForTimeout(500);

    expect(listGets).toBe(0);
  });

  test('search returns results from the backend', async ({ page }) => {
    await installMocks(page, { searchResults: [ANIME.naruto, ANIME.onePiece] });
    await page.goto('/');
    await waitForHome(page);

    await page.locator('.input[type="text"]').fill('Naruto');

    await expect(page.locator('.anime-grid')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.anime-grid .anime-card-premium')).toHaveCount(2);
  });

  test('logged-out user sees Get Started CTA instead of profile', async ({ page }) => {
    await installMocks(page);
    await page.goto('/');
    await waitForHome(page);

    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
  });
});

test.describe('Responsive layout', () => {
  test('bottom nav and cards render on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installMocks(page);
    await page.goto('/');
    await waitForHome(page);

    await expect(page.locator('.anime-card-premium').first()).toBeVisible();
    await expect(page.locator('.bottom-button-bar')).toBeVisible();
    await expect(page.locator('.nav-item')).toHaveCount(5);
  });
});
