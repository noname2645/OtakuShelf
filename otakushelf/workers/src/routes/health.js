import { Hono } from 'hono'
import { success } from '../utils/response.js'

const router = new Hono()

// ── GET /api/health ──────────────────────────────────────────────────────────
router.get('/health', async (c) => {
  const info = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
    uptime: Math.floor((Date.now() - (c.get('startTime') || Date.now())) / 1000),
    database: 'mongodb-atlas',
    cache: c.env.CACHE ? 'connected' : 'not configured',
    storage: c.env.UPLOADS ? 'connected' : 'not configured',
  }

  return success(c, 'Health check', info)
})



export default router
