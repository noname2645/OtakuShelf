import express from "express";
import fetch from "node-fetch";
import axios from "axios";

const router = express.Router();

const ANILIST_URL = "https://graphql.anilist.co";
const HF_AI_URL = "https://oceandiver2789-otakushelf-ai.hf.space/intent";

// ============================================
// 🧠 MODE DETECTOR - Friend first, recommender second
// ============================================
function isRecommendationRequest(message) {
    if (!message || typeof message !== 'string') return false;
    
    const msg = message.toLowerCase().trim();
    
    // If message is very short, assume casual chat
    if (msg.length < 5) return false;
    
    // Clear recommendation triggers
    const recommendationTriggers = [
        "recommend", "suggest", "what should i watch",
        "anime like", "something like", "similar to",
        "give me anime", "find anime", "search for",
        "any good anime", "what to watch", "need recommendations",
        "show me anime", "what anime", "recommendations"
    ];
    
    return recommendationTriggers.some(trigger => msg.includes(trigger));
}

// Simple casual chat handler
async function handleCasualChat(message) {
    const casualResponses = [
        "Haha yeah, anime is awesome! What's on your mind? 😄",
        "I love chatting about anime! Tell me more ✨",
        "That's interesting! Want to talk about your favorite shows? 🎌",
        "Oh cool! What's your take on that? 🤔",
        "Nice! As an anime buddy, I'm always here to chat! 🌸",
        "Hehe, tell me more! I'm all ears 👂",
        "That's fun! Want to share your anime thoughts? 💭",
        "Yeah! Anything specific you want to discuss? 🎬",
        "I feel you! Anime has so many cool aspects to talk about 🎯",
        "Totally! What's your current watch? 📺"
    ];
    
    // Try AI chat first, fallback to simple responses
    try {
        const chatRes = await axios.post(HF_AI_URL, {
            message: `
You are OtakuAI, a friendly anime buddy.
Rules:
- Casual conversation only
- No anime recommendations
- No anime titles
- Be short, chill, friendly
- Ask light follow-up questions sometimes

User says: "${message}"
`
        }, { timeout: 5000 });
        
        return chatRes.data.reply || casualResponses[Math.floor(Math.random() * casualResponses.length)];
    } catch (error) {
        console.log("Using fallback casual response");
        return casualResponses[Math.floor(Math.random() * casualResponses.length)];
    }
}

// ============================================
// 🔧 IN-MEMORY USER MEMORY SYSTEM
// ============================================
const userMemories = new Map();

class UserMemory {
    constructor(userId) {
        this.userId = userId;
        this.conversationHistory = [];
        this.preferences = {
            favoriteGenres: [],
            dislikedGenres: [],
            preferredMood: "neutral",
            watchHistory: []
        };
        this.personalityScore = {
            casual: 0,
            formal: 0,
            enthusiastic: 0
        };
        this.lastInteraction = Date.now();
        this.interactionCount = 0;
    }

    addConversation(userMessage, aiResponse, intent) {
        this.conversationHistory.push({
            userMessage,
            aiResponse,
            intent,
            timestamp: new Date().toISOString()
        });

        if (this.conversationHistory.length > 15) {
            this.conversationHistory.shift();
        }

        this.lastInteraction = Date.now();
        this.interactionCount++;

        if (userMessage.includes("!")) this.personalityScore.enthusiastic++;
        if (userMessage.length < 20) this.personalityScore.casual++;
        if (userMessage.includes("please") || userMessage.includes("thank")) this.personalityScore.formal++;
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
            .slice(0, 5)
            .map(([genre]) => genre);

        this.preferences.watchHistory = allAnime.map(a => ({
            title: a.title,
            rating: a.userRating || null,
            status: a.status || 'unknown'
        }));
    }
}

