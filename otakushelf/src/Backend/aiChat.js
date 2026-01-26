import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const ANILIST_URL = "https://graphql.anilist.co";

async function fetchAnimeByGenres(genres, limit = 10) {
  const query = `
    query ($genres: [String], $perPage: Int) {
      Page(perPage: $perPage) {
        media(
          type: ANIME,
          genre_in: $genres,
          sort: POPULARITY_DESC
        ) {
          id
          title {
            romaji
          }
          coverImage {
            large
          }
          averageScore
          episodes
        }
      }
    }
  `;

  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: {
        genres,
        perPage: limit,
      },
    }),
  });

  const data = await res.json();
  return data?.data?.Page?.media || [];
}


// ✅ HF FastAPI endpoint (NOT Gradio)
const HF_AI_URL =
  "https://oceandiver2789-otakushelf-ai.hf.space/intent";

router.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  // 🧠 DEFAULT FALLBACK INTENT (never crash)
  let intent = {
    genres: [],
    mood: "neutral",
    pacing: "medium",
  };

  /* ================================
     1️⃣ CALL HF AI INTENT ENGINE
     ================================ */
  try {
    const aiRes = await fetch(HF_AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
    });

    const aiData = await aiRes.json();

    console.log("HF RAW RESPONSE:", aiData);

    if (aiData && typeof aiData.intent === "string") {
      const text = aiData.intent;

      // 🔒 Extract FIRST valid JSON object only
      const match = text.match(/\{[\s\S]*?\}/);

      if (match) {
        intent = JSON.parse(match[0]);
      } else {
        console.error("❌ No JSON found in AI response");
      }
    }
  } catch (err) {
    console.error("❌ HF AI error:", err.message);
  }

  /* ================================
     2️⃣ FETCH ANIME FROM ANILIST
     ================================ */

  let animeList = [];

  try {
    if (intent.genres.length > 0) {
      animeList = await fetchAnimeByGenres(intent.genres, 10);
    }
  } catch (err) {
    console.error("❌ AniList fetch error:", err.message);
  }


  /* ================================
     3️⃣ SEND RESPONSE TO FRONTEND
     ================================ */

  res.json({
    reply: `I picked these based on your vibe: ${intent.genres.join(", ")}`,
    anime: animeList,
  });

});

export default router;
