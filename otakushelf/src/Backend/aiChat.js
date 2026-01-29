import express from "express";
import fetch from "node-fetch";
import axios from "axios";
import dotenv from "dotenv";

const router = express.Router();

const ANILIST_URL = "https://graphql.anilist.co";

const envFile =
    process.env.NODE_ENV === "production"
        ? ".env.production"
        : ".env.development";

dotenv.config({ path: envFile });

// OpenRouter configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "meta-llama/llama-3.1-8b-instruct";

// ============================================
// 🧠 OPENROUTER CHAT
// ============================================
async function getOpenRouterResponse(userMessage, userId = null, userMemory = null) {
    try {
        // Build conversation history
        const messages = [];
        
        // Add system prompt
        messages.push({
            role: "system",
            content: `You are OtakuAI, a friendly anime fan chatting with a friend.
            Be natural, enthusiastic, and conversational.
            Keep responses concise and engaging.
            If the user asks for anime recommendations, acknowledge it naturally but keep your response brief.
            Don't list specific anime titles in your response - the system will handle recommendations separately.`
        });

        // Add conversation history if available
        if (userMemory && userMemory.conversationHistory.length > 0) {
            const recentHistory = userMemory.conversationHistory.slice(-3);
            recentHistory.forEach(chat => {
                messages.push({ role: "user", content: chat.userMessage });
                messages.push({ role: "assistant", content: chat.aiResponse });
            });
        }

        // Add current user message
        messages.push({ role: "user", content: userMessage });

        // Make API call to OpenRouter
        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://otakushell.com",
                "X-Title": "OtakuShell AI Companion"
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 500,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API error:", response.status, errorText);
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();

    } catch (error) {
        console.error("OpenRouter error:", error.message);
        return "Hmm, I'm having trouble connecting to my brain! Try again? 😅";
    }
}

// ============================================
// 📊 USER MEMORY (KEEP IT)
// ============================================
const userMemories = new Map();

class UserMemory {
    constructor(userId) {
        this.userId = userId;
        this.conversationHistory = [];
        this.preferences = {
            favoriteGenres: [],
            watchHistory: []
        };
        this.lastInteraction = Date.now();
    }

    addConversation(userMessage, aiResponse) {
        this.conversationHistory.push({
            userMessage,
            aiResponse,
            timestamp: new Date().toISOString()
        });

        if (this.conversationHistory.length > 10) {
            this.conversationHistory.shift();
        }

        this.lastInteraction = Date.now();
    }

    updatePreferencesFromAnimeList(animeList) {
        const allAnime = [
            ...(animeList.completed || []),
            ...(animeList.watching || []),
            ...(animeList.planned || [])
        ];

        const genreCount = {};
        allAnime.forEach(anime => {
            if (anime.genres && Array.isArray(anime.genres)) {
                anime.genres.forEach(genre => {
                    genreCount[genre] = (genreCount[genre] || 0) + 1;
                });
            }
        });

        this.preferences.favoriteGenres = Object.entries(genreCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([genre]) => genre);
    }
}

// ============================================
// 🎬 ANIME FETCH (SIMPLE)
// ============================================
async function fetchAnimeByGenres(genres, limit = 8) {
    const query = `
        query ($genres: [String], $perPage: Int) {
            Page(perPage: $perPage) {
                media(
                    type: ANIME,
                    genre_in: $genres,
                    sort: POPULARITY_DESC
                ) {
                    id
                    title { romaji english }
                    coverImage { large }
                    averageScore
                    episodes
                    description
                    genres
                }
            }
        }
    `;

    try {
        const res = await fetch(ANILIST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query,
                variables: { genres, perPage: limit }
            }),
        });

        const data = await res.json();
        return data?.data?.Page?.media || [];
    } catch (err) {
        console.error("AniList error:", err.message);
        return [];
    }
}

// Helper function for follow-up suggestions
function getFollowupSuggestions(message, genres) {
    const suggestions = [];
    
    if (message.includes("recommend") || message.includes("suggest")) {
        suggestions.push(
            "Can you suggest more like these?",
            "What are some hidden gems?",
            "Show me popular ones from this genre"
        );
    }
    
    if (genres.length > 0) {
        suggestions.push(`Find me more ${genres[0].toLowerCase()} anime`);
    }
    
    return suggestions.slice(0, 3);
}

