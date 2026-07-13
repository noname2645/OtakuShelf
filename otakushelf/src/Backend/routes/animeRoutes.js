// animeRoutes.js
import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { success, error } from '../utils/responseHandler.js';

const router = express.Router();

// ── Persistent cache (survives server restarts) ──────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, '..', '.anime_sections_cache.json');
const CACHE_TTL  = 1000 * 60 * 60; // 1 hour — stale after this, refresh in background

let memCache = { data: null, timestamp: 0 }; // hot in-memory copy

// Load persisted cache from disk on startup so first request is instant
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const saved = JSON.parse(raw);
    if (saved && saved.data && saved.timestamp) {
      memCache = saved;
      console.log('[animeRoutes] Loaded persisted cache from disk, age:', Math.round((Date.now() - saved.timestamp) / 1000), 's');
    }
  }
} catch (e) {
  console.warn('[animeRoutes] Could not load disk cache:', e.message);
}

// Save cache to disk asynchronously (non-blocking)
function persistCache() {
  fs.writeFile(CACHE_FILE, JSON.stringify(memCache), 'utf8', (err) => {
    if (err) console.warn('[animeRoutes] Failed to persist cache:', err.message);
  });
}

const ANILIST_URL = "https://graphql.anilist.co";

// Helper for GraphQL requests
async function fetchAniList(query, variables = {}) {
  const response = await axios.post(
    ANILIST_URL,
    { query, variables },
    { headers: { "Content-Type": "application/json" } }
  );
  return response.data.data;
}

// Route 1: GET /api/anime/anime-sections — Anime sections (Airing, Popular, Movies, Trending, Top Rated, Upcoming)
router.get('/anime-sections', async (req, res) => {
  const now = Date.now();

  // Serve from memory immediately if fresh enough
  if (memCache.data && now - memCache.timestamp < CACHE_TTL) {
    return success(res, "Anime sections fetched from cache", memCache.data);
  }

  // If we have stale data, serve it immediately and refresh in background
  if (memCache.data) {
    success(res, "Anime sections fetched from stale cache", memCache.data);
    refreshCache().catch(e => console.error('[animeRoutes] Background refresh failed:', e.message));
    return;
  }

  // No cache at all — must wait for fresh fetch
  try {
    await refreshCache();
    return success(res, "Anime sections fetched successfully", memCache.data);
  } catch (err) {
    console.error("AniList error:", err.response?.data || err.message);
    return error(res, "Failed to fetch anime sections", 500);
  }
});

async function refreshCache() {
    const query = `
      fragment mediaFields on Media {
        id
        idMal
        title { 
          english 
          romaji 
          native 
        }
        description
        coverImage { 
          large 
          extraLarge 
          medium
        }
        bannerImage
        episodes
        averageScore
        status
        genres
        season
        seasonYear
        format
        popularity
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        studios {
          edges {
            node {
              name
            }
          }
        }
        trailer {
          id
          site
          thumbnail
        }
      }

      query {
        airing1: Page(page: 1, perPage: 30) {
          media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        airing2: Page(page: 2, perPage: 30) {
          media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        
        mostWatched1: Page(page: 1, perPage: 30) {
          media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        mostWatched2: Page(page: 2, perPage: 30) {
          media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        
        movies1: Page(page: 1, perPage: 30) {
          media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        movies2: Page(page: 2, perPage: 30) {
          media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }

        trending1: Page(page: 1, perPage: 30) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        trending2: Page(page: 2, perPage: 30) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
            ...mediaFields
          }
        }

        topRated1: Page(page: 1, perPage: 30) {
          media(type: ANIME, sort: SCORE_DESC, isAdult: false, averageScore_greater: 75) {
            ...mediaFields
          }
        }
        topRated2: Page(page: 2, perPage: 30) {
          media(type: ANIME, sort: SCORE_DESC, isAdult: false, averageScore_greater: 75) {
            ...mediaFields
          }
        }

        upcoming1: Page(page: 1, perPage: 30) {
          media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        upcoming2: Page(page: 2, perPage: 30) {
          media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
      }
    `;

    const data = await fetchAniList(query);

    // Process trailer URLs
    const processTrailer = (trailer) => {
      if (!trailer) return null;

      if (trailer.site === 'youtube') {
        return {
          ...trailer,
          url: `https://www.youtube.com/embed/${trailer.id}`,
          fullUrl: `https://www.youtube.com/watch?v=${trailer.id}`
        };
      }
      return trailer;
    };

    // Process each section to add trailer URLs
    const processMediaArray = (mediaArray) => {
      return mediaArray.map(anime => ({
        ...anime,
        trailer: processTrailer(anime.trailer)
      }));
    };

    // Combine pages
    const airingList = [...(data.airing1?.media || []), ...(data.airing2?.media || [])];
    const watchedList = [...(data.mostWatched1?.media || []), ...(data.mostWatched2?.media || [])];
    const moviesList = [...(data.movies1?.media || []), ...(data.movies2?.media || [])];
    const trendingList = [...(data.trending1?.media || []), ...(data.trending2?.media || [])];
    const topRatedList = [...(data.topRated1?.media || []), ...(data.topRated2?.media || [])];
    const upcomingList = [...(data.upcoming1?.media || []), ...(data.upcoming2?.media || [])];


  memCache = {
    data: {
      topAiring: processMediaArray(airingList),
      mostWatched: processMediaArray(watchedList),
      topMovies: processMediaArray(moviesList),
      trending: processMediaArray(trendingList),
      topRated: processMediaArray(topRatedList),
      upcoming: processMediaArray(upcomingList),
    },
    timestamp: Date.now(),
  };
  persistCache(); // Save to disk so next server start is instant
}

