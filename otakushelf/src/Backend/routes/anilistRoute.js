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

// cache results for 10 mins
let heroCache = { data: null, timestamp: 0 };
const HERO_TTL = 10 * 60 * 1000;

router.get("/hero-trailers", async (req, res) => {
  try {
    const now = Date.now();
    if (heroCache.data && now - heroCache.timestamp < HERO_TTL) {
      return res.json(heroCache.data);
    }

    // GraphQL query
    const query = `
      query {
        Page(perPage: 30) {
          media(
            sort: TRENDING_DESC
            type: ANIME
            isAdult: false
            status_in: [RELEASING, NOT_YET_RELEASED, FINISHED]
          ) {
            id
            title {
              romaji
              english
              native
            }
            description(asHtml: false)
            status
            season
            seasonYear
            episodes
            averageScore
            popularity
            bannerImage
            coverImage {
              large
              extraLarge
            }
            genres
            studios {
              nodes {
                name
                isAnimationStudio
              }
            }
            trailer {
              id
              site
              thumbnail
            }
          }
        }
      }
    `;

    const response = await axios.post(
      'https://graphql.anilist.co',
      { query },
      axiosConfig
    );

    const media = response.data?.data?.Page?.media || [];

    // filter: must have trailer + banner/cover
    const filtered = media.filter(anime =>
      anime.trailer?.id &&
      anime.trailer?.site?.toLowerCase() === "youtube" &&
      (anime.bannerImage || anime.coverImage?.extraLarge)
    );

    // map to frontend-friendly object
    const enhanced = filtered.map(anime => ({
      ...anime,
      displayTitle: anime.title.english || anime.title.romaji,
      mainStudio: anime.studios?.nodes?.find(s => s.isAnimationStudio)?.name || 'Unknown Studio',
    }));

    heroCache = { data: enhanced, timestamp: now };
    res.json(enhanced);

  } catch (err) {
    console.error("Error fetching AniList hero trailers:", err.message);
    res.status(500).json({ error: "Failed to fetch hero trailers." });
  }
});

export default router;
