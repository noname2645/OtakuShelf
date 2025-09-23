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

// cache results for 24 hours instead of 10 minutes
let heroCache = { data: null, timestamp: 0 };
const HERO_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Function to get a random day of the current year for seasonal variety
const getRandomSeasonalDate = () => {
  const currentYear = new Date().getFullYear();
  const seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  const randomSeason = seasons[Math.floor(Math.random() * seasons.length)];
  
  return { season: randomSeason, seasonYear: currentYear };
};

router.get("/hero-trailers", async (req, res) => {
  try {
    const now = Date.now();
    if (heroCache.data && now - heroCache.timestamp < HERO_TTL) {
      return res.json(heroCache.data);
    }

    // Get random seasonal parameters for variety
    const { season, seasonYear } = getRandomSeasonalDate();

    // Enhanced GraphQL query with multiple sorting options and rating filter
    const query = `
      query ($season: MediaSeason, $seasonYear: Int) {
        Page(perPage: 50) {
          media(
            sort: [POPULARITY_DESC, TRENDING_DESC, SCORE_DESC]
            type: ANIME
            isAdult: false
            status_in: [RELEASING, NOT_YET_RELEASED, FINISHED]
            averageScore_greater: 75
            season: $season
            seasonYear: $seasonYear
          ) {
            id
            title { romaji english native }
            description(asHtml: false)
            status
            season
            seasonYear
            episodes
            averageScore
            popularity
            bannerImage
            coverImage { large extraLarge }
            genres
            format  
            startDate { year month day } 
            endDate { year month day }   
            studios {
              nodes { name isAnimationStudio }
            }
            trailer { id site thumbnail }
          }
        }
      }
    `;

    const variables = {
      season,
      seasonYear
    };

    const response = await axios.post(
      'https://graphql.anilist.co',
      { query, variables },
      axiosConfig
    );

    const media = response.data?.data?.Page?.media || [];

    // filter: must have trailer + banner/cover + minimum 75 rating
    const filtered = media.filter(anime =>
      anime.trailer?.id &&
      anime.trailer?.site?.toLowerCase() === "youtube" &&
      (anime.bannerImage || anime.coverImage?.extraLarge) &&
      anime.averageScore >= 75
    );

    // Shuffle the results for more variety
    const shuffled = filtered.sort(() => Math.random() - 0.5);

    // Take top 30 results
    const limited = shuffled.slice(0, 30);

    // map to frontend-friendly object
    const enhanced = limited.map(anime => ({
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