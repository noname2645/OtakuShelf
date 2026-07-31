import { Hono } from 'hono'
import { authenticateToken, authorizeUser } from '../middleware/auth.js'
import { createDb } from '../db/client.js'
import { createAnimeListDb } from '../db/animeList.js'
import { success, error } from '../utils/response.js'
import evaluateBadges from '../services/badgeEngine.js'

const router = new Hono()

function setup(c) {
  const db = createDb(c.env)
  return { db, lists: createAnimeListDb(db) }
}

async function getOrCreateList(lists, userId) {
  let list = await lists.findByUserId(userId)
  if (!list) {
    const { insertedId } = await lists.create({
      userId: { $oid: userId },
      watching: [],
      completed: [],
      planned: [],
      dropped: [],
      favorites: [],
    })
    list = await lists.findByUserId(userId)
  }
  return list
}

// ── GET /api/list/:userId ────────────────────────────────────────────────────
router.get('/:userId', authenticateToken, authorizeUser, async (c) => {
  const { lists } = setup(c)
  const userId = c.get('userId')
  const list = await getOrCreateList(lists, userId)
  return success(c, 'List fetched', list)
})

// ── POST /api/list/:userId (add anime) ───────────────────────────────────────
router.post('/:userId', authenticateToken, authorizeUser, async (c) => {
  const { db, lists } = setup(c)
  const userId = c.get('userId')
  const { anime, category } = await c.req.json()

  if (!anime || !anime.animeId || !category) return error(c, 'Anime data and category are required', 400)
  if (!['watching', 'completed', 'planned', 'dropped'].includes(category)) return error(c, 'Invalid category', 400)

  let list = await lists.findByUserId(userId)
  if (!list) {
    const { insertedId } = await lists.create({
      userId: { $oid: userId },
      watching: [],
      completed: [],
      planned: [],
      dropped: [],
      favorites: [],
    })
    list = await lists.findByUserId(userId)
  }

  const existingEntry = list[category]?.find(a => a.animeId === anime.animeId)
  if (existingEntry) return error(c, 'Anime already in this category', 409)

  const entry = {
    title: anime.title,
    animeId: anime.animeId,
    malId: anime.malId || '',
    image: anime.image || '',
    totalEpisodes: anime.totalEpisodes || 0,
    episodes: anime.totalEpisodes || 0,
    episodesWatched: anime.episodesWatched || 0,
    addedDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userRating: anime.userRating || 0,
    status: category === 'completed' ? 'completed' : category === 'planned' ? 'planned' : category === 'dropped' ? 'dropped' : 'watching',
    genres: anime.genres || [],
  }

  await db.updateOne(
    'animerists',
    { userId: { $oid: userId } },
    { $push: { [category]: entry } }
  )

  setImmediate(() => evaluateBadges(userId, c.env).catch(() => {}))

  return success(c, 'Anime added to list', entry, 201)
})

// ── PUT /api/list/:userId/:animeId (update entry) ────────────────────────────
router.put('/:userId/:animeId', authenticateToken, authorizeUser, async (c) => {
  const { db, lists } = setup(c)
  const userId = c.get('userId')
  const animeId = c.req.param('animeId')
  const updates = await c.req.json()

  const list = await lists.findByUserId(userId)
  if (!list) return error(c, 'List not found', 404)

  const categories = ['watching', 'completed', 'planned', 'dropped']
  let found = false
  for (const cat of categories) {
    const idx = list[cat]?.findIndex(a => a.animeId === animeId)
    if (idx !== undefined && idx >= 0) {
      updates.updatedAt = new Date().toISOString()
      for (const [key, value] of Object.entries(updates)) {
        const setKey = `${cat}.${idx}.${key}`
        await db.updateOne(
          'animerists',
          { userId: { $oid: userId } },
          { $set: { [setKey]: value } }
        )
      }
      found = true

      if (updates.status && updates.status !== cat) {
        const entry = list[cat][idx]
        const pullKey = cat
        await db.updateOne(
          'animerists',
          { userId: { $oid: userId } },
          { $pull: { [pullKey]: { animeId } } }
        )
        const updatedEntry = { ...entry, ...updates }
        await db.updateOne(
          'animerists',
          { userId: { $oid: userId } },
          { $push: { [updates.status]: updatedEntry } }
        )
      }

      break
    }
  }

  if (!found) return error(c, 'Anime not found in list', 404)

  setImmediate(async () => {
    try {
      const result = await evaluateBadges(userId, c.env)
      if (result.newBadges?.length > 0) {
        await broadcastBadges(c.env, userId, result.newBadges)
      }
    } catch {}
  })

  return success(c, 'Anime updated')
})