// ============================================
// 🎭 PERSONALITY SYSTEM
// ============================================
const PERSONALITY_RESPONSES = {
    greetings: [
        "Hey there! Ready to find some awesome anime? 🎬",
        "Welcome back! I've been thinking about what you might like today! ✨",
        "Nice to see you! Let's chat about anime! 🌸",
        "Hey anime buddy! What's on your mind today? 🎌"
    ],
    recommendations: [
        "Based on your vibe, I think you'd love these! ✨",
        "Ooh, great choice! Here are some similar picks: 🎯",
        "I've got some perfect matches for what you're looking for! 🎌",
        "Check these out! They match what you're looking for perfectly! 🌟"
    ],
    casual: [
        "That's a great question! Let me think... 🤔",
        "Oh, I love talking about that! Here's what I know: 🗣️",
        "Hmm, let me dig into my anime database for you! 📚",
        "Interesting! Let me share some thoughts about that! 💭"
    ],
    question: [
        "Great question! Here's what I can tell you: 📖",
        "I've got the answer for you! 🎯",
        "Let me explain that to you! 📝",
        "Here's what you need to know about that: 🧠"
    ]
};

const MOOD_EMOJIS = {
    neutral: "🎬",
    excited: "✨",
    chill: "🌸",
    curious: "🤔",
    adventurous: "🗺️",
    romantic: "💖",
    suspenseful: "🔍"
};

// ============================================
// 🔧 HELPER FUNCTIONS
// ============================================
function analyzeMessageType(message) {
    const msg = message.toLowerCase();

    if (msg.includes("recommend") || msg.includes("suggest") || msg.includes("what should i watch")) {
        return "recommendation";
    }
    if (msg.includes("like") || msg.includes("similar to") || msg.includes("same as")) {
        return "similar";
    }
    if (msg.includes("?") || msg.includes("what is") || msg.includes("tell me about") || msg.includes("how")) {
        return "question";
    }
    if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey") || msg.includes("greetings")) {
        return "greeting";
    }
    if (msg.includes("thank") || msg.includes("thanks")) {
        return "thanks";
    }
    return "casual";
}

function generatePersonalityReply(baseReply, messageType, userMemory) {
    const replies = PERSONALITY_RESPONSES[messageType] || PERSONALITY_RESPONSES.casual;
    let personalityFlair = replies[Math.floor(Math.random() * replies.length)];

    if (userMemory && userMemory.interactionCount > 3 && Math.random() > 0.6) {
        personalityFlair = "Hey again! " + personalityFlair;
    }

    return `${personalityFlair}\n\n${baseReply}`;
}

function generateFollowupSuggestions(messageType, intent, userMemory) {
    const suggestions = [];

    if (messageType === "recommendation") {
        suggestions.push(
            "Show me more like these",
            "Recommend something different",
            "What's popular this season?",
            "Find me hidden gems"
        );
    } else if (messageType === "similar") {
        suggestions.push(
            "Find anime with similar themes",
            "Recommend something from different genres",
            "Show me highly rated ones"
        );
    } else if (messageType === "question") {
        suggestions.push(
            "Tell me more about that",
            "What else should I know?",
            "Recommend anime about this topic"
        );
    } else {
        suggestions.push(
            "Recommend me a comedy anime",
            "What should I watch next?",
            "Find hidden gems for me",
            "What's trending right now?"
        );
    }

    if (userMemory && userMemory.preferences.favoriteGenres.length > 0) {
        const randomGenre = userMemory.preferences.favoriteGenres[
            Math.floor(Math.random() * userMemory.preferences.favoriteGenres.length)
        ];
        suggestions.push(`Find more ${randomGenre} anime`);
    }

    return suggestions.slice(0, 4);
}

function detectMoodFromMessage(message) {
    const msg = message.toLowerCase();

    if (msg.includes("excited") || msg.includes("awesome") || msg.includes("amazing")) return "excited";
    if (msg.includes("chill") || msg.includes("relax") || msg.includes("calm")) return "chill";
    if (msg.includes("adventure") || msg.includes("explore") || msg.includes("journey")) return "adventurous";
    if (msg.includes("romance") || msg.includes("love") || msg.includes("relationship")) return "romantic";
    if (msg.includes("mystery") || msg.includes("thriller") || msg.includes("suspense")) return "suspenseful";
    if (msg.includes("curious") || msg.includes("wonder") || msg.includes("ask")) return "curious";

    return "neutral";
}

