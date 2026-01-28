import express from "express";
import fetch from "node-fetch";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

const router = express.Router();

const ANILIST_URL = "https://graphql.anilist.co";

const envFile =
    process.env.NODE_ENV === "production"
        ? ".env.production"
        : ".env.development";

dotenv.config({ path: envFile });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// console.log("GEMINI KEY:", process.env.GEMINI_API_KEY);

// ============================================
// 🧠 CLEAN GEMINI CHAT (ONLY CONVERSATION)
// ============================================
async function getGeminiChatResponse(userMessage, userId = null, userMemory = null) {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
        });

        // Build simple history context
        let history = "";
        if (userMemory && userMemory.conversationHistory.length > 0) {
            const recent = userMemory.conversationHistory
                .slice(-3)
                .map(chat => `User: ${chat.userMessage}\nYou: ${chat.aiResponse}`)
                .join('\n\n');
            history = `Previous conversation:\n${recent}\n\n`;
        }

        // SIMPLE PROMPT - NO TOOL LOGIC
        const prompt = `${history}
You are OtakuAI, a friendly anime fan chatting with a friend.
Be natural, enthusiastic, and conversational.
Just respond to what the user says.

User: "${userMessage}"
You:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();

    } catch (error) {
        console.error("Gemini error:", error.message);
        return "Hmm, I'm having trouble connecting! Try again? 😅";
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

// ============================================
// 🎯 MAIN ENDPOINT (CLEAN FLOW)
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

    // 3. GET AI REPLY FIRST (ALWAYS)
    const aiReply = await getGeminiChatResponse(userMessage, userId, userMemory);

    // 4. CHECK FOR ANIME REQUEST (SIMPLE)
    let animeCards = [];
    const lowerMsg = userMessage.toLowerCase();

    // SIMPLE RULE: Only show cards if user explicitly asks
    const isAskingForAnime =
        lowerMsg.includes("recommend") ||
        lowerMsg.includes("suggest") ||
        lowerMsg.includes("find me anime") ||
        lowerMsg.includes("what should i watch");

    if (isAskingForAnime) {
        console.log("🎬 User wants anime recommendations");

        // Simple genre detection - just use first matching genre or user's favorites
        let genres = [];

        // Check for genre keywords in message
        const genreKeywords = {
            "action": ["action", "fight", "battle"],
            "comedy": ["comedy", "funny", "humor"],
            "romance": ["romance", "love", "romantic"],
            "fantasy": ["fantasy", "magic", "isekai"],
            "drama": ["drama", "emotional"],
            "sci-fi": ["sci-fi", "science fiction", "space"]
        };

        for (const [genre, keywords] of Object.entries(genreKeywords)) {
            if (keywords.some(keyword => lowerMsg.includes(keyword))) {
                genres.push(genre.charAt(0).toUpperCase() + genre.slice(1));
                break; // Just use first found genre
            }
        }

        // If no genre in message, use user's favorites
        if (genres.length === 0 && userMemory && userMemory.preferences.favoriteGenres.length > 0) {
            genres = [userMemory.preferences.favoriteGenres[0]]; // Just one genre
        }

        // Default fallback
        if (genres.length === 0) {
            genres = ["Action"];
        }

        console.log(`🔍 Using genre: ${genres[0]}`);

        // Fetch anime
        animeCards = await fetchAnimeByGenres(genres, 10);

        // Filter out watched
        animeCards = animeCards.filter(a => !completedIds.includes(a.id.toString()));

        // Limit to 6
        animeCards = animeCards.slice(0, 6);

        console.log(`✅ Found ${animeCards.length} anime`);
    }

    // 5. Update memory
    if (userMemory) {
        userMemory.addConversation(userMessage, aiReply);
    }

    // 6. Return
    const response = {
        reply: aiReply,
        anime: animeCards
    };

    console.log(`🤖 Response ready`);
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