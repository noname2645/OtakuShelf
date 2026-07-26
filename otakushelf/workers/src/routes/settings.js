import { Hono } from 'hono'
import { authenticateToken, authorizeUser } from '../middleware/auth.js'
import { createDb } from '../db/client.js'
import { createUserDb } from '../db/user.js'
import { createAnimeListDb } from '../db/animeList.js'
import { success, error } from '../utils/response.js'

const router = new Hono()

function setup(c) {
  const db = createDb(c.env)
  return { db, users: createUserDb(db), lists: createAnimeListDb(db) }
}

// ── GET /api/settings/:userId ────────────────────────────────────────────────
router.get('/:userId', authenticateToken, authorizeUser, async (c) => {
  const { users } = setup(c)
  const userId = c.get('userId')
  const user = await users.findById(userId)
  if (!user) return error(c, 'User not found', 404)
  return success(c, 'Settings fetched', user.settings || {})
})

// ── PUT /api/settings/:userId ────────────────────────────────────────────────
router.put('/:userId', authenticateToken, authorizeUser, async (c) => {
  const { db } = setup(c)
  const userId = c.get('userId')
  const body = await c.req.json()
  await db.updateOne('users', { _id: db.oid(userId) }, { $set: { settings: body } })
  return success(c, 'Settings updated')
})

// ── POST /api/settings/:userId/revoke-tokens ─────────────────────────────────
router.post('/:userId/revoke-tokens', authenticateToken, authorizeUser, async (c) => {
  const { users } = setup(c)
  const userId = c.get('userId')
  await users.setField(userId, 'refreshTokenHash', null)
  return success(c, 'All tokens revoked')
})

// ── GET /api/settings/:userId/export ─────────────────────────────────────────
router.get('/:userId/export', authenticateToken, authorizeUser, async (c) => {
  const { users, lists } = setup(c)
  const userId = c.get('userId')

  const user = await users.findById(userId)
  const list = await lists.findByUserId(userId)

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      email: user?.email,
      name: user?.name,
      photo: user?.photo,
      emailVerified: user?.emailVerified,
      isMfaEnabled: user?.isMfaEnabled,
      providers: user?.providers?.map(p => ({ type: p.type })),
      profile: user?.profile,
      settings: user?.settings,
      createdAt: user?.createdAt,
    },
    animeList: list ? {
      watching: list.watching,
      completed: list.completed,
      planned: list.planned,
      dropped: list.dropped,
      favorites: list.favorites,
    } : null,
  }

  return c.json(exportData)
})

export default router
