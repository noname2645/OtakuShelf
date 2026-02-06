import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/* =========================
   1. AniList GraphQL Fetch
   ========================= */
async function fetchAnimeContext(search) {
    const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        title {
          romaji
          english
        }
        description
        genres
        averageScore
        popularity
        episodes
        duration
        season
        seasonYear
        status
        format
        coverImage {
          extraLarge
          large
          medium
        }
        bannerImage
        characters(sort: RELEVANCE, perPage: 5) {
          nodes {
            name {
              full
            }
            description
          }
        }
        recommendations(perPage: 5) {
          nodes {
            mediaRecommendation {
              title {
                english
                romaji
              }
              coverImage {
                large
              }
            }
          }
        }
      }
    }
  `;

    try {
        const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query,
                variables: { search }
            })
        });

        const json = await res.json();
        return json?.data?.Media || null;
    } catch (error) {
        console.error("AniList fetch error:", error);
        return null;
    }
}

/* =========================
   2. Prompt Builder (RAG) - Anime Specific
   ========================= */
function buildPrompt(userQuery, animeData) {
    if (!animeData) {
        return `
You are an anime assistant named OtakuAI.
The user is asking about an anime but data was NOT found in AniList.
Say clearly that the information is unavailable, but still try to help with the query.
Be friendly and helpful.

User Question: "${userQuery}"

Response Guidelines:
1. Be concise but informative
2. If you know general info about the anime, share it but clarify it's not from official sources
3. Offer to help with other anime questions
`;
    }

    return `
You are OtakuAI, an expert anime assistant.

Use ONLY the following official data from AniList.
Do NOT invent facts. If information is missing, say "Not available in AniList data".

IMPORTANT: Format your response naturally, conversationally, and use markdown for readability.

ANIME DATA:
Title: ${animeData.title.english || animeData.title.romaji}
Description: ${animeData.description ? animeData.description.replace(/<[^>]*>/g, '') : 'No description'}
Genres: ${animeData.genres.join(", ")}
Average Score: ${animeData.averageScore}/100
Popularity: ${animeData.popularity} (higher = more popular)
Episodes: ${animeData.episodes || 'Unknown'}
Duration: ${animeData.duration || 'Unknown'} minutes per episode
Status: ${animeData.status || 'Unknown'}
Format: ${animeData.format || 'Unknown'}
Season: ${animeData.season || 'Unknown'} ${animeData.seasonYear || ''}

Main Characters:
${animeData.characters.nodes
            .map(
                c =>
                    `- **${c.name.full}**: ${c.description ? c.description.replace(/<[^>]*>/g, '').slice(0, 200) : "No description available"
                    }`
            )
            .join("\n")}

${animeData.recommendations?.nodes?.length > 0 ? `
Similar Anime Recommendations:
${animeData.recommendations.nodes
                .slice(0, 3)
                .map(
                    r =>
                        `- **${r.mediaRecommendation.title.english || r.mediaRecommendation.title.romaji}**`
                )
                .join("\n")}
` : ''}

USER QUESTION:
"${userQuery}"

RESPONSE GUIDELINES:
1. Answer directly and accurately based on the data above
2. Use natural, conversational language
3. Format with markdown:
   - **ALWAYS** bold anime titles (e.g. **Naruto**) to show cover images
   - Use bullet points for lists
4. If the question isn't covered by the data, politely say so
5. End with a friendly follow-up question
6. Keep response under 400 words
`;
}

/* =========================
   3. General Prompt Builder
   ========================= */
function buildGeneralPrompt(userQuery, animeData, history = [], context = {}) {
    const mood = context.mood || 'neutral';

    // Build history context
    const historyContext = history.length > 0 ? `
