import { Hono } from 'hono'
import { createDb } from '../db/client.js'
import { createUserDb } from '../db/user.js'
import { createAnimeListDb } from '../db/animeList.js'
import { success, error } from '../utils/response.js'

const router = new Hono()

const ANILIST_URL = 'https://graphql.anilist.co'
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'

const MAX_CONTEXT_MESSAGES = 10

async function fetchAniList(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'AnimeRegistry/2.0 (https://animeregistry.pages.dev)',
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
      Media(search: $search, type: ANIME, isAdult: false) {
        id title { romaji english native } description genres averageScore popularity episodes status format
        coverImage { extraLarge large medium } bannerImage
        season seasonYear startDate { year month day } endDate { year month day }
        studios { nodes { name } }
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

async function fetchTrendingAnime() {
  const query = `
    query {
      Page(page: 1, perPage: 8) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          id title { romaji english } genres averageScore format status episodes
          coverImage { large } description
        }
      }
    }`
  try {
    const data = await fetchAniList(query)
    return data?.Page?.media || []
  } catch {
    return []
  }
}

async function fetchSeasonalAnime() {
  const now = new Date()
  const season = now.getMonth() < 3 ? 'WINTER' : now.getMonth() < 6 ? 'SPRING' : now.getMonth() < 9 ? 'SUMMER' : 'FALL'
  const year = now.getFullYear()
  const query = `
    query ($season: MediaSeason, $seasonYear: Int) {
      Page(page: 1, perPage: 8) {
        media(season: $season, seasonYear: $seasonYear, type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
          id title { romaji english } genres averageScore format status episodes
          coverImage { large } description
        }
      }
    }`
  try {
    const data = await fetchAniList(query, { season, seasonYear: year })
    return data?.Page?.media || []
  } catch {
    return []
  }
}

async function fetchAnimeByGenre(genre) {
  const query = `
    query ($genre: String) {
      Page(page: 1, perPage: 6) {
        media(genre: $genre, type: ANIME, isAdult: false, sort: SCORE_DESC) {
          id title { romaji english } genres averageScore format status episodes
          coverImage { large } description
        }
      }
    }`
  try {
    const data = await fetchAniList(query, { genre })
    return data?.Page?.media || []
  } catch {
    return []
  }
}

async function getUserContext(userId, users, lists) {
  if (!userId) return null
  try {
    const user = await users.findById(userId)
    if (!user) return null
    const list = await lists.findByUserId(userId)
    const profile = user.profile || {}
    const allAnime = [
      ...(list?.watching || []),
      ...(list?.completed || []),
      ...(list?.planned || []),
      ...(list?.dropped || []),
    ]

    const genreMap = {}
    allAnime.forEach(a => { if (Array.isArray(a.genres)) a.genres.forEach(g => { genreMap[g] = (genreMap[g] || 0) + 1 }) })
    const topGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }))

    const stats = {
      animeWatched: (list?.completed || []).length,
      currentlyWatching: (list?.watching || []).length,
      animePlanned: (list?.planned || []).length,
      animeDropped: (list?.dropped || []).length,
      totalEpisodes: allAnime.reduce((s, a) => s + (a.episodesWatched || 0), 0),
      daysWatched: parseFloat((allAnime.reduce((s, a) => s + (a.episodesWatched || 0), 0) * 24 / 60).toFixed(1)),
      meanScore: (() => {
        const rated = (list?.completed || []).filter(a => a.userRating)
        return rated.length ? (rated.reduce((s, a) => s + a.userRating, 0) / rated.length).toFixed(1) : 0
      })(),
      favorites: (list?.favorites || []).length,
    }

    const recentlyWatched = [...(list?.watching || []), ...(list?.completed || [])]
      .sort((a, b) => new Date(b.updatedAt || b.addedDate) - new Date(a.updatedAt || a.addedDate))
      .slice(0, 6)
      .map(a => a.title)

    const favorites = (list?.favorites || []).slice(0, 6).map(f => f.title)

    return {
      profile: {
        name: user.name || profile.username || 'Otaku',
        email: user.email,
        bio: profile.bio || '',
        favoriteGenres: topGenres,
        username: user.username || profile.username || '',
        joinDate: user.createdAt || '',
      },
      stats,
      listInfo: {
        watching: list?.watching?.slice(0, 8).map(a => a.title) || [],
        completed: list?.completed?.slice(0, 8).map(a => a.title) || [],
        planned: list?.planned?.slice(0, 8).map(a => a.title) || [],
        dropped: list?.dropped?.slice(0, 8).map(a => a.title) || [],
        recentlyWatched,
        favorites,
      },
      memory: profile.aiMemory || { facts: [], preferences: {} },
    }
  } catch {
    return null
  }
}