// ── DELETE /api/list/:userId/:animeId ────────────────────────────────────────
router.delete('/:userId/:animeId', authenticateToken, authorizeUser, async (c) => {
  const { db, lists } = setup(c)
  const userId = c.get('userId')
  const animeId = c.req.param('animeId')

  const list = await lists.findByUserId(userId)
  if (!list) return error(c, 'List not found', 404)

  const categories = ['watching', 'completed', 'planned', 'dropped', 'favorites']
  for (const cat of categories) {
    const arr = list[cat]
    if (!Array.isArray(arr)) continue
    const idx = arr.findIndex(a => a.animeId === animeId)
    if (idx >= 0) {
      arr.splice(idx, 1)
      await db.updateById('animerists', list._id, { $set: { [cat]: arr } })
  setImmediate(async () => {
    try {
      const result = await evaluateBadges(userId, c.env)
      if (result.newBadges?.length > 0) {
        await broadcastBadges(c.env, userId, result.newBadges)
      }
    } catch {}
  })
      return success(c, 'Anime removed from list')
    }
  }

  return error(c, 'Anime not found in list', 404)
})

// ── POST /api/list/favorite/:userId ──────────────────────────────────────────
router.post('/favorite/:userId', authenticateToken, authorizeUser, async (c) => {
  const { db, lists } = setup(c)
  const userId = c.get('userId')
  const { animeId } = await c.req.json()

  let list = await lists.findByUserId(userId)
  if (!list) {
    const { insertedId } = await lists.create({
      userId: { $oid: userId },
      watching: [],
      completed: [],
      planned: [],
      dropped: [],
      favorites: [],
    })
    list = await lists.findByUserId(userId)
  }

  const existing = list.favorites?.find(a => a.animeId === animeId)
  if (existing) {
    await db.updateOne(
      'animerists',
      { userId: { $oid: userId } },
      { $pull: { favorites: { animeId } } }
    )
    return success(c, 'Removed from favorites')
  }

  const allEntries = [...(list.watching || []), ...(list.completed || []), ...(list.planned || []), ...(list.dropped || [])]
  const entry = allEntries.find(a => a.animeId === animeId)
  if (!entry) return error(c, 'Anime not found in list', 404)

  const favEntry = {
    title: entry.title,
    animeId: entry.animeId,
    malId: entry.malId,
    image: entry.image,
    totalEpisodes: entry.totalEpisodes,
    addedDate: new Date().toISOString(),
    userRating: entry.userRating,
    genres: entry.genres || [],
  }

  await db.updateOne(
    'animerists',
    { userId: { $oid: userId } },
    { $push: { favorites: favEntry } }
  )

  return success(c, 'Added to favorites')
})

// ── POST /api/list/:userId/backfill-genres ───────────────────────────────────
router.post('/:userId/backfill-genres', authenticateToken, authorizeUser, async (c) => {
  const { db, lists } = setup(c)
  const userId = c.get('userId')

  const list = await lists.findByUserId(userId)
  if (!list) return error(c, 'List not found', 404)

  const categories = ['watching', 'completed', 'planned', 'dropped']
  let updated = 0

  for (const cat of categories) {
    const entries = list[cat] || []
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (!entry.genres || entry.genres.length === 0) {
        try {
          const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `query ($id: Int) { Media(id: $id) { genres } }`,
              variables: { id: parseInt(entry.animeId) },
            }),
          })
          const data = await res.json()
          const genres = data?.data?.Media?.genres || []
          if (genres.length > 0) {
            await db.updateOne(
              'animerists',
              { userId: { $oid: userId } },
              { $set: { [`${cat}.${i}.genres`]: genres } }
            )
            updated++
          }
        } catch (e) {
          console.error(`[Backfill] Failed for ${entry.animeId}:`, e.message)
        }
      }
    }
  }

  return success(c, 'Genres backfilled', { updated })
})