Previous conversation context (last ${Math.min(history.length, 5)} messages):
${history.slice(-5).map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')}
` : '';

    if (!animeData) {
        return `
You are OtakuAI, a friendly anime companion. Your personality is ${mood}.

${historyContext}

User's current message: "${userQuery}"

Your task:
1. Provide helpful, accurate information about anime
2. If you don't know something, admit it
3. Use natural, conversational language
4. Format with light markdown (bold for titles, lists for multiple items)
5. If recommending anime, include brief reasons why
6. Ask follow-up questions to keep conversation flowing
7. No need to greet every single response. ONLY greet at first response.

Response guidelines:
- Be concise but informative
- Max 300 words
- End with a relevant question or suggestion
- Emoji use: occasional, not excessive
`;
    }

    // If we have anime data, use it
    return `
You are OtakuAI, an anime expert assistant also the user's personal anime companion.

ANIME DATA (from AniList):
Title: ${animeData.title.english || animeData.title.romaji}
Genres: ${animeData.genres.join(", ")}
Score: ${animeData.averageScore}/100
Description: ${animeData.description ? animeData.description.replace(/<[^>]*>/g, '').slice(0, 300) + '...' : 'No description'}

${historyContext}

User Question: "${userQuery}"

Instructions:
You are an anime assistant operating in Retrieval-Augmented Generation (RAG) mode.

SOURCE OF TRUTH:
- The provided anime data is the ONLY source for factual information.
- Do NOT invent plot details, characters, abilities, or events.
- If a fact is not present in the data, do NOT guess or fabricate it.

ALLOWED ADDITIONS:
- You MAY add high-level anime culture or trope commentary
  (e.g., tone, genre appeal, audience type),
  but ONLY if it does not introduce new factual claims.
- Any suggestions beyond the provided data must be framed as
  GENERAL RECOMMENDATIONS, not confirmed facts.

RECOMMENDATIONS:
- Use a bulleted list (- ) for recommendations.
- ALWAYS bold anime titles (e.g., **Naruto**, **Attack on Titan**).
- Suggest 2-3 similar anime ONLY when it makes sense.
- Do NOT claim shared plot elements unless present in the data.

STYLE:
- Friendly
- Chill, homie-like
- Confident anime-fan tone
- No corporate or chatbot phrasing

FORMAT:
- Use Markdown for readability.
- Keep answers clear and skimmable.
- No emojis unless explicitly requested.

CONSTRAINTS:
- Do NOT apologize for missing data.
- Do NOT mention AniList or data sources.
- Do NOT present opinions as facts.
- Do NOT recommend anime unless the user has asked for it.
- Do NOT provide any personal information.
- Do NOT provide any contact information.
- Do NOT provide anime recommendation cards when you are explaining one anime to the user.

END EVERY RESPONSE:
- End with ONE casual question to continue the conversation.
`;
}

/* =========================
   4. Mistral API Call
   ========================= */
async function askMistral(prompt, streaming = false) {
    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
        throw new Error("MISTRAL_API_KEY is not configured");
    }

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "mistral-small-latest",
            temperature: 0.7,
            max_tokens: 1000,
            top_p: 0.9,
            messages: [
                {
                    role: "system",
                    content: "You are OtakuAI, a friendly anime expert assistant. You help users with anime recommendations, information, and discussions. Use markdown for formatting."
                },
                { role: "user", content: prompt }
            ],
            ...(streaming && { stream: true })
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error("Mistral API error:", errorText);
        throw new Error(`Mistral API error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();

    if (!json.choices || !json.choices.length) {
        throw new Error("Mistral API returned no choices");
    }

    return json.choices[0].message.content;
}

/* =========================
   5. Helper Functions
   ========================= */
function extractAnimeFromMessage(message) {
    // Common anime keywords and titles
    const animeTitles = [
        // Popular anime for detection
        'naruto', 'one piece', 'attack on titan', 'demon slayer',
        'jujutsu kaisen', 'my hero academia', 'death note', 'fullmetal alchemist',
        'bleach', 'dragon ball', 'one punch man', 'tokyo ghoul', 'hunter x hunter',
        'code geass', 'steins gate', 'cowboy bebop', 'neon genesis evangelion',
        'your name', 'spirited away', 'clannad', 'angel beats'
    ];

    const lowerMessage = message.toLowerCase();
    const words = lowerMessage.split(/\s+/);

    // Look for anime titles in the message
    const foundAnime = [];

    for (const title of animeTitles) {
        if (lowerMessage.includes(title)) {
            foundAnime.push(title);
        }
    }

    // Also look for words that often accompany anime requests
    const animeKeywords = ['anime', 'show', 'series', 'manga', 'episode', 'season', 'arc'];
    const hasAnimeKeyword = animeKeywords.some(keyword => lowerMessage.includes(keyword));

    // If no specific anime found but message is about anime in general
    if (foundAnime.length === 0 && hasAnimeKeyword) {
        // Try to extract potential anime name (words after "about" or "called")
        const aboutMatch = lowerMessage.match(/(?:about|called|named)\s+([a-zA-Z\s]{3,})/);
        if (aboutMatch && aboutMatch[1]) {
            const potentialAnime = aboutMatch[1].trim();
            if (potentialAnime.length > 2) {
                foundAnime.push(potentialAnime);
            }
        }
    }

    return foundAnime;
}