// ============================================
// 🎯 MAIN ENDPOINT
// ============================================
router.post("/chat", async (req, res) => {
    const { message: userMessage, userId } = req.body;

    console.log(`💬 User ${userId || 'guest'}: "${userMessage}"`);

    // 1. Get user memory
    let userMemory = null;
    if (userId) {
        if (!userMemories.has(userId)) {
            userMemories.set(userId, new UserMemory(userId));
        }
        userMemory = userMemories.get(userId);
    }

    // 2. Get user's anime list (for filtering only)
    let completedIds = [];
    if (userId && userMemory) {
        try {
            const baseUrl = `${req.protocol}://${req.get("host")}`;
            const listRes = await axios.get(
                `${baseUrl}/api/list/${userId}`,
                {
                    headers: {
                        Authorization: req.headers.authorization || "",
                        "Content-Type": "application/json"
                    }
                }
            );

            const userAnimeList = listRes.data;
            completedIds = (userAnimeList.completed || []).map(a => a.animeId || a._id || a.id);
            userMemory.updatePreferencesFromAnimeList(userAnimeList);

        } catch (err) {
            console.log("Skipping user list fetch");
        }
    }

    // 3. GET AI REPLY FROM OPENROUTER
    const aiReply = await getOpenRouterResponse(userMessage, userId, userMemory);

    // 4. CHECK FOR ANIME REQUEST (SIMPLE)
    let animeCards = [];
    const lowerMsg = userMessage.toLowerCase();
    let genres = []; 

    // SIMPLE RULE: Only show cards if user explicitly asks
    const isAskingForAnime =
        lowerMsg.includes("recommend") ||
        lowerMsg.includes("suggest") ||
        lowerMsg.includes("find me anime") ||
        lowerMsg.includes("what should i watch") ||
        lowerMsg.includes("anime to watch") ||
        lowerMsg.includes("something to watch");

    if (isAskingForAnime) {
        console.log("🎬 User wants anime recommendations");


        // Check for genre keywords in message
        const genreKeywords = {
            "action": ["action", "fight", "battle", "shonen"],
            "comedy": ["comedy", "funny", "humor", "slice of life"],
            "romance": ["romance", "love", "romantic"],
            "fantasy": ["fantasy", "magic", "isekai"],
            "drama": ["drama", "emotional", "serious"],
            "sci-fi": ["sci-fi", "science fiction", "space", "cyberpunk"],
            "adventure": ["adventure", "journey", "explore"],
            "mystery": ["mystery", "detective", "thriller"],
            "horror": ["horror", "scary", "psychological"]
        };

        for (const [genre, keywords] of Object.entries(genreKeywords)) {
            if (keywords.some(keyword => lowerMsg.includes(keyword))) {
                genres.push(genre.charAt(0).toUpperCase() + genre.slice(1));
                break;
            }
        }

        // If no genre in message, use user's favorites
        if (genres.length === 0 && userMemory && userMemory.preferences.favoriteGenres.length > 0) {
            genres = [userMemory.preferences.favoriteGenres[0]];
        }

        // Default fallback
        if (genres.length === 0) {
            genres = ["Action"];
        }

        console.log(`🔍 Using genre: ${genres[0]}`);

        // Fetch anime
        animeCards = await fetchAnimeByGenres(genres, 12);

        // Filter out watched
        animeCards = animeCards.filter(a => !completedIds.includes(a.id.toString()));

        // Limit to 6
        animeCards = animeCards.slice(0, 6);

        console.log(`✅ Found ${animeCards.length} anime recommendations`);
    }

    // 5. Update memory
    if (userMemory) {
        userMemory.addConversation(userMessage, aiReply);
    }

    // 6. Return response
    const response = {
        reply: aiReply,
        anime: animeCards,
        context: {
            mood: 'neutral',
            suggestions: getFollowupSuggestions(lowerMsg, genres || [])
        }
    };

    console.log(`🤖 Response ready with ${animeCards.length} anime cards`);
    res.json(response);
});

// ============================================
// 🧹 CLEANUP
// ============================================
setInterval(() => {
    const now = Date.now();
    for (const [userId, memory] of userMemories.entries()) {
        if (now - memory.lastInteraction > 24 * 60 * 60 * 1000) {
            userMemories.delete(userId);
        }
    }
}, 60 * 60 * 1000);

export default router;