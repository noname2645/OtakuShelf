import { Hono } from 'hono'
import { success } from '../utils/response.js'

const router = new Hono()

const ANILIST_URL = 'https://graphql.anilist.co'

async function fetchAniList(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Origin': 'https://anilist.co',
      'Referer': 'https://anilist.co',
      'User-Agent': 'AnimeRegistry/3.0',
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`AniList error: ${res.status}`)
  return (await res.json()).data
}

const MEDIA_FIELDS = `
  id
  title { romaji english }
  coverImage { extraLarge large medium }
  description
  episodes
  duration
  format
  status
  season
  seasonYear
  genres
  averageScore
  popularity
  bannerImage
  startDate { year month day }
  endDate { year month day }
  studios { edges { node { name } } }
  trailer { id site }
`

function buildEraQuery(where, sort = 'POPULARITY_DESC', perPage = 50) {
  return `query {
    Page(perPage: ${perPage}) {
      media(${where}, sort: ${sort}, type: ANIME, isAdult: false) {
        ${MEDIA_FIELDS}
      }
    }
  }`
}

const ERA_QUERIES = {
  golden: buildEraQuery('startDate_lesser: 19991231, format_in: [TV, MOVIE, OVA]'),
  millen: buildEraQuery('startDate_greater: 20000000, startDate_lesser: 20121231, format_in: [TV, MOVIE, OVA]'),
  bridge: buildEraQuery('startDate_greater: 20130000, startDate_lesser: 20191231, format_in: [TV, MOVIE, OVA]'),
  current: buildEraQuery('startDate_greater: 20200000, format_in: [TV, MOVIE, OVA]'),
  upcoming: buildEraQuery('status: NOT_YET_RELEASED, format_in: [TV, MOVIE, OVA]'),
}

function pickRandom(arr, count = 3) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

const ERA_LABELS = {
  golden: 'Golden Age (pre-2000)',
  millen: 'Millennium Era (2000–2012)',
  bridge: 'Bridge Era (2013–2019)',
  current: 'Modern Era (2020+)',
  upcoming: 'Upcoming',
}

const ERA_INTERLEAVE_ORDER = ['current', 'golden', 'millen', 'current', 'bridge', 'upcoming']

function buildAnnouncements(eraData) {
  const eraMap = {}
  for (const [era, items] of Object.entries(eraData)) {
    eraMap[era] = pickRandom(items.filter(m => m.trailer?.site === 'youtube'), 3)
  }
  const interleaved = []
  let idx = 0
  while (interleaved.length < 18) {
    const era = ERA_INTERLEAVE_ORDER[idx % ERA_INTERLEAVE_ORDER.length]
    const pool = eraMap[era]
    if (pool && pool.length > 0) {
      const item = pool.shift()
      if (item) {
        interleaved.push({ ...item, _era: era, _eraLabel: ERA_LABELS[era] })
      }
    }
    idx++
    if (Object.values(eraMap).every(p => p.length === 0)) break
  }
  return interleaved
}

// ── GET /api/anilist/hero-trailers ──────────────────────────────────────────
router.get('/hero-trailers', async (c) => {
  const cache = c.env.CACHE
  const cacheKey = 'hero-trailers'
  const cached = await cache?.get(cacheKey, 'json')

  if (cached) {
    return success(c, 'Hero trailers fetched', buildAnnouncements(cached))
  }

  const results = await Promise.allSettled(
    Object.entries(ERA_QUERIES).map(async ([era, query]) => {
      const data = await fetchAniList(query)
      return { era, media: data.Page.media }
    })
  )

  const eraData = {}
  for (const result of results) {
    if (result.status === 'fulfilled') {
      eraData[result.value.era] = result.value.media
    }
  }

  await cache?.put(cacheKey, JSON.stringify(eraData), { expirationTtl: 21600 })

  return success(c, 'Hero trailers fetched', buildAnnouncements(eraData))
})

// ── GET /api/anilist/hero-trailers/debug ─────────────────────────────────────
router.get('/hero-trailers/debug', async (c) => {
  const cache = c.env.CACHE
  const raw = await cache?.get('hero-trailers', 'json') || {}
  return success(c, 'Hero cache debug', {
    count: Object.values(raw).reduce((s, arr) => s + arr.length, 0),
    eras: Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.length])),
    cachedAt: new Date().toISOString(),
  })
})

// ── POST /api/anilist/hero-trailers/refresh ──────────────────────────────────
router.post('/hero-trailers/refresh', async (c) => {
  const cache = c.env.CACHE
  const results = await Promise.allSettled(
    Object.entries(ERA_QUERIES).map(async ([era, query]) => {
      const data = await fetchAniList(query)
      return { era, media: data.Page.media }
    })
  )

  const eraData = {}
  for (const result of results) {
    if (result.status === 'fulfilled') {
      eraData[result.value.era] = result.value.media
    }
  }

  await cache?.put('hero-trailers', JSON.stringify(eraData), { expirationTtl: 21600 })

  return success(c, 'Hero trailers cache refreshed', {
    count: Object.values(eraData).reduce((s, arr) => s + arr.length, 0),
  })
})

export default router
