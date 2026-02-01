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
// 🧠 ADAPTIVE AI SYSTEM
// ============================================

// // 🆕 PROFILE DATA EXTRACTOR
// async function extractUserProfileForAI(userProfileData) {
//     if (!userProfileData) return "No detailed profile available.";

//     let profileSummary = "USER PROFILE:\n";

//     // Only include essential info
//     const stats = userProfileData.profile?.stats || {};

//     profileSummary += `• Completed: ${stats.animeWatched || 0} anime\n`;
//     profileSummary += `• Watching: ${stats.currentlyWatching || 0} anime\n`;

//     // Favorite genres (short)
//     const favGenres = userProfileData.profile?.favoriteGenres || [];
//     if (favGenres.length > 0) {
//         const top3 = favGenres.slice(0, 3).map(g => `${g.name} (${g.percentage}%)`).join(', ');
//         profileSummary += `• Top genres: ${top3}\n`;
//     } else {
//         profileSummary += `• Top genres: Not enough data yet\n`;
//     }

//     // Recent activity
//     const recentWatched = userProfileData.recentlyWatched || [];
//     if (recentWatched.length > 0) {
//         const recentNames = recentWatched.slice(0, 2).map(a => a.title).join(', ');
//         profileSummary += `• Recently watched: ${recentNames}\n`;
//     }

//     return profileSummary;
// }

const adaptiveProfiles = new Map();

class AdaptiveUserProfile {
    constructor(userId) {
        this.userId = userId;
        this.tasteVectors = {
            genres: new Map(),
            themes: new Map(),
            studios: new Map()
        };
        this.interactionStats = {
            totalInteractions: 0,
            positiveFeedback: 0,
            negativeFeedback: 0,
            avgMessageLength: 150,
            preferredTone: 'casual',
            engagementScore: 0.5,
            favoriteTopics: new Set()
        };
        this.personality = {
            current: 'enthusiastic_otaku',
            mood: 'neutral',
            energyLevel: 0.7
        };
        this.learningParams = {
            decayRate: 0.95,
            learningRate: 0.15,
            explorationRate: 0.25
        };
        this.recentActivity = {
            lastMessages: [],
            lastRecommendations: [] // 🆕 Track recent recommendations
        };
        this.lastUpdated = Date.now();
    }

    updateFromAnime(animeData, action) {
        const impactMap = {
            'watched': 0.3,
            'completed': 0.5,
            'rated_high': 0.7,
            'rated_low': -0.3,
            'dropped': -0.4,
            'saved': 0.2,
            'ignored': -0.1
        };

        const impact = impactMap[action] || 0.1;

        if (animeData.genres && Array.isArray(animeData.genres)) {
            animeData.genres.forEach(genre => {
                const current = this.tasteVectors.genres.get(genre) || {
                    weight: 0.5,
                    confidence: 0.1,
                    interactions: 0,
                    lastUpdated: Date.now()
                };

                const newWeight = current.weight + (impact * this.learningParams.learningRate);
                const newConfidence = Math.min(1, current.confidence + 0.05);

                this.tasteVectors.genres.set(genre, {
                    weight: Math.max(0, Math.min(1, newWeight)),
                    confidence: newConfidence,
                    interactions: current.interactions + 1,
                    lastUpdated: Date.now()
                });
            });
        }

        this.applyTimeDecay();
    }

    applyTimeDecay() {
        const now = Date.now();

        this.tasteVectors.genres.forEach((value, key) => {
            const daysSinceUpdate = (now - value.lastUpdated) / (1000 * 60 * 60 * 24);
            if (daysSinceUpdate > 7) {
                const decayFactor = Math.pow(this.learningParams.decayRate, Math.floor(daysSinceUpdate / 7));
                this.tasteVectors.genres.set(key, {
                    ...value,
                    weight: value.weight * decayFactor,
                    lastUpdated: now
                });
            }
        });
    }

    getTopGenres(limit = 3) {
        const entries = Array.from(this.tasteVectors.genres.entries());

        return entries
            .sort((a, b) => {
                const scoreA = a[1].weight * a[1].confidence;
                const scoreB = b[1].weight * b[1].confidence;
                return scoreB - scoreA;
            })
            .slice(0, limit)
            .map(([genre, data]) => ({ genre, ...data }));
    }

    getExplorationGenres() {
        const allGenres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
            'Romance', 'Sci-Fi', 'Slice of Life', 'Mystery', 'Horror',
            'Sports', 'Psychological', 'Supernatural', 'Mecha', 'Isekai'];