async function extractAndSaveMemory(userId, users, message, reply) {
  if (!userId) return
  try {
    const user = await users.findById(userId)
    if (!user) return

    const memory = (user.profile?.aiMemory || { facts: [], preferences: {} })
    const lower = message.toLowerCase()
    const facts = []

    // Genre preferences (like/dislike)
    const genresList = 'shonen|seinen|josei|shoujo|slice of life|horror|romance|comedy|action|fantasy|sci-fi|sports|psychological|thriller|isekai|mecha|magic|adventure|drama|mystery|supernatural|military|music|parody'
    const genreSentiment = message.match(new RegExp(`(like|love|enjoy|prefer|hate|dislike|can'?t stand|not into|not a fan of)\\s+(?:${genresList})`, 'i'))
    if (genreSentiment) {
      const pref = /like|love|enjoy|prefer/i.test(genreSentiment[1]) ? 'likes' : 'dislikes'
      const genre = message.match(new RegExp(genresList, 'i'))
      if (genre) facts.push(`User ${pref} ${genre[0].toLowerCase()}`)
    }

    // Audio preference
    if (/prefers?\s+(subbed|dubbed|sub|dub)/i.test(message)) {
      memory.preferences.preferredAudio = /subbed|sub/i.test(message) ? 'subbed' : 'dubbed'
      facts.push(`User prefers ${memory.preferences.preferredAudio}`)
    }

    // Watched / finished specific shows
    const finishedMatch = message.match(/(?:finished|completed|just watched|binge|caught up on)\s+(.+?)(?:\s+(?:anime|show|series)|$)/i)
    if (finishedMatch && finishedMatch[1].length > 2 && finishedMatch[1].length < 60) {
      facts.push(`User finished: ${finishedMatch[1].trim()}`)
    }

    // Currently watching
    const watchingMatch = message.match(/(?:watching|currently watching|starting|started)\s+(.+?)(?:\s+(?:anime|show|series)|$)/i)
    if (watchingMatch && watchingMatch[1].length > 2 && watchingMatch[1].length < 60) {
      facts.push(`User is watching: ${watchingMatch[1].trim()}`)
    }

    // Favorite show
    const favMatch = message.match(/favorite\s+(?:anime|show|series|character)\s+(?:is\s+)?(.+?)(?:\?|$|\.|\s+and)/i)
    if (favMatch && favMatch[1].length > 2 && favMatch[1].length < 60) {
      if (/character/i.test(message)) {
        facts.push(`Favorite character: ${favMatch[1].trim()}`)
      } else {
        facts.push(`Favorite: ${favMatch[1].trim()}`)
      }
    }

    // Studio preference
    const studioMatch = message.match(/(?:like|love|enjoy|prefer|favorite)\s+(.+?)(?:'s\s+)?(?:studio|works|animation|anime)/i)
    if (studioMatch && studioMatch[1].length > 2) {
      facts.push(`User likes studio: ${studioMatch[1].trim()}`)
    }

    // Dropped shows
    const droppedMatch = message.match(/dropped\s+(.+?)(?:\s+(?:anime|show|series)|$)/i)
    if (droppedMatch && droppedMatch[1].length > 2 && droppedMatch[1].length < 60) {
      facts.push(`User dropped: ${droppedMatch[1].trim()}`)
    }

    // Count of anime watched
    const countMatch = message.match(/(\d+)\s*(?:\+|plus\s+)?(?:anime|shows|series)\s+(?:watched|seen|completed)/i)
    if (countMatch) facts.push(`Has watched ~${countMatch[1]} anime`)

    // Preferred watching style
    if (/(?:i|i'?d)\s+(?:prefer|rather|like to|like)\s+(?:watch|binge)/i.test(message)) {
      if (/(?:weekly|week by week|airing)/i.test(message)) facts.push('Prefers weekly watching')
      if (/(?:binge|all at once|marathon|completed)/i.test(message)) facts.push('Prefers binge watching')
    }

    // Theme / mood preference
    const moodMatch = message.match(/(?:i'?m\s+(?:in the mood for|looking for|feeling like)|want something)\s+(.+?)(?:\?|$|\.)/i)
    if (moodMatch && moodMatch[1].length > 2 && moodMatch[1].length < 40) {
      facts.push(`Expressed interest in: ${moodMatch[1].trim().toLowerCase()}`)
    }

    // Anime the user explicitly mentioned they love (beyond genre)
    const loveMatch = message.match(/i really (?:like|love|enjoyed|enjoy)\s+(.+?)(?:\s+(?:anime|show|series)|$)/i)
    if (loveMatch && loveMatch[1].length > 2 && loveMatch[1].length < 60 && !loveMatch[1].match(new RegExp(genresList, 'i'))) {
      facts.push(`Loves: ${loveMatch[1].trim()}`)
    }

    const newFacts = [...(memory.facts || []), ...facts].slice(-25)
    if (facts.length > 0 || Object.keys(memory.preferences).length > 0) {
      await users.update(userId, { 'profile.aiMemory': { ...memory, facts: newFacts, lastUpdated: new Date().toISOString() } })
    }
  } catch {
    // silently fail memory extraction
  }
}

function buildSystemPrompt(userData, animeData, trendingAnime, seasonalAnime) {
  let prompt = `You are OtakuAI — a warm, knowledgeable anime companion. You talk like a real anime fan who's excited to share their passion, not like a robot.

PERSONALITY:
- Talk naturally — like a friend who genuinely loves anime. Use casual language, be warm, be real.
- Match the user's vibe. If they're playful, be playful. If they're asking deep questions, get detailed.
- Keep responses short and punchy by default. Only go long when the user clearly wants depth.
- Never start with recommendations unprompted. Let the user lead the conversation toward their interests.
- Only bring up the user's watch history, stats, or list when they ask for personalized help or mention their list.
- When you DO recommend anime, bold the title like **Fullmetal Alchemist: Brotherhood** so the frontend can surface cards.
- If the user mentions a show, use the provided AniList data as facts — don't make things up about it.
- Don't force questions at the end. A natural conversation doesn't need a question every turn.
- Be inclusive — all tastes are valid. No elitism.
- STRICT RULE: Never recommend, discuss, or mention hentai, ecchi, or adult-only (R18+) anime. If the user asks about adult content, politely decline and redirect to general anime discussion.

KNOWLEDGE YOU CAN DRAW ON:
- Studios: MAPPA, Ufotable, A-1 Pictures, Bones, Madhouse, Ghibli, CloverWorks, Kyoto Animation, Trigger, etc.
- Directors: Miyazaki, Satoshi Kon, Makoto Shinkai, Hideaki Anno, Shinichiro Watanabe, Naoko Yamada, etc.
- Genre sense: Shonen (action/adventure), Seinen (mature), Shojo (romance/drama), Slice of Life (daily life), Isekai (other world), Mecha (robots), Psychological (mind games), and everything in between
- Anime seasons: Winter (Jan-Mar), Spring (Apr-Jun), Summer (Jul-Sep), Fall (Oct-Dec)
- Community know-how: know the classics (90+ MAL), the hidden gems, the overrated debates, the cult followings
- Terminology: OP/ED, VA/seiyuu, sub vs dub, filler vs canon, OST, source material (manga/LN/VN), cour, etc.

`

  if (userData) {
    const { profile, stats, listInfo, memory } = userData
    prompt += `USER CONTEXT (reference naturally when relevant):
Name: ${profile.name}
`

    if (stats.animeWatched > 0 || stats.totalEpisodes > 0) {
      prompt += `Stats: ${stats.animeWatched} completed | ${stats.totalEpisodes} eps watched | ${stats.daysWatched} days | ${stats.meanScore}/10 avg rating
`
    }

    if (listInfo?.watching?.length > 0) {
      prompt += `Currently watching: ${listInfo.watching.join(', ')}
`
    }
    if (listInfo?.recentlyWatched?.length > 0) {
      prompt += `Recently finished: ${listInfo.recentlyWatched.join(', ')}
`
    }
    if (listInfo?.favorites?.length > 0) {
      prompt += `Favorites: ${listInfo.favorites.join(', ')}
`
    }
    if (listInfo?.planned?.length > 0) {
      prompt += `Plan to watch: ${listInfo.planned.join(', ')}
`
    }
    if (profile.favoriteGenres?.length > 0) {
      prompt += `Top genres: ${profile.favoriteGenres.map(g => g.name).join(', ')}
`
    }

    if (memory?.facts?.length > 0) {
      prompt += `\nThings you remember about this user: ${memory.facts.slice(-10).join(' | ')}
`
    }
    if (memory?.preferences?.preferredAudio) {
      prompt += `Audio preference: ${memory.preferences.preferredAudio}
`
    }

    prompt += `\nIMPORTANT: When recommending anime, check if the user has already watched or is watching something. Don't suggest what's already in their list unless they ask about it specifically.
`
  }

  if (animeData) {
    prompt += `
ANIME THEY'RE ASKING ABOUT: "${animeData.title?.english || animeData.title?.romaji || 'Unknown'}"
Genres: ${animeData.genres?.join(', ') || 'N/A'} | Score: ${animeData.averageScore}/100 | Format: ${animeData.format || 'N/A'} | Status: ${animeData.status || 'N/A'} | Episodes: ${animeData.episodes || 'N/A'}
Studio: ${animeData.studios?.nodes?.map(s => s.name).join(', ') || 'N/A'}
Synopsis: ${animeData.description ? animeData.description.replace(/<[^>]*>/g, '').slice(0, 400) : 'N/A'}
Similar titles: ${animeData.recommendations?.nodes?.slice(0, 3).map(r => r.mediaRecommendation.title.english || r.mediaRecommendation.title.romaji).join(', ') || 'None provided'}
`
  }

  if (trendingAnime?.length > 0 || seasonalAnime?.length > 0) {
    prompt += `
TRENDING & SEASONAL (reference when relevant):
`
    if (trendingAnime?.length > 0) {
      prompt += `Trending: ${trendingAnime.map(a => `${a.title?.english || a.title?.romaji}`).join(', ')}
`
    }
    if (seasonalAnime?.length > 0) {
      prompt += `This season: ${seasonalAnime.map(a => `${a.title?.english || a.title?.romaji}`).join(', ')}
`
    }
  }

  prompt += `
Remember: concise by default. Bold anime titles with ** for card support. Be natural, be human.`
  return prompt
}

async function askMistral(systemInstruction, history, userMsg, env) {
  const apiKey = env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is missing')

  const messages = [
    { role: 'system', content: systemInstruction },
    ...history.slice(-MAX_CONTEXT_MESSAGES),
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
      max_tokens: 1200,
      top_p: 0.9,
    }),
  })

  return data.choices[0].message.content
}

const HENTAI_KEYWORDS = ['hentai', '18+', 'nsfw', 'r18', 'r-18', 'smut', 'porn', 'ero']

function isAdultByGenres(genres) {
  return Array.isArray(genres) && genres.some(g => HENTAI_KEYWORDS.includes(g.toLowerCase()))
}

async function getRecommendations(text) {
  const pattern = /\*\*([^*]+)\*\*/g
  const matches = Array.from(text.matchAll(pattern)).map(m => m[1].trim())
  const unique = [...new Set(matches)].slice(0, 4)

  const recs = []
  for (const title of unique) {
    if (HENTAI_KEYWORDS.some(k => title.toLowerCase().includes(k))) continue
    const data = await fetchAnimeContext(title)
    if (data && !isAdultByGenres(data.genres)) {
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
        startDate: data.startDate,
        endDate: data.endDate,
        seasonYear: data.seasonYear,
      })
    }
  }
  return recs
}

