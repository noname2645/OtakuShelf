import express from "express";
import fetch from "node-fetch";
import axios from "axios";

const router = express.Router();

const ANILIST_URL = "https://graphql.anilist.co";
const HF_AI_URL = "https://oceandiver2789-otakushelf-ai.hf.space/intent";

async function fetchAnimeByGenres(genres, excludedGenres = [], limit = 10) {
  const query = `
    query ($genres: [String], $excludedGenres: [String], $perPage: Int) {
      Page(perPage: $perPage) {
        media(
          type: ANIME,
          genre_in: $genres,
          genre_not_in: $excludedGenres,
          sort: POPULARITY_DESC
        ) {
          id
          title { romaji }
          coverImage { large }
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
        excludedGenres,
        perPage: limit,
      },
    }),
  });

  const data = await res.json();
  return data?.data?.Page?.media || [];
}


router.post("/chat", async (req, res) => {
  const { message: userMessage, userId } = req.body;

  let intent = {
    includeGenres: [],
    excludeGenres: [],
    mood: "neutral",
    pacing: "medium",
  };


  // 1️⃣ AI INTENT
  try {
    const aiRes = await fetch(HF_AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
    });

    const aiData = await aiRes.json();

    // ✅ NEW HF FORMAT (preferred)
    if (Array.isArray(aiData.includeGenres)) {
      intent = {
        includeGenres: aiData.includeGenres,
        excludeGenres: aiData.excludeGenres || [],
        mood: aiData.mood || "neutral",
        pacing: aiData.pacing || "medium",
      };
    }


    if (typeof aiData.intent === "string") {
      const match = aiData.intent.match(/\{[\s\S]*?\}/);
      if (match) intent = JSON.parse(match[0]);
    }
  } catch (err) {
    console.error("❌ HF AI error:", err.message);
  }

  // 2️⃣ USER LIST PERSONALIZATION
  let completedIds = [];
  let droppedIds = [];

  if (userId) {
    try {
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const listRes = await axios.get(
        `${baseUrl}/api/list/${userId}`,
        {
          headers: {
            Authorization: req.headers.authorization || ""
          }
        }
      );

      const list = listRes.data;
      completedIds = (list.completed || []).map(a => a.animeId || a._id);
      droppedIds = (list.dropped || []).map(a => a.animeId || a._id);
    } catch (err) {
      console.error("⚠️ Failed to fetch user list:", err.message);
    }
  }

  // 3️⃣ ANILIST FETCH
  let animeList = [];
  try {
    if (intent.includeGenres.length > 0) {
      animeList = await fetchAnimeByGenres(
        intent.includeGenres,
        intent.excludeGenres,
        10
      );
    }
  } catch (err) {
    console.error("❌ AniList error:", err.message);
  }

  // 4️⃣ FILTER COMPLETED / DROPPED
  animeList = animeList.filter(
    a => !completedIds.includes(a.id) && !droppedIds.includes(a.id)
  );

  // 5️⃣ RESPONSE
  res.json({
    reply: `I picked these based on your vibe: ${intent.includeGenres.join(", ")}`,
    anime: animeList,
  });
});

export default router;
