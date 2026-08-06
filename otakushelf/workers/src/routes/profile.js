import { Hono } from 'hono'
import { authenticateToken, authorizeUser } from '../middleware/auth.js'
import { createDb } from '../db/client.js'
import { createUserDb } from '../db/user.js'
import { createAnimeListDb } from '../db/animeList.js'
import { sanitizeUser } from '../services/auth.js'
import { success, error } from '../utils/response.js'
import BADGES from '../utils/badgeDefinitions.js'

function publicUser(user) {
  const safe = sanitizeUser(user)
  delete safe.email
  delete safe.providers
  delete safe.emailVerified
  delete safe.isMfaEnabled
  return safe
}

const ALL_GENRES = [
  'Action', 'Adventure', 'Avant Garde', 'Award Winning',
  'Boys Love', 'Comedy', 'Drama', 'Fantasy', 'Girls Love',
  'Gourmet', 'Horror', 'Mystery', 'Romance', 'Sci-Fi',
  'Slice of Life', 'Sports', 'Supernatural', 'Suspense', 'Thriller',
]

const router = new Hono()

function setup(c) {
  const db = createDb(c.env)
  return { db, users: createUserDb(db), lists: createAnimeListDb(db), env: c.env }
}

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
const PHOTO_MAX_SIZE = 15 * 1024 * 1024
const COVER_MAX_SIZE = 15 * 1024 * 1024

function bufferToDataUrl(buffer, mimeType) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
  return `data:${mimeType};base64,${base64}`
}

// ── POST /api/profile/:userId/upload-photo ────────────────────────────────────
router.post('/:userId/upload-photo', authenticateToken, authorizeUser, async (c) => {
  const { users } = setup(c)
  const userId = c.get('userId')

  const body = await c.req.parseBody()
  const photo = body['photo']
  if (!photo || !photo.size) return error(c, 'No photo uploaded', 400)

  if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) return error(c, 'Photo must be JPEG, PNG, WebP, GIF, or short MP4/WebM video', 400)
  if (photo.size > PHOTO_MAX_SIZE) return error(c, 'Photo must be under 15MB', 400)

  const buf = await photo.arrayBuffer()
  const dataUrl = bufferToDataUrl(buf, photo.type)

  await users.update(userId, { photo: dataUrl })
  const updated = await users.findById(userId)
  return success(c, 'Photo uploaded', sanitizeUser(updated))
})

// ── POST /api/profile/:userId/upload-cover ────────────────────────────────────
router.post('/:userId/upload-cover', authenticateToken, authorizeUser, async (c) => {
  const { users } = setup(c)
  const userId = c.get('userId')

  const body = await c.req.parseBody()
  const cover = body['cover']
  if (!cover || !cover.size) return error(c, 'No cover image uploaded', 400)

  if (!ALLOWED_COVER_TYPES.includes(cover.type)) return error(c, 'Cover must be JPEG, PNG, WebP, GIF, or short MP4/WebM video', 400)
  if (cover.size > COVER_MAX_SIZE) return error(c, 'Cover must be under 15MB', 400)

  const buf = await cover.arrayBuffer()
  const dataUrl = bufferToDataUrl(buf, cover.type)

  await users.update(userId, { 'profile.coverImage': dataUrl })

  const updated = await users.findById(userId)
  return success(c, 'Cover uploaded', sanitizeUser(updated))
})

