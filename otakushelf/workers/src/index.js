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
}
