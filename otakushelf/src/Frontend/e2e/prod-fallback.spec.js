const { test, expect } = require('@playwright/test');
const { installMocks, EMPTY_LIST } = require('./fixtures/mockApi');

// Regression guard for the production failure mode: the API worker's egress IP
// is blocked by AniList, so /api/anime/anime-sections and
// /api/anilist/hero-trailers return EMPTY data in production (they work only on
// localhost). The page must still render everything by falling back to a direct
// browser -> AniList call, and the hero must never keep its skeleton shimmering.
const EMPTY_SECTIONS = {
  topAiring: [], mostWatched: [], topMovies: [], trending: [], topRated: [], upcoming: [],
};

test('sections render when the API worker returns empty data (production failure mode)', async ({ page }) => {
  await installMocks(page, {
    list: EMPTY_LIST,
    user: null,
    sections: EMPTY_SECTIONS,
  });
  await page.goto('/');

  // Direct AniList fallback (mock returns 6 media per query) must render all 6 carousels.
  await expect(page.locator('.anime-carousel-section')).toHaveCount(6, { timeout: 15_000 });
  await expect(page.locator('.anime-card-premium').first()).toBeVisible();
});

test('hero resolves to content or graceful fallback — never an eternal skeleton', async ({ page }) => {
  await installMocks(page, {
    list: EMPTY_LIST,
    user: null,
    sections: EMPTY_SECTIONS,
  });
  await page.goto('/');

  // The AniList mock returns media with no youtube trailers, so the curated
  // hero playlist is empty -> the graceful static fallback must appear (the
  // eternal shimmering skeleton must not persist).
  await expect(page.locator('.trailer-hero-skeleton')).toHaveCount(0, { timeout: 20_000 });
  const fallbackVisible = await page.locator('.trailer-hero-fallback').count();
  const heroContent = await page.locator('.trailer-hero-section .anime-title').count();
  expect(fallbackVisible + heroContent).toBeGreaterThan(0);
});