// ── GET /api/profile/:userId ─────────────────────────────────────────────────
router.get('/:userId', authenticateToken, async (c) => {
  const { users, lists, db } = setup(c)
  const authUserId = c.get('userId')
  const userId = c.req.param('userId') || authUserId

  const user = await users.findById(userId)
  if (!user) return error(c, 'User not found', 404)

  const list = await lists.findByUserId(userId)
  const watching = list?.watching || []
  const completed = list?.completed || []
  const planned = list?.planned || []
  const dropped = list?.dropped || []
  const allAnime = [...watching, ...completed, ...planned, ...dropped]

  // Touch lastActiveAt only for the profile owner (deferred so it never delays the response)
  if (authUserId === userId) {
    const now = new Date().toISOString()
    const touchLastActiveAt = () => users.update(userId, { 'profile.lastActiveAt': now })
      .catch(e => console.warn('[Profile] Failed to update lastActiveAt:', e?.message))
    if (c.executionCtx) {
      c.executionCtx.waitUntil(touchLastActiveAt())
    } else {
      touchLastActiveAt()
    }
    if (!user.profile) user.profile = {}
    user.profile.lastActiveAt = now
  }

  const stats = {
    animeWatched: completed.length,
    hoursWatched: parseFloat((allAnime.reduce((s, a) => s + (a.episodesWatched || 0), 0) * 24 / 60).toFixed(2)),
    currentlyWatching: watching.length,
    favorites: list?.favorites?.length || 0,
    animePlanned: planned.length,
    animeDropped: dropped.length,
    totalEpisodes: allAnime.reduce((s, a) => s + (a.episodesWatched || 0), 0),
    meanScore: (() => {
      const rated = completed.filter(a => a.userRating)
      return rated.length ? (rated.reduce((s, a) => s + a.userRating, 0) / rated.length).toFixed(1) : 0
    })(),
  }

  // Genre counts & percentages (all 19 genres for pie chart)
  const genreCounts = {}
  allAnime.forEach(a => { if (Array.isArray(a.genres)) a.genres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1 }) })
  const totalGenreAssignments = Object.values(genreCounts).reduce((s, v) => s + v, 0) || 1

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count, percentage: parseFloat(((count / totalGenreAssignments) * 100).toFixed(1)) }))

  const favoriteGenres = ALL_GENRES.map(name => {
    const count = genreCounts[name] || 0
    return { name, count, percentage: parseFloat(((count / totalGenreAssignments) * 100).toFixed(1)) }
  })

  const recentlyWatched = [...watching, ...completed]
    .map(a => ({
      ...a,
      _sortDate: a.status === 'completed'
        ? new Date(a.finishDate || a.addedDate || a.updatedAt || 0)
        : new Date(a.addedDate || a.updatedAt || 0),
    }))
    .sort((a, b) => b._sortDate - a._sortDate)
    .slice(0, 6)
    .map(a => ({
      title: a.title, animeId: a.animeId, malId: a.malId, image: a.image, coverImage: a.coverImage,
      episodesWatched: a.episodesWatched, status: a.status, genres: a.genres,
    }))

  const favorites = (list?.favorites || []).slice(0, 10).map(f => ({
    title: f.title, animeId: f.animeId, malId: f.malId, image: f.image, coverImage: f.coverImage,
    userRating: f.userRating, genres: f.genres,
  }))

  const badges = user.profile?.badges || []
  const totalBadgeDefs = (BADGES && BADGES.length) || 0

  c.header('Cache-Control', 'no-store')

  return success(c, 'Profile fetched', {
    user: authUserId === userId ? sanitizeUser(user) : publicUser(user),
    profile: {
      username: user.username || user.profile?.username || null,
      bio: user.profile?.bio || null,
      coverImage: user.profile?.coverImage || null,
      joinDate: user.profile?.joinDate || user.createdAt,
      lastActiveAt: user.profile?.lastActiveAt || null,
      badges,
      favoriteGenres,
    },
    stats,
    topGenres,
    recentlyWatched,
    favorites,
    badgeInfo: {
      earnedBadgeCount: badges.length,
      totalBadgeDefs,
    },
  })
})