function detectMood(response) {
    const lowerResponse = response.toLowerCase();

    if (lowerResponse.includes('!') || lowerResponse.includes('awesome') || lowerResponse.includes('amazing')) {
        return 'excited';
    }
    if (lowerResponse.includes('sorry') || lowerResponse.includes('unfortunately') || lowerResponse.includes('cannot')) {
        return 'apologetic';
    }
    if (lowerResponse.includes('recommend') || lowerResponse.includes('suggest') || lowerResponse.includes('try')) {
        return 'helpful';
    }

    return 'neutral';
}

function generateFollowups(userMessage, aiResponse) {
    const followups = [];
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
        followups.push(
            "What genre should I focus on?",
            "Any specific mood you're looking for?",
            "Should I recommend based on your watch history?"
        );
    } else if (lowerMessage.includes('character')) {
        followups.push(
            "Want to know about other characters?",
            "Should I explain their backstory?",
            "Interested in voice actors?"
        );
    } else if (lowerMessage.includes('watch next') || lowerMessage.includes('what to watch')) {
        followups.push(
            "Based on similar anime",
            "Something completely different",
            "A hidden gem recommendation"
        );
    } else {
        followups.push(
            "Want to know more about this anime?",
            "Should I recommend similar shows?",
            "Any other anime questions?"
        );
    }

    return followups.slice(0, 3); // Return max 3 followups
}

