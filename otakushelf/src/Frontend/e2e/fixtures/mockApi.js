// Shared mock data + route interception for E2E tests.
// The app talks to the backend at VITE_API_BASE_URL (http://localhost:8787 in dev)
// and directly to AniList (https://graphql.anilist.co). Tests mock all of it so
// they are deterministic and never depend on a live backend.

export const API = 'http://localhost:8787';

const ok = (data) => ({ success: true, message: 'OK', data });

const media = (id, idMal, title) => ({
  id,
  idMal,
  title: { romaji: title, english: title, native: title },
  coverImage: {
    extraLarge: `https://s4.anilist.co/media/extra/${id}.jpg`,
    large: `https://s4.anilist.co/media/large/${id}.jpg`,
    medium: `https://s4.anilist.co/media/medium/${id}.jpg`,
    color: '#ff5900',
  },
  bannerImage: `https://s4.anilist.co/banner/${id}.jpg`,
  description: `<p>${title} description for testing.</p>`,
  episodes: 24,
  averageScore: 82,
  status: 'RELEASING',
  genres: ['Action', 'Adventure'],
  studios: { edges: [{ node: { name: 'Test Studio' } }] },
  trailer: null,
  format: 'TV',
  seasonYear: 2026,
  startDate: { year: 2026, month: 1, day: 10 },
  endDate: { year: 2026, month: 6, day: 24 },
});

export const ANIME = {
  naruto: media(1, 101, 'Naruto'),
  onePiece: media(2, 102, 'One Piece'),
  bleach: media(3, 103, 'Bleach'),
  aot: media(4, 104, 'Attack on Titan'),
  demonSlayer: media(5, 105, 'Demon Slayer'),
  jjk: media(6, 106, 'Jujutsu Kaisen'),
};

export const SECTIONS = {
  topAiring: [ANIME.naruto, ANIME.onePiece],
  mostWatched: [ANIME.bleach, ANIME.aot],
  topMovies: [ANIME.demonSlayer, ANIME.jjk],
  trending: [ANIME.naruto, ANIME.onePiece, ANIME.bleach, ANIME.aot, ANIME.demonSlayer, ANIME.jjk],
  topRated: [ANIME.aot, ANIME.naruto],
  upcoming: [ANIME.jjk, ANIME.demonSlayer],
};

export const TEST_USER = {
  _id: 'user-123',
  id: 'user-123',
  email: 'test@otakushelf.dev',
  name: 'Tester',
  photo: null,
  authType: 'local',
};

// Default (empty) user list. Override with entries per test.
export const EMPTY_LIST = {
  watching: [],
  completed: [],
  planned: [],
  dropped: [],
  favorites: [],
};

export const PROFILE = {
  _id: 'user-123',
  username: 'tester',
  photo: null,
  coverImage: null,
  badges: [],
};

// 1x1 transparent GIF to stub external images (keeps the page quiet/fast).
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export function installImageMocks(page) {
  return page.route(/(https?:\/\/)(s4|image)\.anilist\.co\/.*|https:\/\/.*\.(png|jpg|jpeg|webp|avif|gif)(\?.*)?$/i, (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'image/gif',
      body: TRANSPARENT_GIF,
    });
  });
}

/**
 * Install backend + AniList mocks.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {object} opts.list  - value returned by GET /api/list/:userId
 * @param {object|null} opts.user - value returned by /auth/me (null => logged out)
 * @param {object} opts.searchResults - array returned by GET /api/anime/search
 */
export function installMocks(page, {
  list = EMPTY_LIST,
  user = null,
  searchResults = [],
  sections = SECTIONS,
} = {}) {
  const handle = async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;

    // Backend API
    if (url.origin === API) {
      if (pathname === '/api/ping') return route.fulfill({ json: ok({}) });

      if (pathname === '/api/anime/anime-sections') {
        return route.fulfill({ json: ok(sections) });
      }

      if (pathname === '/api/anime/search') {
        return route.fulfill({ json: ok(searchResults) });
      }

      if (pathname === '/api/anilist/hero-trailers') {
        return route.fulfill({ json: ok([]) });
      }

      if (pathname === '/auth/me') {
        // Realistic: only a session with an access token gets the user back
        const hasAuth = Boolean(route.request().headers()['authorization']);
        if (!hasAuth || !user) {
          return route.fulfill({ status: 401, json: { success: false, message: 'Unauthorized' } });
        }
        return route.fulfill({ json: ok({ user }) });
      }

      if (pathname === '/auth/login') {
        return route.fulfill({
          json: ok({ user, accessToken: 'test-access-token', refreshToken: 'test-refresh-token' }),
        });
      }

      if (pathname === '/auth/register') {
        return route.fulfill({
          json: ok({ user, accessToken: 'test-access-token', refreshToken: 'test-refresh-token' }),
        });
      }

      if (pathname === '/auth/logout') {
        return route.fulfill({ json: ok({}) });
      }

      // GET /api/list/:userId  and  POST /api/list/:userId (add)
      const listMatch = pathname.match(/^\/api\/list\/([^/]+)$/);
      if (listMatch) {
        if (route.request().method() === 'GET') return route.fulfill({ json: ok(list) });
        // POST: echo a stub entry back
        const body = route.request().postDataJSON?.() || {};
        return route.fulfill({ status: 201, json: ok(body.anime || {}) });
      }

      const profileMatch = pathname.match(/^\/api\/profile\/([^/]+)$/);
      if (profileMatch) {
        return route.fulfill({ json: ok(PROFILE) });
      }

      if (pathname === '/api/badges/all') {
        return route.fulfill({ json: ok([]) });
      }

      const animeMatch = pathname.match(/^\/api\/anime\/anime\/([^/]+)/);
      if (animeMatch) {
        const found = Object.values(ANIME).find((a) => String(a.id) === animeMatch[1]);
        return route.fulfill({ json: ok(found || media(Number(animeMatch[1]), Number(animeMatch[1]), 'Detail Anime')) });
      }
    }

    // AniList GraphQL (home fallback, advanced search, related section)
    if (url.origin === 'https://graphql.anilist.co') {
      return route.fulfill({ json: { data: { Page: { media: Object.values(ANIME) } } } });
    }

    // Anything else (Jikan etc.) — let it through.
    return route.continue();
  };

  return Promise.all([
    page.route(`${API}/**`, handle),
    page.route('https://graphql.anilist.co/**', handle),
    installImageMocks(page),
  ]);
}

// Seed a logged-in session in localStorage before the app boots.
export async function seedSession(page, user = TEST_USER) {
  await page.addInitScript((u) => {
    localStorage.setItem('user', JSON.stringify({ id: u._id, email: u.email, name: u.name, photo: null }));
    localStorage.setItem('user_id', u._id);
    localStorage.setItem('accessToken', 'test-access-token');
    localStorage.setItem('refreshToken', 'test-refresh-token');
  }, user);
}

// Wait for the home page to be interactive (sections mounted, loader gone).
export async function waitForHome(page) {
  await page.locator('.anime-carousel-section').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.locator('.anime-carousel-section .header-title').first().waitFor({ state: 'visible' });
}