// ── GET /api/profile/:userId/watchLog ─────────────────────────────────────────
router.get('/:userId/watchLog', authenticateToken, async (c) => {
  const { lists } = setup(c)
  const userId = c.req.param('userId') || c.get('userId')

  const list = await lists.findByUserId(userId)
  const entries = [...(list?.watching || []), ...(list?.completed || [])]

  const dailyCounts = {}
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  entries.forEach(a => {
    const d = new Date(a.updatedAt || a.addedDate || Date.now())
    if (d >= oneYearAgo) {
      const key = d.toISOString().split('T')[0]
      dailyCounts[key] = (dailyCounts[key] || 0) + 1
    }
  })

  const watchLog = Object.entries(dailyCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return success(c, 'Watch log', watchLog)
})

// ── PUT /api/profile/:userId ─────────────────────────────────────────────────
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

function normalizeUsername(raw) {
  if (typeof raw !== 'string') return null
  let u = raw.trim().replace(/^@/, '')
  if (!u) return null
  return u.toLowerCase()
}

router.put('/:userId', authenticateToken, authorizeUser, async (c) => {
  const { users, db } = setup(c)
  const userId = c.get('userId')
  const body = await c.req.json()

  const { name, photo, profile } = body
  const update = {}
  if (name !== undefined) update.name = name
  if (photo !== undefined) update.photo = photo
  if (profile) {
    if (profile.username !== undefined) {
      const normalized = normalizeUsername(profile.username)
      if (normalized) {
        if (!USERNAME_REGEX.test(normalized)) {
          return error(c, 'Username must be 3-20 characters and use only letters, numbers, or underscores', 400)
        }
        const existing = await users.findByUsernameExcludingId(normalized, userId)
        if (existing) return error(c, 'Username already taken', 409)
        update.username = normalized
        update['profile.username'] = normalized
      }
    }
    if (profile.bio !== undefined) update['profile.bio'] = profile.bio
    if (profile.preferences !== undefined) update['profile.preferences'] = profile.preferences
  }

  await users.update(userId, update)
  const updated = await users.findById(userId)
  return success(c, 'Profile updated', sanitizeUser(updated))
})

// ── GET /api/profile/check-username/:username ────────────────────────────────
router.get('/check-username/:username', authenticateToken, async (c) => {
  const { users } = setup(c)
  const userId = c.get('userId')
  const username = normalizeUsername(c.req.param('username'))
  if (!username) return error(c, 'Invalid username', 400)

  if (!USERNAME_REGEX.test(username)) {
    return success(c, 'Username available', {
      username,
      valid: false,
      available: false,
      reason: 'Username must be 3-20 characters and use only letters, numbers, or underscores',
    })
  }

  const existing = await users.findByUsernameExcludingId(username, userId)
  return success(c, 'Username check', {
    username,
    valid: true,
    available: !existing,
  })
})

// ── GET /api/profile/suggest-usernames/:base ────────────────────────────────
router.get('/suggest-usernames/:base', authenticateToken, async (c) => {
  const { users } = setup(c)
  const userId = c.get('userId')
  const base = normalizeUsername(c.req.param('base'))
  if (!base) return error(c, 'Invalid username base', 400)

  const cleanBase = base.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)
  if (!cleanBase) return error(c, 'Invalid username base', 400)

  const suggestions = []
  const tried = new Set()
  const attempt = (name) => {
    if (suggestions.length >= 8 || tried.has(name)) return
    tried.add(name)
    suggestions.push(name)
  }

  const firstSuffixes = ['', '_1', '_2', '_3', '_4', '_5', '_6', '_7', '_8', '_9', '_10']
  const adjectives = ['otaku', 'anime', 'weeb', 'fan', 'sama', 'kun', 'chan', 'senpai', 'lover', 'master', 'prime', 'ultra', 'epic', 'cool', 'pro']

  // 1) Raw base, then numbered suffixes
  firstSuffixes.forEach((s, i) => {
    const candidate = `${cleanBase}${s}`.slice(0, 20)
    if (s === '' && i === 0 && !USERNAME_REGEX.test(candidate)) return
    attempt(candidate)
  })

  // 2) Common otaku-flavored suffixes
  if (suggestions.length < 8) {
    adjectives.forEach(a => {
      const candidate = `${cleanBase}_${a}`.slice(0, 20)
      attempt(candidate)
    })
  }

  // 3) Fall back to purely random 4-digit suffixes until we have 8
  if (suggestions.length < 8) {
    let guard = 0
    while (suggestions.length < 8 && guard < 40) {
      guard++
      const num = Math.floor(1000 + Math.random() * 9000)
      attempt(`${cleanBase.slice(0, 16)}${num}`)
    }
  }

  // 4) De-duplicate against taken usernames
  const taken = new Set()
  for (const name of suggestions) {
    const existing = await users.findByUsernameExcludingId(name, userId)
    if (existing) taken.add(name)
  }
  const available = suggestions.filter(name => !taken.has(name))
  if (available.length === 0) available.push(`${cleanBase.slice(0, 12)}${Date.now() % 100000}`)

  return success(c, 'Username suggestions', { suggestions: available.slice(0, 8) })
})

export default router