        const lowInteractionGenres = allGenres.filter(genre => {
            const data = this.tasteVectors.genres.get(genre);
            return !data || data.interactions < 2;
        });

        const selected = [];
        lowInteractionGenres.forEach(genre => {
            if (Math.random() < this.learningParams.explorationRate && selected.length < 2) {
                selected.push(genre);
            }
        });

        return selected.length > 0 ? selected : ['Slice of Life', 'Sports'];
    }

    // 🆕 Add recent recommendation tracking
    addRecentRecommendation(animeList) {
        if (!this.recentActivity.lastRecommendations) {
            this.recentActivity.lastRecommendations = [];
        }

        animeList.forEach(anime => {
            // Check if already in recent recommendations
            const exists = this.recentActivity.lastRecommendations.some(
                rec => rec.id === anime.id
            );

            if (!exists) {
                this.recentActivity.lastRecommendations.push({
                    id: anime.id,
                    title: anime.title?.english || anime.title?.romaji || "Unknown",
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Keep only last 15 recommendations
        if (this.recentActivity.lastRecommendations.length > 15) {
            this.recentActivity.lastRecommendations =
                this.recentActivity.lastRecommendations.slice(-15);
        }
    }

    // 🆕 Get recently recommended anime IDs
    getRecentRecommendationIds() {
        return this.recentActivity.lastRecommendations?.map(rec => rec.id) || [];
    }

    updateFromInteraction(userMessage, aiResponse, feedback = null) {
        this.interactionStats.totalInteractions++;
        this.interactionStats.avgMessageLength =
            (this.interactionStats.avgMessageLength * 0.9) + (userMessage.length * 0.1);

        if (feedback === 'positive') {
            this.interactionStats.positiveFeedback++;
        } else if (feedback === 'negative') {
            this.interactionStats.negativeFeedback++;
        }

        const total = this.interactionStats.totalInteractions;
        const positive = this.interactionStats.positiveFeedback;
        const recentInteractions = Math.min(10, total);

        this.interactionStats.engagementScore =
            (positive / Math.max(1, total)) * 0.7 +
            (recentInteractions / 10) * 0.3;

        this.detectTone(userMessage);
        this.extractTopics(userMessage);
        this.adaptPersonality(userMessage);

        this.lastUpdated = Date.now();
    }

    detectTone(message) {
        const lowerMsg = message.toLowerCase();

        const casualMarkers = ['lol', 'haha', 'omg', 'btw', 'imo', 'idk'];
        const formalMarkers = ['please', 'thank you', 'could you', 'would you'];
        const enthusiasticMarkers = ['!!!', '??', 'love', 'awesome', 'amazing'];

        let casualCount = 0, formalCount = 0, enthusiasticCount = 0;

        casualMarkers.forEach(marker => {
            if (lowerMsg.includes(marker)) casualCount++;
        });

        formalMarkers.forEach(marker => {
            if (lowerMsg.includes(marker)) formalCount++;
        });

        enthusiasticMarkers.forEach(marker => {
            if (lowerMsg.includes(marker)) enthusiasticCount++;
        });

        if (enthusiasticCount >= 2) {
            this.interactionStats.preferredTone = 'enthusiastic';
        } else if (formalCount >= 2) {
            this.interactionStats.preferredTone = 'formal';
        } else if (casualCount >= 2) {
            this.interactionStats.preferredTone = 'casual';
        }
    }

    extractTopics(message) {
        const topics = {
            'action': ['action', 'fight', 'battle', 'shonen'],
            'comedy': ['comedy', 'funny', 'humor'],
            'romance': ['romance', 'love', 'romantic'],
            'fantasy': ['fantasy', 'magic', 'isekai'],
            'drama': ['drama', 'emotional', 'serious']
        };

        const lowerMsg = message.toLowerCase();
        Object.entries(topics).forEach(([topic, keywords]) => {
            if (keywords.some(keyword => lowerMsg.includes(keyword))) {
                this.interactionStats.favoriteTopics.add(topic);
            }
        });

        if (this.interactionStats.favoriteTopics.size > 10) {
            const topicsArray = Array.from(this.interactionStats.favoriteTopics);
            this.interactionStats.favoriteTopics = new Set(topicsArray.slice(-10));
        }
    }

    adaptPersonality(userMessage) {
        const userMsg = userMessage.toLowerCase();

        if (userMsg.includes('!') || userMsg.includes('😊') || userMsg.includes('😍')) {
            this.personality.energyLevel = Math.min(1, this.personality.energyLevel + 0.1);
            if (Math.random() > 0.7) this.personality.current = 'enthusiastic_otaku';
        }

        if (userMsg.includes('?') && userMessage.length > 20) {
            if (Math.random() > 0.6) this.personality.current = 'curious_researcher';
        }

        if (userMsg.includes('...') || userMsg.includes('hmm')) {
            if (Math.random() > 0.5) this.personality.current = 'calm_sensei';
        }

        if (userMsg.includes('sad') || userMsg.includes('depressed')) {
            this.personality.current = 'friendly_buddy';
        }

        const hour = new Date().getHours();
        if (hour < 6 || hour > 22) {
            this.personality.current = 'calm_sensei';
        }

        if (this.interactionStats.engagementScore > 0.7) {
            this.personality.mood = 'positive';
        } else if (this.interactionStats.engagementScore < 0.3) {
            this.personality.mood = 'concerned';
        } else {
            this.personality.mood = 'neutral';
        }
    }
}

// ============================================
// 🆕 HELPER FUNCTIONS
// ============================================

// Check for single anime request
function isSingleAnimeRequest(message) {
    const lowerMsg = message.toLowerCase();
    const singlePatterns = [
        /recommend (me )?(just )?(one|single|1) anime/i,
        /suggest (me )?(just )?(one|single|1) anime/i,
        /give me (only )?(one|single|1) anime/i,
        /(one|single|1) (anime|recommendation)/i,
        /just (one|single|1)/i
    ];

    return singlePatterns.some(pattern => pattern.test(lowerMsg));
}

// Check for unique/new requests
function isUniqueAnimeRequest(message) {
    const lowerMsg = message.toLowerCase();
    const uniquePatterns = [
        /unique anime/i,
        /different anime/i,
        /new anime/i,
        /something i haven't seen/i,
        /not the usual/i,
        /something different/i,
        /hidden gem/i,
        /underrated/i
    ];

    return uniquePatterns.some(pattern => pattern.test(lowerMsg));
}

// ============================================
// 🧠 ADAPTIVE OPENROUTER CHAT
// ============================================
async function getAdaptiveOpenRouterResponse(userMessage, userId = null, adaptiveProfile = null, context = {}, recommendations = null) {
    try {
        let profile = adaptiveProfile;
        if (userId && !profile) {
            if (!adaptiveProfiles.has(userId)) {
                adaptiveProfiles.set(userId, new AdaptiveUserProfile(userId));
            }
            profile = adaptiveProfiles.get(userId);
        }

        const systemPrompt = buildAdaptiveSystemPrompt(profile, context, userMessage, recommendations);

        const messages = [];
        messages.push({
            role: "system",
            content: systemPrompt
        });

        if (profile && profile.recentActivity.lastMessages.length > 0) {
            const recentHistory = profile.recentActivity.lastMessages.slice(-3);
            recentHistory.forEach(chat => {
                messages.push({ role: "user", content: chat.userMessage });
                messages.push({ role: "assistant", content: chat.aiResponse });
            });
        }

        messages.push({ role: "user", content: userMessage });

        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://otakushell.com",
                "X-Title": "OtakuShell Adaptive AI Companion"
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                temperature: getAdaptiveTemperature(profile),
                max_tokens: getAdaptiveTokenLength(profile),
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API error:", response.status, errorText);
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content.trim();
        const cleanedResponse = cleanAIResponse(aiResponse);

        if (profile) {
            profile.recentActivity.lastMessages.push({
                userMessage,
                aiResponse: cleanedResponse,
                timestamp: new Date().toISOString()
            });

            if (profile.recentActivity.lastMessages.length > 5) {
                profile.recentActivity.lastMessages.shift();
            }

            profile.updateFromInteraction(userMessage, aiResponse);

            // 🆕 Track recommendations
            if (recommendations?.anime?.length > 0) {
                profile.addRecentRecommendation(recommendations.anime);
            }
        }

        return cleanedResponse;

    } catch (error) {
        console.error("Adaptive OpenRouter error:", error.message);
        return getFallbackResponse(userMessage);
    }
}

function buildAdaptiveSystemPrompt(profile, context, userMessage, recommendations) {
    const personalityConfigs = {
        'enthusiastic_otaku': {
            tone: 'Knowledgeable and passionate about anime',
            style: 'Share insights with moderate enthusiasm. Use emojis sparingly (0-1 per paragraph).'
        },
        'calm_sensei': {
            tone: 'Analytical and thoughtful',
            style: 'Provide balanced recommendations with detailed insights.'
        },
        'curious_researcher': {
            tone: 'Inquisitive and focused',
            style: 'Ask specific questions and provide precise information.'
        },
        'friendly_buddy': {
            tone: 'Casual and helpful',
            style: 'Recommend anime like a knowledgeable friend would.'
        }
    };

    const formattingRules = `
🚫 STRICT FORMATTING RULES - DO NOT IGNORE:
1. **ANIME TITLES**: Use **bold** only for anime titles: **Title Here**
2. **EMOJIS**: Maximum 1-2 emojis in entire response. Do NOT use: 😊😍🤯❤️🐰✨ repeatedly
3. **EXCLAMATIONS**: Use ! sparingly. Never use multiple !!! or ??? 
4. **PARAGRAPHS**: Keep paragraphs short (2-3 sentences). Use line breaks.
5. **REPETITION**: Avoid saying "just" "so" "really" "totally" repeatedly
6. **HYPERBOLE**: Avoid "TO DIE FOR", "SOOOO AMAZING", "EPIC", "INSANE"
7. **STRUCTURE**:
   • Start with a brief acknowledgment
   • Present 2-3 recommendations with clear reasoning
   • Ask one thoughtful follow-up question
8. **AVOID PHRASES**:
   • "Well, I've got just the thing for you!"
   • "Now, I know what you're thinking..."
   • "Trust me..."
   • "Last but not least..."
   • "Another one that caught my eye is..."
   • "The way [character] [action] is just so..."
9. **BE CONCISE**: Get to the point without excessive preamble`;

    const personality = profile?.personality?.current || 'enthusiastic_otaku';
    const config = personalityConfigs[personality];

    // Get user's favorite genres from profile
    let userTasteInfo = "New user, no taste profile yet.";
    if (profile) {
        const topGenres = profile.getTopGenres(2);
        if (topGenres.length > 0) {
            userTasteInfo = `User enjoys: ${topGenres.map(g => g.genre).join(', ')}.`;
        }
    }

    // 🆕 Create short profile summary
    let profileSummary = "";
    if (context.userProfile) {
        // Create a simple profile summary
        const stats = context.userProfile.profile?.stats || {};
        const favGenres = context.userProfile.profile?.favoriteGenres || [];

        profileSummary = `📊 User Stats: ${stats.animeWatched || 0} completed, ${stats.currentlyWatching || 0} watching. `;

        if (favGenres.length > 0) {
            const top3 = favGenres.slice(0, 3).map(g => `${g.name}`).join(', ');
            profileSummary += `Top genres: ${top3}.`;
        }
    }

    // 🆕 Define variables at the function scope level
    let animeContext = "";
    let animeListContent = "";
    let availableAnimeSection = "";

    // CRITICAL: Only mention anime we actually fetched
    if (recommendations && recommendations.anime && recommendations.anime.length > 0) {
        animeListContent = recommendations.anime.slice(0, 3).map((anime, index) => {
            const title = anime.title?.english || anime.title?.romaji || "Anime";
            const cleanDesc = anime.description ?
                anime.description.replace(/<[^>]*>/g, '').substring(0, 100).trim() + "..." :
                "";
            const genres = anime.genres ? anime.genres.slice(0, 3).join(' · ') : "";
            const score = anime.averageScore ? `⭐ ${(anime.averageScore / 10).toFixed(1)}/10` : "";

            return `${index + 1}. **${title}**\n   ${genres} ${score}\n   ${cleanDesc}`;
        }).join('\n\n');

        const isSingleRequest = isSingleAnimeRequest(userMessage);
        const isUniqueRequest = isUniqueAnimeRequest(userMessage);

        animeContext = `
USER PROFILE: ${profileSummary}

ANIME DATA FROM DATABASE (USE THESE ONLY):
${animeListContent}

STRICT RULES FOR RESPONSE:
1. ONLY mention anime from the list above
2. NEVER mention anime not in the list (no Fullmetal Alchemist, Hunter x Hunter, One Piece, Naruto, etc.)
3. Mention 2-3 anime from the list naturally${isSingleRequest ? ' (OR JUST 1 if they asked for one)' : ''}
4. Briefly describe why they match the user's request
5. Ask what they think about these suggestions${isUniqueRequest ? ' (emphasize uniqueness if asked)' : ''}`;

        availableAnimeSection = `
AVAILABLE ANIME FOR RECOMMENDATION:
${animeListContent}`;
    } else {
        animeContext = `
USER PROFILE: ${profileSummary}

NO ANIME DATA AVAILABLE:
Just have a normal conversation about anime. Ask what they like or share general thoughts.`;

        availableAnimeSection = "NO ANIME DATA AVAILABLE FOR RECOMMENDATION";
    }

    return `You are OtakuAI, an anime recommendation assistant. Provide helpful, concise recommendations.

PERSONALITY: ${personality.toUpperCase()}
Tone: ${config.tone}
Style: ${config.style}

${formattingRules}

USER'S MESSAGE: "${userMessage}"
USER'S PREFERENCES: ${userTasteInfo}

${availableAnimeSection}

RESPONSE GUIDELINES:
1. If recommending, mention 2-3 anime from the list above
2. Briefly explain why each matches the request (genre, theme, quality)
3. Use natural, conversational language
4. Ask one specific follow-up question about their preferences
5. ${personality === 'enthusiastic_otaku' ? 'Show moderate enthusiasm' : 'Maintain appropriate tone'}
6. DO NOT add anime not in the list above

Respond naturally while following all formatting rules strictly.`;
}

// 🆕 RESPONSE CLEANER - Post-process to remove cringy patterns
function cleanAIResponse(response) {
    if (!response) return response;

    let cleaned = response;

    // Remove excessive exclamations
    cleaned = cleaned.replace(/!{2,}/g, '!');
    cleaned = cleaned.replace(/\?{2,}/g, '?');

    // Remove ellipsis abuse
    cleaned = cleaned.replace(/\.{3,}/g, '...');

    // Remove repeated emojis
    cleaned = cleaned.replace(/([\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]){2,}/gu, '$1');

    // Remove filler phrases
    const fillerPhrases = [
        /Well, I've got just the thing for you!/gi,
        /Now, I know what you're thinking:/gi,
        /trust me,/gi,
        /Last but not least,/gi,
        /Another one that caught my eye is/gi,
        /just so \.\.\./gi,
        /TO DIE FOR/gi,
        /you've got to check out/gi,
        /you should totally watch/gi,
        /it's just\.\.\. wow!/gi,
        /the way it (.*?) is just so/gi,
        /I think you might enjoy/gi,
        /While you mentioned/gi,
        /But trust me/gi,
        /for short/gi
    ];

    fillerPhrases.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });

    // Remove redundant enthusiasm
    const overEnthusiastic = [
        /sooo+/gi,
        /very very/gi,
        /really really/gi,
        /absolutely amazing/gi,
        /incredibly epic/gi,
        /heartwarming!/gi,
        /adorable!/gi,
        /beautifully crafted/gi
    ];

    overEnthusiastic.forEach(pattern => {
        cleaned = cleaned.replace(pattern, (match) => {
            // Tone down the adjectives
            return match.replace(/absolutely |incredibly |beautifully /gi, '')
                .replace(/!/g, '');
        });
    });

    // Fix common patterns
    cleaned = cleaned.replace(/Romance anime, you say\?/gi, 'For romance anime,');
    cleaned = cleaned.replace(/Another one (that )?is/gi, 'Also');
    cleaned = cleaned.replace(/caught my eye/gi, 'worth considering');

    // Clean up parentheses
    cleaned = cleaned.replace(/\(or (.*?) for short\)/gi, '');

    // Trim extra whitespace and fix punctuation
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/\s\./g, '.');
    cleaned = cleaned.replace(/\s,/g, ',');
    cleaned = cleaned.replace(/\s\?/g, '?');
    cleaned = cleaned.replace(/\s!/g, '!');

    // Ensure proper capitalization
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned;
}

function getAdaptiveTemperature(profile) {
    if (!profile) return 0.7;

    const personality = profile.personality?.current;
    const baseTemps = {
        'enthusiastic_otaku': 0.8,
        'calm_sensei': 0.6,
        'curious_researcher': 0.7,
        'friendly_buddy': 0.75
    };

    let temp = baseTemps[personality] || 0.7;
    const engagement = profile.interactionStats?.engagementScore || 0.5;

    if (engagement > 0.7) temp += 0.1;
    if (engagement < 0.3) temp -= 0.1;

    return Math.max(0.5, Math.min(0.9, temp));
}

function getAdaptiveTokenLength(profile) {
    if (!profile) return 400;

    const avgLength = profile.interactionStats?.avgMessageLength || 150;
    const engagement = profile.interactionStats?.engagementScore || 0.5;

    let tokens = 300;
    if (avgLength > 200) tokens += 100;
    if (engagement > 0.6) tokens += 100;

    return Math.min(600, Math.max(200, tokens));
}

function getFallbackResponse(userMessage) {
    const fallbacks = [
        "Hey there! I'd love to help you find some great anime. What genres or themes are you interested in?",
        "I enjoy chatting about anime! Are you looking for recommendations, or just want to talk about shows you've watched?",
        "Let me help you discover some anime. Could you tell me what you've enjoyed watching recently?",
        "I'm here to chat about all things anime. What's on your mind today?"
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ============================================
// 🎯 UPDATED ADAPTIVE RECOMMENDATION ENGINE
// ============================================
async function getAdaptiveRecommendations(userMessage, adaptiveProfile, userHistory) {
    const { intent, genres, confidence, limit = 6 } = analyzeRecommendationIntent(userMessage, adaptiveProfile);

    console.log(`🎯 Detected: ${intent} - Genres: ${genres.join(', ')} (${confidence}%) - Limit: ${limit}`);

    // 🆕 Fetch more anime for better filtering
    let animeCards = await fetchAnimeByGenres(genres, limit * 3);

    // 🆕 COMPREHENSIVE FILTERING
    const watchedIds = userHistory?.completed?.map(a => a.animeId || a._id || a.id) || [];
    const watchingIds = userHistory?.watching?.map(a => a.animeId || a._id || a.id) || [];

    // Get recently recommended anime
    const recentRecIds = adaptiveProfile?.getRecentRecommendationIds() || [];

    // Combine all IDs to exclude
    const excludeIds = [...new Set([
        ...watchedIds.map(id => id?.toString()),
        ...watchingIds.map(id => id?.toString()),
        ...recentRecIds.map(id => id?.toString())
    ])].filter(id => id && id !== 'null' && id !== 'undefined');

    console.log(`📊 Filtering: ${animeCards.length} anime, excluding ${excludeIds.length} IDs`);

    // Filter out excluded anime
    animeCards = animeCards.filter(a => {
        const animeId = a.id?.toString();
        if (!animeId) return false;

        // Check all possible ID formats
        const isExcluded = excludeIds.some(exId =>
            exId === animeId ||
            exId === a.id ||
            (a.malId && exId === a.malId.toString())
        );

        return !isExcluded;
    });

    // 🆕 Add variety for unique requests
    if (isUniqueAnimeRequest(userMessage) && animeCards.length > 0) {
        // Boost less popular anime for unique requests
        animeCards = animeCards.sort((a, b) => {
            const scoreA = (a.averageScore || 60) + (a.popularity ? -a.popularity / 100 : 0);
            const scoreB = (b.averageScore || 60) + (b.popularity ? -b.popularity / 100 : 0);
            return scoreB - scoreA;
        });
    }

    // 🆕 If we filtered out too many, fetch backup genres
    if (animeCards.length < Math.max(3, limit)) {
        console.log(`🔄 Low count (${animeCards.length}), fetching backup genres...`);

        const backupGenres = adaptiveProfile ?
            adaptiveProfile.getExplorationGenres() :
            ['Slice of Life', 'Mystery', 'Sports', 'Supernatural'];

        const backupAnime = await fetchAnimeByGenres(backupGenres, 10);

        // Filter backup anime
        const filteredBackup = backupAnime.filter(a => {
            const animeId = a.id?.toString();
            if (!animeId) return false;
            return !excludeIds.includes(animeId);
        });

        animeCards = [...animeCards, ...filteredBackup];
        console.log(`➕ Added ${filteredBackup.length} backup anime`);
    }

    // Apply scoring
    animeCards = rankByAdaptiveScore(animeCards, adaptiveProfile, intent, userMessage);

    // Remove duplicates by title
    const seenTitles = new Set();
    animeCards = animeCards.filter(a => {
        const title = a.title?.english || a.title?.romaji;
        if (!title || seenTitles.has(title)) return false;
        seenTitles.add(title);
        return true;
    });

    // Apply limit
    const finalAnime = animeCards.slice(0, limit);

    console.log(`✅ Final: ${finalAnime.length} unique anime recommendations`);

    return {
        anime: finalAnime,
        intent: intent,
        limit: limit,
        genres: genres,
        confidence: confidence,
        reasoning: `Found ${finalAnime.length} ${genres.join(', ')} anime matching your request`
    };
}

function analyzeRecommendationIntent(message, profile) {
    const lowerMsg = message.toLowerCase();

    let intent = 'general';
    let confidence = 0.7;
    let genres = [];
    let limit = 6; // Default limit

    // 🆕 Check for single anime request
    if (isSingleAnimeRequest(message)) {
        intent = 'single';
        confidence = 0.9;
        limit = 1;
    }

    // Check for random request
    if (lowerMsg.includes('random')) {
        intent = 'random';
        confidence = 0.9;
        // For random, use exploration genres or default mix
        if (profile) {
            const topGenres = profile.getTopGenres(1).map(g => g.genre);
            const exploration = profile.getExplorationGenres();
            genres = [...topGenres, ...exploration].slice(0, 3);
        } else {
            genres = ['Action', 'Comedy', 'Adventure'];
        }
    }

    // Extract genres from message
    const genreKeywords = {
        'Action': ['action', 'fight', 'battle', 'shonen'],
        'Comedy': ['comedy', 'funny', 'humor'],
        'Romance': ['romance', 'love', 'romantic'],
        'Fantasy': ['fantasy', 'magic', 'isekai'],
        'Drama': ['drama', 'emotional', 'serious'],
        'Sci-Fi': ['sci-fi', 'science', 'space'],
        'Adventure': ['adventure', 'journey'],
        'Mystery': ['mystery', 'detective'],
        'Horror': ['horror', 'scary'],
        'Sports': ['sports', 'game']
    };

    Object.entries(genreKeywords).forEach(([genre, keywords]) => {
        if (keywords.some(keyword => lowerMsg.includes(keyword))) {
            genres.push(genre);
        }
    });

    // If no genres found, use profile or defaults
    if (genres.length === 0) {
        if (profile) {
            const topGenres = profile.getTopGenres(2).map(g => g.genre);
            genres = topGenres.length > 0 ? topGenres : ['Action', 'Adventure'];
        } else {
            genres = ['Action', 'Adventure'];
        }
    }

    // 🆕 Adjust limit based on message
    if (lowerMsg.includes('few') || lowerMsg.includes('couple') || lowerMsg.includes('2-3')) {
        limit = 3;
    } else if (lowerMsg.includes('several') || lowerMsg.includes('bunch') || lowerMsg.includes('variety')) {
        limit = 8;
    }

    // Remove duplicates
    genres = [...new Set(genres)];

    return { intent, genres, confidence, limit };
}

function rankByAdaptiveScore(animeList, profile, intent, userMessage) {
    if (!profile || animeList.length === 0) {
        return animeList.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
    }

    // 🆕 Check if user wants unique anime
    const wantsUnique = isUniqueAnimeRequest(userMessage);

    return animeList.map(anime => {
        let score = (anime.averageScore || 60) / 10;

        // 🆕 Penalize very popular anime for unique requests
        if (wantsUnique && anime.popularity) {
            score -= anime.popularity / 5000; // Reduce score for popular anime
        }

        if (anime.genres) {
            anime.genres.forEach(genre => {
                const genreData = profile.tasteVectors.genres.get(genre);
                if (genreData) {
                    score += genreData.weight * 2;
                    score += genreData.confidence;
                }
            });
        }

        // 🆕 Boost newer anime for discovery
        const currentYear = new Date().getFullYear();
        const year = anime.seasonYear || anime.startDate?.year || currentYear - 1;
        const yearDiff = currentYear - year;
        if (yearDiff <= 2) score += 1; // Boost recent anime

        // 🆕 Penalize recently recommended anime
        const recentIds = profile.getRecentRecommendationIds();
        if (recentIds.includes(anime.id?.toString())) {
            score -= 2; // Strong penalty for recently recommended
        }

        if (intent === 'random') {
            score += Math.random() * 2; // Add randomness for random requests
        }

        // 🆕 Bonus for matching user's favorite topics
        const lowerTitle = (anime.title?.english || anime.title?.romaji || '').toLowerCase();
        profile.interactionStats.favoriteTopics.forEach(topic => {
            if (lowerTitle.includes(topic) || (anime.description || '').toLowerCase().includes(topic)) {
                score += 1.5;
            }
        });

        return { ...anime, adaptiveScore: score };
    })
        .sort((a, b) => b.adaptiveScore - a.adaptiveScore);
}

// ============================================
// 🎬 ANIME FETCH (OPTIMIZED)
// ============================================
async function fetchAnimeByGenres(genres, limit = 12) {
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
                    coverImage { large extraLarge }
                    averageScore
                    episodes
                    description
                    genres
                    seasonYear
                    popularity
                    startDate { year month day }
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
// 🎯 UPDATED MAIN ENDPOINT
// ============================================
router.post("/chat", async (req, res) => {
    const { message: userMessage, userId } = req.body;

    console.log(`💬 User ${userId || 'guest'}: "${userMessage}"`);

    // 1. Get adaptive profile WITH DATABASE SYNC
    let adaptiveProfile = null;
    let userProfileData = null;
    let baseUrl = `${req.protocol}://${req.get("host")}`;

    if (userId) {
        if (!adaptiveProfiles.has(userId)) {
            adaptiveProfiles.set(userId, new AdaptiveUserProfile(userId));
        }
        adaptiveProfile = adaptiveProfiles.get(userId);

        // 🆕 SYNC WITH DATABASE PROFILE
        try {
            const userRes = await axios.get(
                `${baseUrl}/api/profile/${userId}`,
                {
                    headers: {
                        Authorization: req.headers.authorization || "",
                        "Content-Type": "application/json"
                    }
                }
            );
            userProfileData = userRes.data;

            // Update taste based on user's favorite genres
            if (userProfileData.profile?.favoriteGenres) {
                userProfileData.profile.favoriteGenres.forEach(genre => {
                    if (genre.name && !adaptiveProfile.tasteVectors.genres.has(genre.name)) {
                        adaptiveProfile.tasteVectors.genres.set(genre.name, {
                            weight: 0.7 + (genre.percentage / 100 * 0.3),
                            confidence: 0.8,
                            interactions: 3,
                            lastUpdated: Date.now()
                        });
                    }
                });
            }

            console.log(`📊 Synced profile for ${userId}: ${userProfileData.profile?.favoriteGenres?.length || 0} favorite genres`);
        } catch (err) {
            console.log("No detailed profile available or sync failed:", err.message);
        }
    }

    // 2. Get user history
    let userHistory = null;
    if (userId && adaptiveProfile) {
        try {
            const listRes = await axios.get(
                `${baseUrl}/api/list/${userId}`,
                {
                    headers: {
                        Authorization: req.headers.authorization || "",
                        "Content-Type": "application/json"
                    }
                }
            );
            userHistory = listRes.data;

            // Update profile from watched anime
            if (userHistory.completed) {
                userHistory.completed.slice(0, 10).forEach(anime => {
                    adaptiveProfile.updateFromAnime(anime, 'completed');
                });
            }
            if (userHistory.watching) {
                userHistory.watching.slice(0, 5).forEach(anime => {
                    adaptiveProfile.updateFromAnime(anime, 'watched');
                });
            }
        } catch (err) {
            console.log("No user history available:", err.message);
        }
    }

    // 3. Check for anime request
    const lowerMsg = userMessage.toLowerCase();
    const isAskingForAnime =
        lowerMsg.includes("recommend") ||
        lowerMsg.includes("suggest") ||
        lowerMsg.includes("find") ||
        lowerMsg.includes("what should") ||
        lowerMsg.includes("random") ||
        lowerMsg.includes("give me") ||
        lowerMsg.includes("looking for") ||
        isSingleAnimeRequest(userMessage);

    let recommendations = null;
    if (isAskingForAnime) {
        console.log("🎬 Fetching adaptive recommendations...");
        recommendations = await getAdaptiveRecommendations(
            userMessage,
            adaptiveProfile,
            userHistory
        );
    }

    // 4. Get AI response WITH recommendations data
    const aiReply = await getAdaptiveOpenRouterResponse(
        userMessage,
        userId,
        adaptiveProfile,
        {
            userHistory,
            userProfile: userProfileData // 🆕 Pass the full profile object
        },
        recommendations
    );

    // 5. Prepare response
    const response = {
        reply: aiReply,
        anime: recommendations?.anime || [],
        context: {
            mood: adaptiveProfile?.personality?.mood || 'neutral',
            personality: adaptiveProfile?.personality?.current || 'enthusiastic_otaku',
            engagement: adaptiveProfile?.interactionStats?.engagementScore || 0.5,
            intent: recommendations?.intent || 'chat',
            confidence: recommendations?.confidence || 0,
            limit: recommendations?.limit || 0,
            userHasHistory: !!(userHistory?.completed?.length > 0)
        }
    };

    console.log(`🤖 Response ready with ${response.anime.length} anime (limit: ${response.context.limit})`);
    res.json(response);
});

// ============================================
// 🧹 CLEANUP
// ============================================
setInterval(() => {
    const now = Date.now();
    for (const [userId, profile] of adaptiveProfiles.entries()) {
        if (now - profile.lastUpdated > 7 * 24 * 60 * 60 * 1000) {
            adaptiveProfiles.delete(userId);
        }
    }
}, 60 * 60 * 1000);

export default router;