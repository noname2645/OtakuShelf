import './middleware/strip-cf-connecting-ip.js'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { trimTrailingSlash } from 'hono/trailing-slash'

import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profile.js'
import settingsRoutes from './routes/settings.js'
import mfaRoutes from './routes/mfa.js'
import listRoutes from './routes/list.js'
import animeRoutes from './routes/anime.js'
import anilistRoutes from './routes/anilist.js'
import aiRoutes from './routes/ai.js'
import badgeRoutes from './routes/badges.js'
import healthRoutes from './routes/health.js'

const app = new Hono()

app.use('*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
}))
app.use('*', secureHeaders())
app.use('*', logger())
app.use('*', trimTrailingSlash())

app.route('/auth', authRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/profile', profileRoutes)
app.route('/api/settings', settingsRoutes)
app.route('/api/mfa', mfaRoutes)
app.route('/api/list', listRoutes)
app.route('/api/anime', animeRoutes)
app.route('/api/anilist', anilistRoutes)
app.route('/api/ai', aiRoutes)
app.route('/api/badges', badgeRoutes)
app.route('/api', healthRoutes)

app.get('/healthz', (c) => c.json({ status: 'ok' }))
app.get('/api/ping', (c) => c.json({ status: 'ok', timestamp: Date.now() }))

app.notFound((c) => c.json({ status: 'error', message: 'Route not found' }, 404))

app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ status: 'error', message: 'Internal server error' }, 500)
})

// ── WebSocket via Durable Object ─────────────────────────────────────────────
export { UserConnection } from './user-connection.js'

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url)

    // Route WebSocket upgrade requests to Durable Object
    if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      const userId = url.searchParams.get('userId')
      if (!userId) {
        return new Response('Missing userId', { status: 400 })
      }
      const doId = env.USER_CONNECTIONS.idFromName(userId)
      const stub = env.USER_CONNECTIONS.get(doId)
      return stub.fetch(request)
    }

    // All other requests go through Hono
    return app.fetch(request, env, ctx)
  },

  // Pre-warm the hero-trailers KV cache on cron schedule so new users never hit a cold AniList fetch
  async scheduled(controller, env, ctx) {
    const ERA_QUERIES = {
      golden: `query { Page(perPage: 50) { media(startDate_lesser: 19991231, format_in: [TV, MOVIE, OVA], sort: POPULARITY_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage trailer { id site } description episodes duration format status season seasonYear genres averageScore popularity startDate { year month day } endDate { year month day } studios { edges { node { name } } } } } }`,
      millen: `query { Page(perPage: 50) { media(startDate_greater: 20000000, startDate_lesser: 20121231, format_in: [TV, MOVIE, OVA], sort: POPULARITY_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage trailer { id site } description episodes duration format status season seasonYear genres averageScore popularity startDate { year month day } endDate { year month day } studios { edges { node { name } } } } } }`,
      bridge: `query { Page(perPage: 50) { media(startDate_greater: 20130000, startDate_lesser: 20191231, format_in: [TV, MOVIE, OVA], sort: POPULARITY_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage trailer { id site } description episodes duration format status season seasonYear genres averageScore popularity startDate { year month day } endDate { year month day } studios { edges { node { name } } } } } }`,
      current: `query { Page(perPage: 50) { media(startDate_greater: 20200000, format_in: [TV, MOVIE, OVA], sort: POPULARITY_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage trailer { id site } description episodes duration format status season seasonYear genres averageScore popularity startDate { year month day } endDate { year month day } studios { edges { node { name } } } } } }`,
      upcoming: `query { Page(perPage: 50) { media(status: NOT_YET_RELEASED, format_in: [TV, MOVIE, OVA], sort: POPULARITY_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage trailer { id site } description episodes duration format status season seasonYear genres averageScore popularity startDate { year month day } endDate { year month day } studios { edges { node { name } } } } } }`,
    }

    async function fetchAniList(query) {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://anilist.co',
          'Referer': 'https://anilist.co',
          'User-Agent': 'AnimeRegistry/3.0 (anime tracker; https://animeregistry.com)',
        },
        body: JSON.stringify({ query }),
      })
      if (!res.ok) throw new Error(`AniList error: ${res.status}`)
      return (await res.json()).data
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

    if (Object.keys(eraData).length > 0) {
      await env.CACHE.put('hero-trailers', JSON.stringify(eraData), { expirationTtl: 21600 })
      console.log('Hero trailers cache pre-warmed via scheduled handler')
    } else {
      console.error('Scheduled hero-trailers refresh: all AniList queries failed')
    }
  },
}
