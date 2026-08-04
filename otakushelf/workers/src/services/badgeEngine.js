import { createDb } from '../db/client.js'
import { createUserDb } from '../db/user.js'
import { createAnimeListDb } from '../db/animeList.js'
import BADGES from '../utils/badgeDefinitions.js'

const ALL_GENRES = [
  'Action', 'Adventure', 'Avant Garde', 'Award Winning',
  'Boys Love', 'Comedy', 'Drama', 'Fantasy', 'Girls Love',
  'Gourmet', 'Horror', 'Mystery', 'Romance', 'Sci-Fi',
  'Slice of Life', 'Sports', 'Supernatural', 'Suspense', 'Thriller',
]

function computeStats(list, user) {
  const watching = list?.watching || []
  const completed = list?.completed || []
  const planned = list?.planned || []
  const dropped = list?.dropped || []
  const allAnime = [...watching, ...completed, ...planned, ...dropped]

  let totalEpisodes = 0
  allAnime.forEach(a => { totalEpisodes += (a.episodesWatched || 0) })
  const hoursWatched = parseFloat((totalEpisodes * 24 / 60).toFixed(2))

  const genreCounts = {}
  const seenPerAnime = new Set()
  allAnime.forEach(a => {
    if (!Array.isArray(a.genres)) return
    const key = a.animeId || a.title
    if (seenPerAnime.has(key)) return
    seenPerAnime.add(key)
    a.genres.forEach(g => {
      const name = typeof g === 'string' ? g : g?.name
      if (name) genreCounts[name] = (genreCounts[name] || 0) + 1
    })
  })

  const uniqueGenresWatched = Object.keys(genreCounts).filter(g =>
    ALL_GENRES.includes(g) && genreCounts[g] > 0
  ).length

  let ratedCount = 0, ratingSum = 0, perfectRatings = 0, lowestRatings = 0
  allAnime.forEach(a => {
    if (a.userRating && a.userRating > 0) {
      ratedCount++
      ratingSum += a.userRating
      if (a.userRating >= 5) perfectRatings++
      if (a.userRating <= 1) lowestRatings++
    }
  })
  const avgRating = ratedCount > 0 ? ratingSum / ratedCount : 0

  const accountAgeDays = user.createdAt
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const hasBio = !!(user.profile?.bio && user.profile.bio.trim().length > 0)
  const hasUsername = !!(user.username || user.profile?.username) && (user.username || user.profile?.username || '').trim().length > 0
  const hasCoverImage = !!(user.profile?.coverImage && user.profile.coverImage.trim().length > 0)

  const existingBadgeIds = new Set((user.profile?.badges || []).map(b => b.id).filter(Boolean))
  const hasMalImport = existingBadgeIds.has('mal_importer') || allAnime.some(a => a.malId && !a.malId.startsWith('mal_'))

  return {
    totalAnime: allAnime.length,
    watching: watching.length,
    completed: completed.length,
    planned: planned.length,
    dropped: dropped.length,
    totalEpisodes,
    hoursWatched,
    genreCounts,
    uniqueGenresWatched,
    ratedCount,
    avgRating,
    perfectRatings,
    lowestRatings,
    accountAgeDays,
    hasGoogleAuth: user.authType === 'google',
    isMfaEnabled: !!user.isMfaEnabled,
    hasBio,
    hasUsername,
    hasCoverImage,
    hasMalImport,
  }
}

export async function evaluateBadges(userId, env, forceMalImport = false) {
  try {
    const db = createDb(env)
    const users = createUserDb(db)
    const lists = createAnimeListDb(db)

    const [user, list] = await Promise.all([
      users.findById(userId),
      lists.findByUserId(userId),
    ])

    if (!user) {
      console.warn(`[BadgeEngine] User ${userId} not found`)
      return { newBadges: [], totalEarned: 0 }
    }

    if (!user.profile) user.profile = {}
    if (!Array.isArray(user.profile.badges)) user.profile.badges = []

    const earnedIds = new Set(user.profile.badges.map(b => b.id).filter(Boolean))
    const stats = computeStats(list, user)
    if (forceMalImport) stats.hasMalImport = true

    const now = new Date().toISOString()
    const newBadges = []

    for (const badge of BADGES) {
      if (earnedIds.has(badge.id)) continue
      let earned = false
      try { earned = badge.check(stats) } catch {}
      if (earned) {
        user.profile.badges.push({
          id: badge.id,
          title: badge.title,
          description: badge.description,
          icon: badge.icon,
          rarity: badge.rarity,
          category: badge.category,
          earnedDate: now,
        })
        earnedIds.add(badge.id)
        newBadges.push(badge)
      }
    }

    if (newBadges.length > 0) {
      await db.updateOne('users', { _id: db.oid(userId) }, {
        $set: { profile: user.profile },
      })
    }

    return { newBadges, totalEarned: user.profile.badges.length }
  } catch (err) {
    console.error(`[BadgeEngine] Error for ${userId}:`, err.message)
    return { newBadges: [], totalEarned: 0 }
  }
}

export { computeStats, BADGES }
export default evaluateBadges
