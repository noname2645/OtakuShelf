import { Hono } from 'hono'
import { authenticateToken, authorizeUser } from '../middleware/auth.js'
import { createDb } from '../db/client.js'
import { createUserDb } from '../db/user.js'
import { createAnimeListDb } from '../db/animeList.js'
import evaluateBadges, { BADGES } from '../services/badgeEngine.js'
import { success, error } from '../utils/response.js'

const router = new Hono()

const PUBLIC_BADGES = BADGES.map(({ id, title, description, icon, rarity, category }) => ({
  id, title, description, icon, rarity, category,
}))

// ── GET /api/badges/all ──────────────────────────────────────────────────────
router.get('/all', async (c) => {
  const cache = c.env.CACHE
  const cached = await cache?.get('all-badges', 'json')
  if (cached) return success(c, 'Badge definitions', cached)

  await cache?.put('all-badges', JSON.stringify(PUBLIC_BADGES), { expirationTtl: 3600 })
  return success(c, 'Badge definitions', PUBLIC_BADGES)
})

// ── POST /api/badges/evaluate/:userId ────────────────────────────────────────
router.post('/evaluate/:userId', authenticateToken, authorizeUser, async (c) => {
  const userId = c.get('userId')
  const result = await evaluateBadges(userId, c.env)
  return success(c, 'Badge evaluation complete', result)
})

// ── GET /api/profile/:userId/badges ──────────────────────────────────────────
router.get('/profile/:userId/badges', authenticateToken, authorizeUser, async (c) => {
  const { users, lists } = setup(c)
  const userId = c.get('userId')

  const list = await lists.findByUserId(userId)
  const completed = list?.completed?.length || 0
  const totalEpisodes = [...(list?.watching || []), ...(list?.completed || []), ...(list?.planned || []), ...(list?.dropped || [])]
    .reduce((s, a) => s + (a.episodesWatched || 0), 0)

  const legacyBadges = []
  if (totalEpisodes >= 500) legacyBadges.push({ id: 'anime_veteran', title: 'Anime Veteran', icon: '🏆', earned: true })
  if (completed >= 50) legacyBadges.push({ id: 'completionist', title: 'Completionist', icon: '✅', earned: true })

  return success(c, 'Legacy badges', legacyBadges)
})

function setup(c) {
  const db = createDb(c.env)
  return { db, users: createUserDb(db), lists: createAnimeListDb(db) }
}

export default router
