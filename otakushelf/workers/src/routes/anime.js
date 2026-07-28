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

// ── POST /api/anime/related ──────────────────────────────────────────────────
router.post('/related', async (c) => {
  const { id, type } = await c.req.json()
  if (!id) return error(c, 'Anime ID is required', 400)

  const cacheKey = `related:${id}`
  const cache = c.env.CACHE
  const cached = await cache?.get(cacheKey, 'json')
  if (cached) return success(c, 'Related anime (cached)', cached)

  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        relations {
          edges {
            relationType
            node {
              id idMal title { romaji english native userPreferred }
              type coverImage { large medium extraLarge } bannerImage
              status description episodes averageScore format genres
              studios { edges { node { name } } }
              startDate { year month day } endDate { year month day }
              season seasonYear popularity isAdult trailer { id site }
            }
          }
        }
      }
    }`

  const data = await fetchAniList(query, { id: parseInt(id) })
  const edges = data.Media?.relations?.edges || []
  const animeEdges = edges.filter(e => !type || e?.node?.type === type)

  await cache?.put(cacheKey, JSON.stringify(animeEdges), { expirationTtl: 3600 })

  return success(c, 'Related anime', animeEdges)
})

// ── POST /api/anime/advanced-search ──────────────────────────────────────────
router.post('/advanced-search', async (c) => {
  const {
    search, genres, genre_in, format_in, status_in,
    season, seasonYear, averageScore_greater, page = 1, perPage = 50,
  } = await c.req.json()

  const cacheParts = [search || '', (genres || genre_in || []).sort().join(','), (format_in || []).sort().join(','), (status_in || []).sort().join(','), season || '', seasonYear || '', averageScore_greater || '', page]
  const cacheKey = `advsearch:${cacheParts.join('|')}`
  const cache = c.env.CACHE
  const cached = await cache?.get(cacheKey, 'json')
  if (cached) return success(c, 'Advanced search results (cached)', cached)

  const query = `
    query ($page: Int, $perPage: Int, $search: String, $genre_in: [String], $format_in: [MediaFormat], $status_in: [MediaStatus], $season: Season, $seasonYear: Int, $averageScore_greater: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage perPage }
        media(
          search: $search type: ANIME isAdult: false
          genre_in: $genre_in format_in: $format_in status_in: $status_in
          season: $season seasonYear: $seasonYear averageScore_greater: $averageScore_greater
          sort: POPULARITY_DESC
        ) {
          id idMal title { romaji english native }
          coverImage { extraLarge large medium } bannerImage
          startDate { year month day } endDate { year month day }
          description episodes format status genres averageScore
          trailer { id site } studios { edges { node { name } } }
          relations { edges { relationType node { id title { romaji } type } } }
        }
      }
    }`

  const variables = { page: parseInt(page), perPage: parseInt(perPage) }
  if (search) variables.search = search
  if (genre_in || genres) variables.genre_in = genre_in || genres
  if (format_in?.length) variables.format_in = format_in
  if (status_in?.length) variables.status_in = status_in
  if (season) variables.season = season
  if (seasonYear) variables.seasonYear = parseInt(seasonYear)
  if (averageScore_greater) variables.averageScore_greater = parseInt(averageScore_greater)

  const data = await fetchAniList(query, variables)
  const result = {
    items: filterAdult(data.Page.media),
    pageInfo: data.Page.pageInfo,
  }

  await cache?.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 })

  return success(c, 'Advanced search results', result)
})

export default router
