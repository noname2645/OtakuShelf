import express from "express";
import fetch from "node-fetch";
import { success, error } from './utils/responseHandler.js';
import User from "./models/User.js";
import AnimeList from "./models/AnimeList.js";

const router = express.Router();

/* =========================
   1. Helper: Robust Fetch
   ========================= */
async function fetchWithRetry(url, options, retries = 2) {
    try {
        const res = await fetch(url, { ...options, timeout: 8000 });
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`HTTP ${res.status}: ${errBody}`);
        }
        return await res.json();
    } catch (err) {
        if (retries > 0) {
            console.log(`Retrying fetch to ${url}... (${retries} left)`);
            await new Promise(r => setTimeout(r, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw err;
    }
}

/* =========================
   2. AniList GraphQL Fetch
   ========================= */
async function fetchAnimeContext(search) {
    const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        title { romaji english }
        description
        genres
        averageScore
        popularity
        episodes
        status
        format
        coverImage { extraLarge large medium }
        bannerImage
        characters(sort: RELEVANCE, perPage: 5) {
          nodes { name { full } description }
        }
        recommendations(perPage: 5) {
          nodes {
            mediaRecommendation {
              id
              title { english romaji }
              coverImage { large }
              description
              genres
              averageScore
              format
              status
              episodes
            }
          }
        }
      }
    }
  `;

    try {
        const data = await fetchWithRetry("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, variables: { search } })
        });
        return data?.data?.Media || null;
    } catch (err) {
        console.error(`AniList fetch failed for "${search}":`, err.message);
        return null;
    }
}

/* =========================
   3. User Data context Builder
   ========================= */
async function getUserContext(userId) {
    if (!userId) return null;
    try {
        const user = await User.findById(userId).select('name profile');
        if (!user) return null;

        const animeList = await AnimeList.findOne({ userId });
        
        const profile = {
            name: user.name || 'Otaku',
            bio: user.profile?.bio || '',
            favoriteGenres: user.profile?.favoriteGenres?.map(g => g.name) || [],
            stats: user.profile?.stats || {}
        };

        const listInfo = {
            watching: animeList?.watching?.slice(0, 5).map(a => a.title) || [],
            completed: animeList?.completed?.slice(0, 5).map(a => a.title) || [],
            planned: animeList?.planned?.slice(0, 5).map(a => a.title) || [],
            favorites: animeList?.completed?.filter(a => a.userRating >= 4).slice(0, 5).map(a => a.title) || []
        };

        return { profile, listInfo };
    } catch (err) {
        console.error("User context retrieval failed:", err.message);
        return null;
    }
}

/* =========================
   4. Prompt Builder
   ========================= */
function buildSystemPrompt(userData, animeData) {
    let prompt = `You are OtakuAI, a powerful anime companion. Friendly, expert, and chill. 
You act like the user's "Anime Buddy" — a peer who deeply understands their taste.

CORE RULES:
- Be conversational, not robotic.
- If recommending, ALWAYS bold titles like **Naruto**.
- Use user's name if available.
- Analyze their watch history to give personalized advice.
- If they mention a show, use the provided AniList data as source of truth.

`;

    if (userData) {
        const { profile, listInfo } = userData;
        prompt += `USER CONTEXT:
Name: ${profile.name}
Bio: ${profile.bio}
Favorite Genres: ${profile.favoriteGenres.join(', ')}
Stats: ${profile.stats.animeWatched || 0} watched.

RECENT WATCH HISTORY:
Watching: ${listInfo.watching.join(', ')}
Completed: ${listInfo.completed.join(', ')}
Planned: ${listInfo.planned.join(', ')}
Favorites: ${listInfo.favorites.join(', ')}

PERSONALIZATION GOAL: Refer to their history to make the recommendations feel weighted and earned.
`;
    }

    if (animeData) {
        prompt += `
SOURCE OF TRUTH (Specific Anime Context):
Title: ${animeData.title.english || animeData.title.romaji}
Genres: ${animeData.genres.join(", ")}
Score: ${animeData.averageScore}/100
Description: ${animeData.description ? animeData.description.replace(/<[^>]*>/g, '').slice(0, 400) : 'N/A'}
Recommendations from AniList: ${animeData.recommendations?.nodes?.map(r => r.mediaRecommendation.title.english || r.mediaRecommendation.title.romaji).join(', ')}
`;
    }

    prompt += `\nEnd with a follow-up question related to the discussion.`;
    return prompt;
}

/* =========================
   5. Mistral API Call
   ========================= */
async function askMistral(systemInstruction, history, userMsg) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY is missing");

    const messages = [
        { role: "system", content: systemInstruction },
        ...history.slice(-10), // Keep context manageable
        { role: "user", content: userMsg }
    ];

    const data = await fetchWithRetry("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "mistral-small-latest",
            messages,
            temperature: 0.7,
            max_tokens: 800
        })
    });

    return data.choices[0].message.content;
}

/* =========================
   6. Post-processing
   ========================= */
async function getRecommendations(text) {
    const pattern = /\*\*([^*]+)\*\*/g;
    const matches = Array.from(text.matchAll(pattern)).map(m => m[1].trim());
    const unique = [...new Set(matches)].slice(0, 4);

    const recs = [];
    for (const title of unique) {
        // Sequentially fetch to avoid socket issues
        const data = await fetchAnimeContext(title);
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
                episodes: data.episodes
            });
        }
    }
    return recs;
}

/* =========================
   7. Routes
   ========================= */

router.post("/chat", async (req, res) => {
    try {
        const { message, history = [], userId } = req.body;
        if (!message) return error(res, "Message required", 400);

        console.log(`[AI Chat] Request from ${userId || 'guest'}: "${message.slice(0, 50)}"`);

        const userData = await getUserContext(userId);
        
        // Context enrichment
        const titles = [
            'naruto', 'one piece', 'attack on titan', 'demon slayer',
            'jujutsu kaisen', 'my hero academia', 'death note', 'fullmetal alchemist'
        ];
        const mention = titles.find(t => message.toLowerCase().includes(t));
        const animeData = mention ? await fetchAnimeContext(mention) : null;

        const systemPrompt = buildSystemPrompt(userData, animeData);
        const reply = await askMistral(systemPrompt, history, message);
        const anime = await getRecommendations(reply);

        const mood = reply.length > 200 ? 'informative' : 'friendly';
        
        console.log(`[AI Chat] Response sent. Mood: ${mood}, Recs: ${anime.length}`);

        return success(res, "Success", {
            reply,
            anime,
            context: {
                mood,
                suggestions: ["What else do you suggest?", "Add to my list", "Tell me more"]
            }
        });
    } catch (err) {
        console.error("[AI Chat Error]:", err.message);
        return error(res, "OtakuAI had a glitch! Try again later.", 500);
    }
});

router.post("/anime-chat", async (req, res) => {
    try {
        const { query, anime } = req.body;
        const animeData = await fetchAnimeContext(anime);
        const sysPrompt = buildSystemPrompt(null, animeData);
        const reply = await askMistral(sysPrompt, [], query);
        return success(res, "Success", { answer: reply });
    } catch (err) {
        return error(res, "Evaluation failed", 500);
    }
});

router.get("/health", (req, res) => success(res, "OK", { model: "Mistral Small" }));

export default router;