const COMMON_TITLES = [
  'naruto', 'one piece', 'attack on titan', 'demon slayer',
  'jujutsu kaisen', 'my hero academia', 'death note', 'fullmetal alchemist',
  'spy x family', 'chainsaw man', 'bleach', 'dragon ball',
  'tokyo ghoul', 'fairy tail', 'mob psycho 100',
  'vinland saga', 'haikyuu', 'slam dunk', 'cowboy bebop',
]

// ── POST /api/ai/chat ────────────────────────────────────────────────────────
router.post('/chat', async (c) => {
  try {
    const body = await c.req.json()
    const { message, history = [], userId } = body
    if (!message) return error(c, 'Message required', 400)

    const env = c.env
    const db = createDb(env)
    const users = createUserDb(db)
    const lists = createAnimeListDb(db)

    const userData = await getUserContext(userId, users, lists)

    const mention = COMMON_TITLES.find(t => message.toLowerCase().includes(t))
    const animeData = mention ? await fetchAnimeContext(mention) : null

    const isAskingRecommendations = /(?:recommend|suggest|what should i watch|what to watch|anything good|show me|looking for|give me|need something)/i.test(message) &&
                                     !mention
    const isAskingAboutSpecific = /(?:what do you think|tell me about|how is|thoughts on|review|opinion on)/i.test(message) && !!mention

    let genreRecs = []
    if (isAskingRecommendations || /(?:genre|type|kind|something)\s+(?:of|like|in|from)\s+/i.test(message)) {
      const genreMatch = message.match(/(?:genre|type|kind|something|recommend|suggest|looking for)\s+(?:of|like|in|from|some\s+)?(.+?)(?:\s+anime|\?|$|\.)/i)
      if (genreMatch) {
        const possibleGenre = genreMatch[1].trim()
        if (possibleGenre.length > 2 && possibleGenre.length < 25) {
          genreRecs = await fetchAnimeByGenre(possibleGenre)
        }
      }
    }

    // Filter adult content from genre recs
    genreRecs = genreRecs.filter(a => !isAdultByGenres(a.genres))

    // Filter genre recs against user's existing list
    if (genreRecs.length > 0 && userData?.listInfo) {
      const seenTitles = new Set([
        ...(userData.listInfo.watching || []),
        ...(userData.listInfo.completed || []),
        ...(userData.listInfo.planned || []),
        ...(userData.listInfo.dropped || []),
      ].map(t => t.toLowerCase()))
      genreRecs = genreRecs.filter(a => {
        const t = (a.title?.english || a.title?.romaji || '').toLowerCase()
        return !seenTitles.has(t)
      })
    }

    const [trendingAnime, seasonalAnime] = isAskingRecommendations || !animeData
      ? await Promise.all([fetchTrendingAnime(), fetchSeasonalAnime()])
      : [[], []]

    const systemPrompt = buildSystemPrompt(userData, animeData, trendingAnime, seasonalAnime)
    const reply = await askMistral(systemPrompt, history, message, env)

    if (userId && userData) {
      extractAndSaveMemory(userId, users, message, reply)
    }

    const anime = (await getRecommendations(reply)).filter(a => !isAdultByGenres(a.genres))

    // Merge genre recs (avoiding duplicates, filter adult)
    if (genreRecs.length > 0) {
      const existingIds = new Set(anime.map(a => a.id))
      genreRecs.filter(g => !isAdultByGenres(g.genres)).forEach(g => {
        if (!existingIds.has(g.id)) anime.push(g)
      })
    }

    // Dynamic suggestions based on conversation
    const wordCount = reply.split(/\s+/).length
    const isRecommendationReply = anime.length > 0 || /(?:recommend|suggest|try|check out|you might like|you'd love)/i.test(reply)
    const suggestions = isRecommendationReply
      ? ['Add to my list', 'Tell me more about one', 'Any hidden gems?']
      : isAskingAboutSpecific
        ? ['Compare to similar shows', 'Should I watch it?', 'What genre is it?']
        : ['Recommend something', 'Tell me about an anime', 'What are you watching?']

    return success(c, 'Success', {
      reply,
      anime: anime.slice(0, 6),
      context: {
        mood: wordCount > 50 ? 'informative' : 'friendly',
        suggestions,
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
    const animeData = anime ? await fetchAnimeContext(anime) : null
    const sysPrompt = buildSystemPrompt(null, animeData, [], [])
    const reply = await askMistral(sysPrompt, [], query, c.env)
    return success(c, 'Success', { answer: reply })
  } catch (err) {
    return error(c, 'Evaluation failed', 500)
  }
})

// ── GET /api/ai/health ───────────────────────────────────────────────────────
router.get('/health', (c) => success(c, 'OK', { model: 'Mistral Small' }))

export default router
