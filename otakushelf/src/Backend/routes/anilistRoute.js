// routes/anilistRoute.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

const axiosConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://anilist.co',
    'Referer': 'https://anilist.co',
    'User-Agent': 'Mozilla/5.0'
  }
};

// simple in-memory cache (10 minutes)
let sequelsCache = { data: null, timestamp: 0 };
const SEQUELS_TTL = 10 * 60 * 1000;

router.get("/latest-sequels", async (req, res) => {
  try {
    const now = Date.now();
    if (sequelsCache.data && now - sequelsCache.timestamp < SEQUELS_TTL) {
      return res.json(sequelsCache.data);
    }

    const query = `
      query {
        Page(perPage: 20) {
          media(
            sort: UPDATED_AT_DESC,
            type: ANIME,
            isAdult: false,
            status_in: [NOT_YET_RELEASED, RELEASING]
          ) {
            id
            title { romaji english }
            description(asHtml: false)
            startDate { year month day }
            status
            season
            seasonYear
            episodes
            averageScore
            popularity
            bannerImage
            coverImage { large extraLarge }
            genres
            studios { nodes { name isAnimationStudio } }
            nextAiringEpisode { episode }
            updatedAt
          }
        }
      }
    `;

    const response = await axios.post('https://graphql.anilist.co', { query }, axiosConfig);
    const media = response.data?.data?.Page?.media || [];

    // keep only items with imagery + description
    const filtered = media.filter(anime =>
      (anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large) && anime.description
    ).slice(0, 10);

    // add small helpers the frontend expects
    const enhanced = filtered.map(anime => ({
      ...anime,
      displayTitle: anime.title?.english || anime.title?.romaji,
      mainStudio: anime.studios?.nodes?.find(s => s.isAnimationStudio)?.name || 'Unknown Studio',
      hasNextEpisode: !!anime.nextAiringEpisode
    }));

    sequelsCache = { data: enhanced, timestamp: now };
    res.json(enhanced);
  } catch (err) {
    console.error("Error fetching sequels from AniList:", err.message);
    res.status(500).json({ error: "Failed to fetch latest sequels." });
  }
});

export default router;