// ============================================
// 🎬 ANILIST FETCH FUNCTION
// ============================================
async function fetchAnimeByGenres(genres, excludedGenres = [], limit = 10, mood = "neutral") {
    let query;
    
    if (mood === "chill" || mood === "casual") {
        query = `
            query ($genres: [String], $excludedGenres: [String], $perPage: Int) {
                Page(perPage: $perPage) {
                    media(
                        type: ANIME,
                        genre_in: $genres,
                        genre_not_in: $excludedGenres,
                        sort: POPULARITY_DESC,
                        format_in: [TV, MOVIE]
                    ) {
                        id
                        title { romaji english }
                        coverImage { large extraLarge }
                        averageScore
                        episodes
                        format
                        status
                        description
                        genres
                    }
                }
            }
        `;
    } else if (mood === "excited" || mood === "adventurous") {
        query = `
            query ($genres: [String], $excludedGenres: [String], $perPage: Int) {
                Page(perPage: $perPage) {
                    media(
                        type: ANIME,
                        genre_in: $genres,
                        genre_not_in: $excludedGenres,
                        sort: SCORE_DESC,
                        averageScore_greater: 70
                    ) {
                        id
                        title { romaji english }
                        coverImage { large extraLarge }
                        averageScore
                        episodes
                        format
                        status
                        description
                        genres
                    }
                }
            }
        `;
    } else {
        query = `
            query ($genres: [String], $excludedGenres: [String], $perPage: Int) {
                Page(perPage: $perPage) {
                    media(
                        type: ANIME,
                        genre_in: $genres,
                        genre_not_in: $excludedGenres,
                        sort: POPULARITY_DESC
                    ) {
                        id
                        title { romaji english }
                        coverImage { large extraLarge }
                        averageScore
                        episodes
                        format
                        status
                        description
                        genres
                    }
                }
            }
        `;
    }

    const variables = {
        genres,
        excludedGenres,
        perPage: limit,
    };

    try {
        const res = await fetch(ANILIST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query,
                variables,
            }),
        });

        const data = await res.json();
        return data?.data?.Page?.media || [];
    } catch (err) {
        console.error("❌ AniList fetch error:", err.message);
        return [];
    }
}