const importProgressStore = new Map()

async function sendProgress(env, userId, current, total, message, extra = {}) {
  if (current > 0) {
    const prev = importProgressStore.get(userId)
    if (prev && prev.current > current) return
  }
  importProgressStore.set(userId, { current, total, message, ...extra, ts: Date.now() })
  try {
    const doId = env.USER_CONNECTIONS.idFromName(userId)
    const stub = env.USER_CONNECTIONS.get(doId)
    await stub.broadcast(userId, { type: 'progress', current, total, message, ...extra })
  } catch (e) {
    console.warn(`[MAL Import] WebSocket broadcast error:`, e.message)
  }
}

async function broadcastBadges(env, userId, newBadges) {
  if (!newBadges || newBadges.length === 0) return
  try {
    const doId = env.USER_CONNECTIONS.idFromName(userId)
    const stub = env.USER_CONNECTIONS.get(doId)
    await stub.broadcast(userId, {
      type: 'BADGES_EARNED',
      newBadges: newBadges.map(b => ({
        id: b.id,
        title: b.title,
        description: b.description,
        rarity: b.rarity,
      })),
    })
  } catch (e) {
    console.warn(`[Badges] WebSocket broadcast error:`, e.message)
  }
}

function getCategoryFromMalStatus(malStatus) {
  if (!malStatus) return 'planned'
  const s = String(malStatus).trim().toLowerCase()
  if (s === '1' || s.includes('watching') || s.includes('currently')) return 'watching'
  if (s === '2' || s.includes('completed') || s.includes('complete')) return 'completed'
  if (s === '4' || s.includes('dropped')) return 'dropped'
  return 'planned'
}

function safeDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const t = dateStr.trim()
  if (!t) return null
  const d = new Date(t)
  return isNaN(d.getTime()) ? null : d
}

function buildEntry(malAnime, meta, malIdStr, malTitle, totalEpisodes, episodesWatched, userRating, category, processed) {
  const entry = {
    title: meta.title || malTitle,
    animeId: malIdStr || `mal_${Date.now()}_${processed}`,
    malId: malIdStr,
    image: meta.image,
    totalEpisodes, episodes: totalEpisodes, episodesWatched,
    status: category, genres: meta.genres,
    userRating: userRating > 0 ? Math.round(userRating / 2) : 0,
    addedDate: (safeDate(malAnime.my_start_date) || safeDate(malAnime.my_finish_date) || new Date()).toISOString(),
  }
  if (category === 'completed') {
    const fd = safeDate(malAnime.my_finish_date)
    if (fd) entry.finishDate = fd.toISOString()
    entry.episodesWatched = totalEpisodes
  }
  return entry
}