// Warm up cache immediately on startup if disk cache is stale or missing
(async () => {
  const age = Date.now() - memCache.timestamp;
  if (!memCache.data || age > CACHE_TTL) {
    console.log('[animeRoutes] Warming up cache on startup...');
    try { await refreshCache(); console.log('[animeRoutes] Cache warmed up.'); }
    catch (e) { console.warn('[animeRoutes] Warm-up failed:', e.message); }
  } else {
    console.log('[animeRoutes] Disk cache is fresh, skipping warm-up.');
  }
})();

// Route 2: GET /api/anime/search — Search anime
router.get('/search', async (req, res) => {
  const q = req.query.q;
  const limit = parseInt(req.query.limit) || 20;

  if (!q) return error(res, "Missing search query", 400);

  try {
    const query = `
      query ($search: String, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          media(search: $search, type: ANIME) {
            id
            idMal
            title { 
              english 
              romaji 
              native 
            }
            description
            coverImage { 
              large 
              extraLarge 
              medium
            }
            bannerImage
            episodes
            averageScore
            status
            season
            seasonYear
            genres
            format
            duration
            popularity
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
            studios {
              edges {
                node {
                  name
                }
              }
            }
            trailer {
              id
              site
              thumbnail
            }
            isAdult
            source
          }
        }
      }
    `;

    const data = await fetchAniList(query, {
      search: q,
      perPage: limit
    });

    // Process trailers for search results
    const processTrailer = (trailer) => {
      if (!trailer) return null;

      if (trailer.site === 'youtube') {
        return {
          ...trailer,
          url: `https://www.youtube.com/embed/${trailer.id}`,
          fullUrl: `https://www.youtube.com/watch?v=${trailer.id}`
        };
      }
      return trailer;
    };

    // Safe filter: remove adult content and process trailers
    const safeResults = (data.Page.media || [])
      .filter(anime => !anime.isAdult)
      .map(anime => ({
        ...anime,
        trailer: processTrailer(anime.trailer)
      }));

    return success(res, "Search results fetched successfully", safeResults);
  } catch (err) {
    console.error("AniList search error:", err.response?.data || err.message);
    return error(res, "Search failed", 500);
  }
});

// Route 3: GET /api/anime/anime/:id — Get single anime details
router.get('/anime/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          idMal
          title { 
            english 
            romaji 
            native 
          }
          description
          coverImage { 
            large 
            extraLarge 
            medium
          }
          bannerImage
          episodes
          averageScore
          status
          genres
          season
          seasonYear
          format
          duration
          popularity
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
          studios {
            edges {
              node {
                name
              }
            }
          }
          trailer {
            id
            site
            thumbnail
          }
          isAdult
          source
          relations {
            edges {
              node {
                id
                title {
                  english
                  romaji
                  native
                }
                coverImage {
                  large
                  medium
                }
                format
                status
              }
              relationType
            }
          }
          characters(page: 1, perPage: 10, sort: ROLE) {
            edges {
              node {
                id
                name {
                  full
                }
                image {
                  large
                  medium
                }
              }
              role
              voiceActors(language: JAPANESE) {
                id
                name {
                  full
                }
                image {
                  large
                  medium
                }
              }
            }
          }
        }
      }
    `;

    const data = await fetchAniList(query, { id: parseInt(id) });

    if (!data.Media) {
      return error(res, "Anime not found", 404);
    }

    // Process trailer
    const processTrailer = (trailer) => {
      if (!trailer) return null;

      if (trailer.site === 'youtube') {
        return {
          ...trailer,
          url: `https://www.youtube.com/embed/${trailer.id}`,
          fullUrl: `https://www.youtube.com/watch?v=${trailer.id}`
        };
      }
      return trailer;
    };

    const processedAnime = {
      ...data.Media,
      trailer: processTrailer(data.Media.trailer)
    };

    return success(res, "Anime details fetched successfully", processedAnime);
  } catch (err) {
    console.error("AniList single anime error:", err.response?.data || err.message);
    return error(res, "Failed to fetch anime details", 500);
  }
});

export default router;