// ============================================
// 🎯 MAIN CHAT ENDPOINT (WITH MODE DETECTION)
// ============================================
router.post("/chat", async (req, res) => {
    const { message: userMessage, userId } = req.body;

    console.log(`🤖 AI Chat request from user ${userId || 'anonymous'}: "${userMessage}"`);

    // 🧠 MODE SWITCH - Friend first, recommender second
    const wantsRecommendation = isRecommendationRequest(userMessage);

    // ============================================
    // 🗣️ MODE 1: CASUAL CHAT (NO RECOMMENDATIONS)
    // ============================================
    if (!wantsRecommendation) {
        try {
            const casualReply = await handleCasualChat(userMessage);
            
            // Update memory if user exists
            if (userId) {
                if (!userMemories.has(userId)) {
                    userMemories.set(userId, new UserMemory(userId));
                }
                const userMemory = userMemories.get(userId);
                userMemory.addConversation(userMessage, casualReply, { mode: "casual" });
            }

            return res.json({
                reply: casualReply,
                anime: [] // 👈 NO CARDS FOR CASUAL CHAT
            });
        } catch (error) {
            console.error("Casual chat error:", error);
            return res.json({
                reply: "Heh 😅 what's on your mind?",
                anime: []
            });
        }
    }

    // ============================================
    // 🎬 MODE 2: RECOMMENDATION MODE
    // ============================================
    
    // 1️⃣ INITIALIZE USER MEMORY
    let userMemory = null;
    if (userId) {
        if (!userMemories.has(userId)) {
            userMemories.set(userId, new UserMemory(userId));
        }
        userMemory = userMemories.get(userId);

        // Clean old memories
        const now = Date.now();
        if (now - userMemory.lastInteraction > 24 * 60 * 60 * 1000) {
            userMemories.delete(userId);
            userMemories.set(userId, new UserMemory(userId));
            userMemory = userMemories.get(userId);
        }
    }

    // 2️⃣ ANALYZE MESSAGE
    const messageType = analyzeMessageType(userMessage);
    const userMood = detectMoodFromMessage(userMessage);

    let intent = {
        includeGenres: [],
        excludeGenres: [],
        mood: userMood,
        pacing: "medium",
        messageType: messageType
    };

    // 3️⃣ AI INTENT PROCESSING
    try {
        const aiRes = await fetch(HF_AI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userMessage }),
        });

        const aiData = await aiRes.json();

        if (Array.isArray(aiData.includeGenres)) {
            intent = {
                includeGenres: aiData.includeGenres,
                excludeGenres: aiData.excludeGenres || [],
                mood: aiData.mood || userMood,
                pacing: aiData.pacing || "medium",
                messageType: messageType
            };
        }

        if (typeof aiData.intent === "string") {
            const match = aiData.intent.match(/\{[\s\S]*?\}/);
            if (match) {
                const parsedIntent = JSON.parse(match[0]);
                intent = {
                    ...intent,
                    ...parsedIntent,
                    messageType: messageType
                };
            }
        }
    } catch (err) {
        console.error("❌ HF AI error:", err.message);
        const fallbackGenres = detectGenresFromMessage(userMessage);
        intent.includeGenres = fallbackGenres;
    }

    // 4️⃣ FETCH USER ANIME LIST
    let completedIds = [];
    let droppedIds = [];
    let userAnimeList = { watching: [], completed: [], planned: [], dropped: [] };

    if (userId) {
        try {
            const baseUrl = `${req.protocol}://${req.get("host")}`;
            const authHeader = req.headers.authorization || "";

            const listRes = await axios.get(
                `${baseUrl}/api/list/${userId}`,
                {
                    headers: {
                        Authorization: authHeader,
                        "Content-Type": "application/json"
                    }
                }
            );

            userAnimeList = listRes.data;
            completedIds = (userAnimeList.completed || []).map(a => a.animeId || a._id || a.id);
            droppedIds = (userAnimeList.dropped || []).map(a => a.animeId || a._id || a.id);

            if (userMemory) {
                userMemory.updatePreferencesFromAnimeList(userAnimeList);
            }
        } catch (err) {
            console.error("⚠️ Failed to fetch user list:", err.message);
        }
    }

    // 5️⃣ FETCH ANIME RECOMMENDATIONS
    let animeList = [];
    try {
        let genresToSearch = intent.includeGenres;

        if (genresToSearch.length === 0 && userMemory && userMemory.preferences.favoriteGenres.length > 0) {
            genresToSearch = userMemory.preferences.favoriteGenres.slice(0, 3);
        }

        if (genresToSearch.length === 0) {
            genresToSearch = ["Action", "Adventure", "Fantasy"];
        }

        if (genresToSearch.length > 0) {
            animeList = await fetchAnimeByGenres(
                genresToSearch,
                intent.excludeGenres,
                12,
                intent.mood
            );
        }
    } catch (err) {
        console.error("❌ AniList fetch error:", err.message);
    }

    // 6️⃣ FILTER ALREADY WATCHED
    animeList = animeList.filter(
        a => !completedIds.includes(a.id.toString()) && !droppedIds.includes(a.id.toString())
    );
    animeList = animeList.slice(0, 8);

    // 7️⃣ GENERATE REPLY
    let reply = "";
    switch (messageType) {
        case "greeting":
            reply = PERSONALITY_RESPONSES.greetings[Math.floor(Math.random() * PERSONALITY_RESPONSES.greetings.length)];
            break;
        case "recommendation":
            reply = intent.includeGenres.length > 0 
                ? `I found some great ${intent.includeGenres.join(", ")} anime for you!`
                : "I've got some awesome anime recommendations for you!";
            break;
        case "similar":
            reply = "Here are some anime similar to what you're looking for!";
            break;
        case "question":
            reply = "Great question! Here's what I can tell you about that topic.";
            break;
        case "thanks":
            reply = "You're welcome! Always happy to help a fellow anime fan! 😊";
            break;
        default:
            reply = intent.includeGenres.length > 0
                ? `Talking about ${intent.includeGenres.join(", ")}? Here are some great picks!`
                : "Here are some anime I think you'll enjoy!";
    }

    // Personal touches
    if (userMemory) {
        if (userMemory.interactionCount > 1 && Math.random() > 0.7) {
            reply = `Welcome back! ${reply}`;
        }
        
        if (userMemory.preferences.favoriteGenres.length > 0) {
            const mentionedGenres = intent.includeGenres.filter(genre =>
                userMemory.preferences.favoriteGenres.includes(genre)
            );
            if (mentionedGenres.length > 0) {
                reply += `\n\nI know you love ${mentionedGenres.join(" and ")} anime, so these should be perfect!`;
            }
        }
    }

    const moodEmoji = MOOD_EMOJIS[intent.mood] || MOOD_EMOJIS.neutral;
    reply += ` ${moodEmoji}`;
    reply = generatePersonalityReply(reply, messageType, userMemory);

    // 8️⃣ UPDATE MEMORY
    if (userMemory) {
        userMemory.addConversation(userMessage, reply, intent);
    }

    // 9️⃣ PREPARE RESPONSE
    const suggestions = generateFollowupSuggestions(messageType, intent, userMemory);
    
    const response = {
        reply: reply,
        anime: animeList,
        context: {
            messageType: messageType,
            genres: intent.includeGenres,
            mood: intent.mood,
            personalized: !!userMemory,
            conversationCount: userMemory ? userMemory.interactionCount : 0,
            favoriteGenres: userMemory ? userMemory.preferences.favoriteGenres.slice(0, 3) : [],
            suggestions: suggestions,
            mode: "recommendation" // Track which mode we're in
        }
    };

    console.log(`✅ Response ready with ${animeList.length} anime recommendations`);
    res.json(response);
});

