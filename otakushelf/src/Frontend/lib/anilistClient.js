// Client-side AniList client.
//
// Why this exists: the Cloudflare Worker's egress IPs are blocked by AniList,
// so any request the API worker makes to https://graphql.anilist.co fails in
// production (and the /api/anime/anime-sections + /api/anilist/hero-trailers
// routes return empty). The browser is NOT blocked — AniList sends permissive
// CORS headers and the search feature already queries it directly. So the home
// hero + sections fetch AniList straight from the browser, with localStorage
// caching so repeat visits never re-query. The API worker is still tried first
// (fast path on localhost / KV-warmed cache), but the page never blocks on it.

const ANILIST_URL = 'https://graphql.anilist.co'

const ADULT_GENRES = ['Hentai']

const DEFAULT_TIMEOUT = 10000

// ── Low-level fetch ──────────────────────────────────────────────────────────
export async function anilistFetch(query, variables = {}, { timeout = DEFAULT_TIMEOUT, signal } = {}) {
  const ownSignal = new AbortController()
  const timer = setTimeout(() => ownSignal.abort(), timeout)
  const onAbort = () => ownSignal.abort()

  try {
    signal?.addEventListener('abort', onAbort)
    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: signal || ownSignal.signal,
    })
    if (!res.ok) throw new Error(`AniList HTTP ${res.status}`)
    const json = await res.json()
    if (json.errors) {
      const msg = json.errors[0]?.message || 'AniList error'
      const err = new Error(msg)
      err.anilistErrors = json.errors
      throw err
    }
    return json.data
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

export const isAdult = (media) => media?.genres?.some((g) => ADULT_GENRES.includes(g))
export const filterAdult = (list) => (list || []).filter((m) => !isAdult(m))

// ── localStorage cache helpers ───────────────────────────────────────────────
export function readCache(key, { maxAgeMs = Infinity } = {}) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const writtenAt = parseInt(localStorage.getItem(`${key}_time`) || '0', 10)
    if (Date.now() - writtenAt > maxAgeMs) return null
    return parsed
  } catch {
    return null
  }
}

export function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    localStorage.setItem(`${key}_time`, Date.now().toString())
  } catch {
    /* storage full / private mode — cache is best-effort */
  }
}

export function clearCache(key) {
  try {
    localStorage.removeItem(key)
    localStorage.removeItem(`${key}_time`)
  } catch { /* noop */ }
}

// ── Homepage sections (6 carousels) ──────────────────────────────────────────
const SECTION_QUERIES = {
  topAiring: `query { Page(perPage: 10) { media(status: RELEASING, sort: SCORE_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes nextAiringEpisode { episode airingAt } format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site } } } }`,
  trending: `query { Page(perPage: 10) { media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site } } } }`,
  topRated: `query { Page(perPage: 10) { media(sort: SCORE_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site } } } }`,
  upcoming: `query { Page(perPage: 10) { media(status: NOT_YET_RELEASED, sort: POPULARITY_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site } } } }`,
  topMovies: `query { Page(perPage: 10) { media(format: MOVIE, sort: POPULARITY_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site } } } }`,
  mostWatched: `query { Page(perPage: 10) { media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site } } } }`,
}

export const SECTION_KEYS = Object.keys(SECTION_QUERIES)

// Fetch all six section queries from AniList in parallel (never blocks forever).
export async function fetchSectionsFromAniList({ timeout = DEFAULT_TIMEOUT, signal } = {}) {
  const settled = await Promise.allSettled(
    SECTION_KEYS.map(async (key) => {
      const data = await anilistFetch(SECTION_QUERIES[key], {}, { timeout, signal })
      return { key, media: filterAdult(data.Page.media) }
    })
  )
  const sections = {}
  for (const result of settled) {
    if (result.status === 'fulfilled') sections[result.value.key] = result.value.media
  }
  return sections
}

// ── Hero trailer (era-curated picks) ─────────────────────────────────────────
// Mirrors the backend era logic (workers/src/routes/anilist.js) so the hero
// works even when the API worker cannot reach AniList.
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

export const HERO_ERA_QUERIES = {
  golden: buildEraQuery('startDate_lesser: 19991231, format_in: [TV, MOVIE, OVA]'),
  millen: buildEraQuery('startDate_greater: 20000000, startDate_lesser: 20121231, format_in: [TV, MOVIE, OVA]'),
  bridge: buildEraQuery('startDate_greater: 20130000, startDate_lesser: 20191231, format_in: [TV, MOVIE, OVA]'),
  current: buildEraQuery('startDate_greater: 20200000, format_in: [TV, MOVIE, OVA]'),
  upcoming: buildEraQuery('status: NOT_YET_RELEASED, format_in: [TV, MOVIE, OVA]'),
}

export const HERO_ERA_CACHE_KEY = 'hero_era_data'
export const HERO_ERA_CACHE_TTL = 6 * 60 * 60 * 1000 // 6h

// Fetch era data from AniList directly (parallel). Returns the era map.
export async function fetchHeroEraData({ timeout = DEFAULT_TIMEOUT, signal } = {}) {
  const settled = await Promise.allSettled(
    Object.entries(HERO_ERA_QUERIES).map(async ([era, query]) => {
      const data = await anilistFetch(query, {}, { timeout, signal })
      return { era, media: filterAdult(data.Page.media) }
    })
  )
  const eraData = {}
  for (const result of settled) {
    if (result.status === 'fulfilled') eraData[result.value.era] = result.value.media
  }
  return eraData
}

const HERO_ERA_LABELS = {
  golden: 'Golden Age (pre-2000)',
  millen: 'Millennium Era (2000–2012)',
  bridge: 'Bridge Era (2013–2019)',
  current: 'Modern Era (2020+)',
  upcoming: 'Upcoming',
}

const HERO_ERA_INTERLEAVE_ORDER = ['current', 'golden', 'millen', 'current', 'bridge', 'upcoming']

function pickRandom(arr, count = 3) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Same curation as the backend: pick 3 random youtube-trailer titles per era,
// then interleave them into a hero playlist.
export function buildHeroAnnouncements(eraData) {
  const eraMap = {}
  for (const [era, items] of Object.entries(eraData || {})) {
    eraMap[era] = pickRandom(items.filter((m) => m.trailer?.site === 'youtube'), 3)
  }
  const interleaved = []
  let idx = 0
  while (interleaved.length < 18) {
    const era = HERO_ERA_INTERLEAVE_ORDER[idx % HERO_ERA_INTERLEAVE_ORDER.length]
    const pool = eraMap[era]
    if (pool && pool.length > 0) {
      const item = pool.shift()
      if (item) {
        interleaved.push({ ...item, _era: era, _eraLabel: HERO_ERA_LABELS[era] })
      }
    }
    idx++
    if (Object.values(eraMap).every((p) => p.length === 0)) break
  }
  return interleaved
}