// ── POST /api/list/import/mal ────────────────────────────────────────────────
router.post('/import/mal', authenticateToken, async (c) => {
  try {
    const body = await c.req.parseBody()
    const malFile = body['malFile']
    const userId = c.get('userId')
    const clearExisting = body['clearExisting'] === 'true'

    if (!userId) return error(c, 'Valid User ID is required', 400)
    if (!malFile || !malFile.size) return error(c, 'No file uploaded', 400)
    if (malFile.size > 50 * 1024 * 1024) return error(c, 'File too large (max 50MB)', 400)

    // Parse XML
    let malData
    try {
      const xmlContent = typeof malFile === 'string' ? malFile : await malFile.text()
      const { Parser } = await import('xml2js')
      const parser = new Parser({ explicitArray: false, mergeAttrs: true, trim: true, normalize: true })
      malData = await parser.parseStringPromise(xmlContent)
    } catch {
      return error(c, 'Invalid XML file', 400)
    }

    if (!malData?.myanimelist) return error(c, 'Invalid MAL XML format', 400)

    const rawAnimeList = malData.myanimelist.anime
    if (!rawAnimeList) return error(c, 'No anime found in XML file', 400)

    const malAnimeList = Array.isArray(rawAnimeList) ? rawAnimeList : [rawAnimeList]
    if (malAnimeList.length === 0) return success(c, 'No anime found in the file')

    // Respond immediately — background processing
    const { db, lists } = setup(c)
    const env = c.env
    const ctx = c.executionCtx

    ctx.waitUntil((async () => {
      try {
        let list = await lists.findByUserId(userId)
        if (!list) {
          const { insertedId } = await lists.create({
            userId: { $oid: userId },
            watching: [], completed: [], planned: [], dropped: [], favorites: [],
          })
          list = await lists.findByUserId(userId)
        }

        if (clearExisting) {
          await db.updateOne('animerists', { userId: { $oid: userId } }, {
            $set: { watching: [], completed: [], planned: [], dropped: [] }
          })
        }

        await sendProgress(env, userId, 0, malAnimeList.length, 'Analyzing MyAnimeList data...')

        const malIds = malAnimeList
          .map(a => { const id = parseInt(a.series_animedb_id || a.series_anime_db_id || a.series_animedbid); return isNaN(id) ? null : id })
          .filter(Boolean)

        const metadataMap = new Map()
        const BATCH = 50
        for (let i = 0; i < malIds.length; i += BATCH) {
          const batchIds = malIds.slice(i, i + BATCH)
          await sendProgress(env, userId, 0, malAnimeList.length, `Fetching cover images: batch ${Math.floor(i / BATCH) + 1}...`)
          await new Promise(r => setTimeout(r, 150))

          try {
            const res = await fetch('https://graphql.anilist.co', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `query ($idMals: [Int]) { Page(page: 1, perPage: 50) { media(idMal_in: $idMals, type: ANIME) { idMal title { english romaji native } coverImage { extraLarge large medium } genres } } }`,
                variables: { idMals: batchIds },
              }),
              signal: AbortSignal.timeout(12000),
            })
            const data = await res.json()
            const mediaList = data?.data?.Page?.media || []
            for (const media of mediaList) {
              if (media?.idMal) {
                metadataMap.set(media.idMal.toString(), {
                  title: media.title?.english || media.title?.romaji || media.title?.native,
                  image: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium,
                  genres: media.genres || [],
                })
              }
            }
          } catch (err) {
            console.error(`AniList batch failed at ${i}:`, err.message)
            if (err.message?.includes('429')) {
              await new Promise(r => setTimeout(r, 6000))
              i -= BATCH
            }
          }
        }

        let lastJikan = 0
        async function fetchFallback(malId, fallbackTitle) {
          if (!malId) return { image: null, genres: [], title: null }
          const now = Date.now()
          if (now - lastJikan < 1500) await new Promise(r => setTimeout(r, 1500 - (now - lastJikan)))
          lastJikan = Date.now()
          try {
            const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`, {
              headers: { 'User-Agent': 'OtakuShelf/3.0' },
              signal: AbortSignal.timeout(8000),
            })
            const data = await res.json()
            const jikan = data?.data
            const img = jikan?.images?.jpg?.large_image_url || jikan?.images?.jpg?.image_url
            const genres = jikan?.genres?.map(g => g.name) || []
            const jikanTitle = jikan?.title_english || jikan?.title || null
            if (img) return { image: img, genres, title: jikanTitle }
          } catch {}
          return { image: `https://placehold.co/300x400/667eea/ffffff?text=${encodeURIComponent(fallbackTitle || 'Anime')}`, genres: [], title: null }
        }

        await sendProgress(env, userId, 0, malAnimeList.length, 'Saving anime entries to your list...')

        let processed = 0, imported = 0, skipped = 0, lastProgress = 0
        const counts = { watching: 0, completed: 0, planned: 0, dropped: 0 }
        const importedIds = new Set()
        const pending = { watching: [], completed: [], planned: [], dropped: [] }
        const modifiedCategories = new Set()

        for (const malAnime of malAnimeList) {
          processed++
          try {
            const malId = malAnime.series_animedb_id || malAnime.series_anime_db_id || malAnime.series_animedbid
            const malTitle = malAnime.series_title || malAnime.series_title_eng || 'Unknown Title'
            const malStatus = malAnime.my_status || malAnime.my_status_string || malAnime.my_status_code
            const episodesWatched = parseInt(malAnime.my_watched_episodes || 0) || 0
            const totalEpisodes = parseInt(malAnime.series_episodes || 24) || 24
            const userRating = parseInt(malAnime.my_score || 0) || 0
            const category = getCategoryFromMalStatus(malStatus)

            const malIdStr = malId ? malId.toString() : ''

            if (malIdStr && importedIds.has(malIdStr)) { skipped++; continue }
            if (malIdStr) importedIds.add(malIdStr)

            if (processed - lastProgress >= 100 || processed === malAnimeList.length) {
              lastProgress = processed
              await sendProgress(env, userId, processed, malAnimeList.length, `Importing: ${malTitle.substring(0, 30)}...`)
            }

            if (!clearExisting && malIdStr) {
              const allCategories = ['watching','completed','planned','dropped']
              const existingEntry = allCategories.reduce((found, cat) => {
                return found || (list?.[cat]?.find(a => a.malId === malIdStr) && cat)
              }, null)
              if (existingEntry) {
                if (existingEntry === category) {
                  const existingData = list[category].find(a => a.malId === malIdStr)
                  if (existingData) {
                    existingData.episodesWatched = category === 'completed' ? totalEpisodes : episodesWatched
                    if (userRating > 0) existingData.userRating = Math.round(userRating / 2)
                    const sd = safeDate(malAnime.my_start_date)
                    if (sd) existingData.addedDate = sd.toISOString()
                    if (category === 'completed') {
                      const fd = safeDate(malAnime.my_finish_date)
                      if (fd) existingData.finishDate = fd.toISOString()
                    }
                  }
                  modifiedCategories.add(category)
                } else {
                  list[existingEntry] = list[existingEntry].filter(a => a.malId !== malIdStr)
                  let meta = metadataMap.get(malIdStr)
                  if (!meta) meta = await fetchFallback(malId, malTitle)
                  const movedEntry = buildEntry(malAnime, meta, malIdStr, malTitle, totalEpisodes, episodesWatched, userRating, category, processed)
                  pending[category].push(movedEntry)
                  modifiedCategories.add(existingEntry)
                }
                counts[category]++
                imported++
                continue
              }
            }

            let meta = metadataMap.get(malIdStr)
            if (!meta) meta = await fetchFallback(malId, malTitle)

            pending[category].push(
              buildEntry(malAnime, meta, malIdStr, malTitle, totalEpisodes, episodesWatched, userRating, category, processed)
            )
            counts[category]++
            imported++
          } catch (e) {
            console.error(`MAL entry failed:`, e.message)
          }
        }

        // Batch-write: read fresh, merge in-memory edits + pending, write once per category
        const finalList = await lists.findByUserId(userId)
        for (const cat of ['watching', 'completed', 'planned', 'dropped']) {
          if (modifiedCategories.has(cat)) finalList[cat] = list[cat]
          if (pending[cat].length > 0) finalList[cat].push(...pending[cat])
        }
        await db.updateOne(
          'animerists',
          { userId: { $oid: userId } },
          { $set: { watching: finalList.watching, completed: finalList.completed, planned: finalList.planned, dropped: finalList.dropped } }
        )

        await sendProgress(env, userId, malAnimeList.length, malAnimeList.length,
          `Imported ${imported} anime (W:${counts.watching} C:${counts.completed} P:${counts.planned} D:${counts.dropped})${skipped ? `, skipped ${skipped} duplicates` : ''}`,
          { completed: true }
        )

        try {
          const { evaluateBadges } = await import('../services/badgeEngine.js')
          await evaluateBadges(userId, env)
        } catch {}
      } catch (bgError) {
        console.error('Background MAL import error:', bgError)
        await sendProgress(env, userId, 0, 0, `Import failed: ${bgError.message}`, { error: true })
      }
    })())

    return c.json({
      status: 'accepted',
      message: `Import started for ${malAnimeList.length} anime. Watch for progress updates.`,
      total: malAnimeList.length,
    }, 202)
  } catch (err) {
    console.error('MAL import error:', err.message)
    return error(c, 'Import failed', 500)
  }
})

// ── GET /api/list/import/status/:userId ───────────────────────────────────────
router.get('/import/status/:userId', authenticateToken, authorizeUser, async (c) => {
  const userId = c.get('userId')
  const p = importProgressStore.get(userId)
  if (!p || Date.now() - p.ts > 600000) {
    importProgressStore.delete(userId)
    return success(c, 'No active import', null)
  }
  return success(c, 'Import status', p)
})

export default router
