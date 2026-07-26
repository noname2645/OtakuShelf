import { Hono } from 'hono'
import { createDb } from '../db/client.js'
import { createUserDb } from '../db/user.js'
import { createAnimeListDb } from '../db/animeList.js'
import { success, error } from '../utils/response.js'

const router = new Hono()

const ANILIST_URL = 'https://graphql.anilist.co'
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'

async function fetchAniList(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'OtakuShelf/2.0 (https://otakushelf.pages.dev)',
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`AniList error ${res.status}`)
  return (await res.json()).data
}

async function fetchWithRetry(url, options, retries = 2) {
  for (let i = retries; i >= 0; i--) {
    try {
      const res = await fetch(url, options)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (i === 0) throw err
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}

async function fetchAnimeContext(search) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id title { romaji english } description genres averageScore popularity episodes status format
        coverImage { extraLarge large medium } bannerImage
        characters(sort: RELEVANCE, perPage: 5) { nodes { name { full } description } }
        recommendations(perPage: 5) {
          nodes { mediaRecommendation { id title { english romaji } coverImage { large } description genres averageScore format status episodes } }
        }
      }
    }`
  try {
    const data = await fetchAniList(query, { search })
    return data?.Media || null
  } catch {
    return null
  }
}

async function getUserContext(userId, users, lists) {
  if (!userId) return null
  try {
    const user = await users.findById(userId)
    if (!user) return null
    const list = await lists.findByUserId(userId)

    return {
      profile: {
        name: user.name || 'Otaku',
        bio: user.profile?.bio || '',
        favoriteGenres: user.profile?.favoriteGenres?.map(g => g.name) || [],
        stats: user.profile?.stats || {},
      },
      listInfo: {
        watching: list?.watching?.slice(0, 5).map(a => a.title) || [],
        completed: list?.completed?.slice(0, 5).map(a => a.title) || [],
        planned: list?.planned?.slice(0, 5).map(a => a.title) || [],
        favorites: list?.completed?.filter(a => a.userRating >= 4).slice(0, 5).map(a => a.title) || [],
      },
    }
  } catch {
    return null
  }
}

function buildSystemPrompt(userData, animeData) {
  let prompt = `You are OtakuAI — a chill anime buddy, not a recommendation bot.
You vibe with the user like a friend who happens to know everything about anime.

CORE RULES:
- Be casual, fun, and conversational. Match the user's energy.
- NEVER open with a recommendation unless the user explicitly asks for one.
- NEVER mention or reference the user's watch history unless they bring it up first.
- If recommending anime, always bold the title like **Fullmetal Alchemist**.
- If they mention a specific show, use the AniList data as your source of truth.
- Be goofy and playful when the vibe calls for it.
- Keep responses concise unless a detailed answer is clearly needed.
- DO NOT end every message with a question. Only ask one naturally when it fits the flow.
- Be respectful to the user ALWAYS no matter what the user says

`

  if (userData) {
    const { profile, listInfo } = userData
    prompt += `[PRIVATE BACKGROUND CONTEXT — Do NOT mention this unless the user asks]
User's name: ${profile.name}
Favorite genres: ${profile.favoriteGenres.join(', ') || 'unknown'}
Anime watched: ${profile.stats.animeWatched || 0}
Currently watching: ${listInfo.watching.join(', ') || 'nothing'}
Recently completed: ${listInfo.completed.join(', ') || 'nothing'}
Favorites (highly rated): ${listInfo.favorites.join(', ') || 'none'}

Only use this context if the user asks for personalized recs or references their list.
`
  }

  if (animeData) {
    prompt += `
[ANIME CONTEXT — User mentioned this show]
Title: ${animeData.title.english || animeData.title.romaji}
Genres: ${animeData.genres?.join(', ')}
Score: ${animeData.averageScore}/100
Synopsis: ${animeData.description ? animeData.description.replace(/<[^>]*>/g, '').slice(0, 400) : 'N/A'}
Related picks: ${animeData.recommendations?.nodes?.map(r => r.mediaRecommendation.title.english || r.mediaRecommendation.title.romaji).join(', ')}
`
  }

  return prompt
}

async function askMistral(systemInstruction, history, userMsg, env) {
  const apiKey = env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is missing')

  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.slice(-10),
    { role: 'user', content: userMsg },
  ]

  const data = await fetchWithRetry(MISTRAL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages,
      temperature: 0.75,
      max_tokens: 800,
    }),
  })

  return data.choices[0].message.content
}

async function getRecommendations(text) {
  const pattern = /\*\*([^*]+)\*\*/g
  const matches = Array.from(text.matchAll(pattern)).map(m => m[1].trim())
  const unique = [...new Set(matches)].slice(0, 4)

  const recs = []
  for (const title of unique) {
    const data = await fetchAnimeContext(title)
    if (data) {
      recs.push({
        id: data.id,
        title: data.title,
        coverImage: data.coverImage,
        description: data.description,
        genres: data.genres,
        averageScore: data.averageScore,
        format: data.format,
        status: data.status,
        episodes: data.episodes,
      })
    }
  }
  return recs
}

const COMMON_TITLES = [
  'naruto', 'one piece', 'attack on titan', 'demon slayer',
  'jujutsu kaisen', 'my hero academia', 'death note', 'fullmetal alchemist',
]

// ── POST /api/ai/chat ────────────────────────────────────────────────────────
router.post('/chat', async (c) => {
  try {
    const { message, history = [], userId } = await c.req.json()
    if (!message) return error(c, 'Message required', 400)

    const env = c.env
    const db = createDb(env)
    const users = createUserDb(db)
    const lists = createAnimeListDb(db)

    const userData = await getUserContext(userId, users, lists)
    const mention = COMMON_TITLES.find(t => message.toLowerCase().includes(t))
    const animeData = mention ? await fetchAnimeContext(mention) : null

    const systemPrompt = buildSystemPrompt(userData, animeData)
    const reply = await askMistral(systemPrompt, history, message, env)
    const anime = await getRecommendations(reply)

    return success(c, 'Success', {
      reply,
      anime,
      context: {
        mood: reply.length > 200 ? 'informative' : 'friendly',
        suggestions: ['What else do you suggest?', 'Add to my list', 'Tell me more'],
      },
    })
  } catch (err) {
    console.error('[AI Chat Error]:', err.message)
    return error(c, 'OtakuAI had a glitch! Try again later.', 500)
  }
})

// ── POST /api/ai/anime-chat ──────────────────────────────────────────────────
router.post('/anime-chat', async (c) => {
  try {
    const { query, anime } = await c.req.json()
    const animeData = await fetchAnimeContext(anime)
    const sysPrompt = buildSystemPrompt(null, animeData)
    const reply = await askMistral(sysPrompt, [], query, c.env)
    return success(c, 'Success', { answer: reply })
  } catch (err) {
    return error(c, 'Evaluation failed', 500)
  }
})

// ── GET /api/ai/health ───────────────────────────────────────────────────────
router.get('/health', (c) => success(c, 'OK', { model: 'Mistral Small' }))

export default router