// ============================================
// 🎯 FALLBACK GENRE DETECTION
// ============================================
function detectGenresFromMessage(message) {
    const msg = message.toLowerCase();
    const genreKeywords = {
        "Action": ["action", "fight", "battle", "combat"],
        "Adventure": ["adventure", "journey", "explore"],
        "Comedy": ["comedy", "funny", "humor", "jokes"],
        "Drama": ["drama", "emotional", "serious"],
        "Fantasy": ["fantasy", "magic", "isekai", "reincarnation"],
        "Horror": ["horror", "scary", "creepy", "fear"],
        "Mystery": ["mystery", "detective", "investigation"],
        "Romance": ["romance", "love", "romantic", "relationship"],
        "Sci-Fi": ["sci-fi", "science fiction", "space", "future"],
        "Slice of Life": ["slice of life", "daily life", "chill", "relaxing"],
        "Sports": ["sports", "athlete", "competition"],
        "Supernatural": ["supernatural", "ghost", "spirits"],
        "Suspense": ["suspense", "tense"],
        "Thriller": ["thriller", "psychological", "mind game"]
    };

    const detectedGenres = [];
    for (const [genre, keywords] of Object.entries(genreKeywords)) {
        for (const keyword of keywords) {
            if (msg.includes(keyword)) {
                if (!detectedGenres.includes(genre)) {
                    detectedGenres.push(genre);
                }
                break;
            }
        }
    }

    return detectedGenres.slice(0, 3);
}

// ============================================
// 🧹 CLEANUP OLD MEMORIES
// ============================================
setInterval(() => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    for (const [userId, memory] of userMemories.entries()) {
        if (now - memory.lastInteraction > twentyFourHours) {
            userMemories.delete(userId);
            console.log(`🧹 Cleaned up old memory for user ${userId}`);
        }
    }
}, 60 * 60 * 1000);

// ============================================
// 📊 DEBUG ENDPOINT
// ============================================
router.get("/debug/memory/:userId", (req, res) => {
    const { userId } = req.params;

    if (userMemories.has(userId)) {
        const memory = userMemories.get(userId);
        res.json({
            userId,
            conversationCount: memory.conversationHistory.length,
            lastInteraction: new Date(memory.lastInteraction).toISOString(),
            favoriteGenres: memory.preferences.favoriteGenres,
            personalityScore: memory.personalityScore,
            recentConversations: memory.conversationHistory.slice(-3)
        });
    } else {
        res.json({
            message: "No memory found for this user",
            userId
        });
    }
});

export default router;