async function extractAnimeRecommendations(response) {
    const recommendations = [];

    // Look for anime mentions in the response
    // We look for bold text which indicates important entities in our prompt instructions
    const animePattern = /\*\*([^*]+)\*\*/g;
    let match;
    const uniqueTitles = new Set();

    // 1. Extract potential titles
    while ((match = animePattern.exec(response)) !== null) {
        const potentialAnime = match[1].trim();

        // Filter out obvious non-anime bold text
        const lower = potentialAnime.toLowerCase();
        if (potentialAnime.length > 2 &&
            !lower.includes('score') &&
            !lower.includes('rating') &&
            !lower.includes('character') &&
            !lower.includes('genre') &&
            !lower.includes('note') &&
            !lower.includes('warning') &&
            !lower.includes('absolutely') &&
            !lower.includes('sure') &&
            !lower.includes('here') &&
            !lower.includes('recommend') &&
            !lower.includes('of course') &&
            !lower.includes('yes') &&
            !lower.includes('no') &&
            !lower.includes('absolutely') &&
            !lower.includes('definitely') &&
            !lower.includes('thank') &&
            !uniqueTitles.has(lower)) {
            uniqueTitles.add(lower);
        }
    }

    // 2. Limit to first 10 unique potential titles to avoid spamming the API too much but allow more recs
    const potentialList = Array.from(uniqueTitles).slice(0, 10);

    // 3. Verify with AniList and check if title matches query (Similarity Check)
    const isSimilarTitle = (query, result) => {
        if (!result || !result.title) return false;

        const normQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normEnglish = (result.title.english || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const normRomaji = (result.title.romaji || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        // 1. Exact/Substring match on normalized strings
        if (normEnglish.includes(normQuery) || normQuery.includes(normEnglish)) return true;
        if (normRomaji.includes(normQuery) || normQuery.includes(normRomaji)) return true;

        // 2. Word overlap (at least one significant word matches)
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const allTitleText = (result.title.english + ' ' + result.title.romaji).toLowerCase();

        // Check if any word from query exists in title
        return queryWords.some(w => allTitleText.includes(w));
    };

    const verificationPromises = potentialList.map(async (title) => {
        try {
            const data = await fetchAnimeContext(title);

            // STRICT VERIFICATION: Found data AND title is similar to query
            if (data && isSimilarTitle(title, data)) {
                return {
                    id: data.id,
                    title: data.title, // Keep full title object
                    coverImage: data.coverImage,
                    bannerImage: data.bannerImage,
                    description: data.description,
                    genres: data.genres,
                    averageScore: data.averageScore,
                    episodes: data.episodes,
                    format: data.format,
                    status: data.status,
                    studios: data.studios || null,
                    ...data
                };
            }
            return null;
        } catch (e) {
            console.error(`Failed to verify recommendation: ${title}`, e);
            return null;
        }
    });

    const results = await Promise.all(verificationPromises);

    // Filter out nulls (failed lookups or false positives)
    return results.filter(item => item !== null);
}

/* =========================
   6. Express Routes
   ========================= */

// Route 1: Anime-specific chat (uses RAG)
router.post("/anime-chat", async (req, res) => {
    try {
        const { query, anime } = req.body;

        if (!query || !anime) {
            return res.status(400).json({
                error: "query and anime fields are required"
            });
        }

        // 1️⃣ Fetch canonical anime data
        const animeData = await fetchAnimeContext(anime);

        // 2️⃣ Build controlled prompt
        const prompt = buildPrompt(query, animeData);

        // 3️⃣ Ask Mistral
        const answer = await askMistral(prompt);

        res.json({
            answer,
            source: "AniList + Mistral",
            hasData: !!animeData
        });

    } catch (err) {
        console.error("AI Chat Error:", err);
        res.status(500).json({
            error: "Failed to generate response",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Route 2: General AI Chat (for frontend aipage.jsx)
router.post("/chat", async (req, res) => {
    try {
        const { message, history = [], context = {}, userId } = req.body;

        if (!message) {
            return res.status(400).json({
                error: "message field is required"
            });
        }

        console.log(`AI Chat request from user ${userId || 'anonymous'}:`, message.substring(0, 100));

        // Extract anime mentions from the message
        const animeMentions = extractAnimeFromMessage(message);

        let animeData = null;
        let mentionedAnime = null;

        if (animeMentions.length > 0) {
            // Get data for the first mentioned anime
            mentionedAnime = animeMentions[0];
            animeData = await fetchAnimeContext(mentionedAnime);
            console.log(`Found anime mention: ${mentionedAnime}, data: ${animeData ? 'yes' : 'no'}`);
        }

        // Build dynamic prompt
        const prompt = buildGeneralPrompt(message, animeData, history, context);

        // Ask Mistral
        const reply = await askMistral(prompt);

        // Extract any anime recommendations from the response
        const recommendedAnime = await extractAnimeRecommendations(reply);

        // Generate follow-up suggestions
        const suggestions = generateFollowups(message, reply);

        // Detect mood
        const mood = detectMood(reply);

        const responseData = {
            reply,
            anime: recommendedAnime,
            context: {
                mood,
                suggestions,
                mentionedAnime: mentionedAnime || null,
                hasAnimeData: !!animeData
            },
            timestamp: new Date().toISOString()
        };

        console.log(`AI Chat response sent, mood: ${mood}, suggestions: ${suggestions.length}`);

        res.json(responseData);

    } catch (err) {
        console.error("General Chat Error:", err);
        res.status(500).json({
            error: "Failed to generate response",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Route 3: Health check
router.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "AI Chat",
        model: "Mistral",
        timestamp: new Date().toISOString()
    });
});

// Route 4: Get anime info (for testing)
router.post("/anime-info", async (req, res) => {
    try {
        const { anime } = req.body;

        if (!anime) {
            return res.status(400).json({ error: "anime field is required" });
        }

        const animeData = await fetchAnimeContext(anime);

        if (!animeData) {
            return res.status(404).json({ error: "Anime not found" });
        }

        res.json({
            title: animeData.title.english || animeData.title.romaji,
            description: animeData.description ? animeData.description.replace(/<[^>]*>/g, '') : 'No description',
            genres: animeData.genres,
            score: animeData.averageScore,
            episodes: animeData.episodes,
            coverImage: animeData.coverImage?.large || null
        });
    } catch (err) {
        console.error("Anime info error:", err);
        res.status(500).json({ error: "Failed to fetch anime info" });
    }
});

export default router;