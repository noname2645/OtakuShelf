import { Hono } from 'hono'
import { success, error } from '../utils/response.js'

const router = new Hono()

const ANILIST_URL = 'https://graphql.anilist.co'

async function fetchAniList(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AniList error: ${res.status} — ${text.slice(0, 200)}`)
  }
  return (await res.json()).data
}

const GENRE_FILTERS = ['Hentai']

function filterAdult(mediaList) {
  return (mediaList || []).filter(m => !m.genres?.some(g => GENRE_FILTERS.includes(g)))
}

// ── GET /api/anime/anime-sections ────────────────────────────────────────────
router.get('/anime-sections', async (c) => {
  const cache = c.env.CACHE
  const cacheKey = 'anime-sections-v2'
  const cached = await cache?.get(cacheKey, 'json')
  if (cached) return success(c, 'Cached anime sections', cached)

  const queries = {
    topAiring: `
      query { Page(perPage: 10) {
        media(status: RELEASING, sort: SCORE_DESC, type: ANIME, isAdult: false) {
          id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes nextAiringEpisode { episode airingAt } format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site }
        }
      }}`,
    trending: `
      query { Page(perPage: 10) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site }
        }
      }}`,
    topRated: `
      query { Page(perPage: 10) {
        media(sort: SCORE_DESC, type: ANIME, isAdult: false) {
          id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site }
        }
      }}`,
    upcoming: `
      query { Page(perPage: 10) {
        media(status: NOT_YET_RELEASED, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site }
        }
      }}`,
    topMovies: `
      query { Page(perPage: 10) {
        media(format: MOVIE, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site }
        }
      }}`,
    mostWatched: `
      query { Page(perPage: 10) {
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site }
        }
      }}`,
  }

  const sections = {}

  for (const [key, query] of Object.entries(queries)) {
    try {
      const data = await fetchAniList(query)
      sections[key] = filterAdult(data.Page.media)
    } catch (e) {
      console.error(`AniList ${key}: ${e.message}`)
    }
  }

  await cache?.put(cacheKey, JSON.stringify(sections), { expirationTtl: 86400 })

  return success(c, 'Anime sections fetched', sections)
})

// ── GET /api/anime/search ────────────────────────────────────────────────────
router.get('/search', async (c) => {
  const q = c.req.query('q')
  const limit = parseInt(c.req.query('limit') || '20')

  if (!q) return error(c, 'Search query is required', 400)

  const cacheKey = `search:${q.toLowerCase()}`
  const cache = c.env.CACHE
  const cached = await cache?.get(cacheKey, 'json')
  if (cached) return success(c, 'Search results (cached)', cached)

  const query = `
    query ($search: String, $limit: Int) {
      Page(perPage: $limit) {
        media(search: $search, type: ANIME, isAdult: false) {
          id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description season seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site }
        }
      }
    }`

  const data = await fetchAniList(query, { search: q, limit })
  const results = filterAdult(data.Page.media)

  await cache?.put(cacheKey, JSON.stringify(results), { expirationTtl: 300 })

  return success(c, 'Search results', results)
})

// ── GET /api/anime/anime/:id ─────────────────────────────────────────────────
router.get('/anime/:id', async (c) => {
  const id = c.req.param('id')

  const cacheKey = `anime:${id}`
  const cache = c.env.CACHE
  const cached = await cache?.get(cacheKey, 'json')
  if (cached) return success(c, 'Anime details (cached)', cached)

  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id title { romaji english native } description coverImage { extraLarge large medium } bannerImage
        episodes duration format status season seasonYear startDate { year month day } endDate { year month day } genres averageScore popularity
        studios(isMain: true) { nodes { name } }
        characters(sort: RELEVANCE, perPage: 10) { nodes { id name { full } image { medium } } }
        relations { nodes { id title { romaji } type format status coverImage { medium } } }
        trailer { id site }
        recommendations(perPage: 5, sort: RATING_DESC) {
          nodes { mediaRecommendation { id title { romaji } coverImage { medium } averageScore } }
        }
      }
    }`

  const data = await fetchAniList(query, { id: parseInt(id) })

  await cache?.put(cacheKey, JSON.stringify(data.Media), { expirationTtl: 3600 })

  return success(c, 'Anime details', data.Media)
})

export default router
