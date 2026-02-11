// routes/anilistRoute.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

const ANILIST_URL = "https://graphql.anilist.co";

const axiosConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://anilist.co',
    'Referer': 'https://anilist.co',
    'User-Agent': 'Mozilla/5.0'
  }
};

// Cache - initialized immediately
let heroCache = { data: null, timestamp: 0 };
const HERO_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Helper to fetch from AniList
async function fetchAniList(query, variables = {}) {
  try {
    const response = await axios.post(
      ANILIST_URL,
      { query, variables },
      axiosConfig
    );
    return response.data.data;
  } catch (error) {
    console.error("AniList API error:", error.message);
    throw error;
  }
}

// Main fetch function used by cache warm-up and route
const fetchHeroAnime = async () => {
  // Fetch from three different statuses for diversity
  const releasingQuery = `
      query {
        Page(page: 1, perPage: 30) {
          media(sort: [TRENDING_DESC, POPULARITY_DESC], type: ANIME, status: RELEASING, isAdult: false) {
            id
            idMal
            title { romaji english native }
            description(asHtml: false)
            status
            season
            seasonYear
            episodes
            averageScore
            popularity
            bannerImage
            coverImage { large extraLarge medium }
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

  const finishedQuery = `
      query {
        Page(page: 1, perPage: 30) {
          media(sort: [SCORE_DESC, POPULARITY_DESC], type: ANIME, status: FINISHED, isAdult: false, averageScore_greater: 70) {
            id
            idMal
            title { romaji english native }
            description(asHtml: false)
            status
            season
            seasonYear
            episodes
            averageScore
            popularity
            bannerImage
            coverImage { large extraLarge medium }
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

  const upcomingQuery = `
      query {
        Page(page: 1, perPage: 30) {
          media(sort: [POPULARITY_DESC, TRENDING_DESC], type: ANIME, status: NOT_YET_RELEASED, isAdult: false) {
            id
            idMal
            title { romaji english native }
            description(asHtml: false)
            status
            season
            seasonYear
            episodes
            averageScore
            popularity
            bannerImage
            coverImage { large extraLarge medium }
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

  try {
    console.log("Fetching diverse hero trailers data...");

    // Fetch all three categories in parallel
    const [releasingData, finishedData, upcomingData] = await Promise.all([
      fetchAniList(releasingQuery).catch(() => ({ Page: { media: [] } })),
      fetchAniList(finishedQuery).catch(() => ({ Page: { media: [] } })),
      fetchAniList(upcomingQuery).catch(() => ({ Page: { media: [] } }))
    ]);

    const releasingMedia = releasingData?.Page?.media || [];
    const finishedMedia = finishedData?.Page?.media || [];
    const upcomingMedia = upcomingData?.Page?.media || [];

    console.log(`Raw counts - Releasing: ${releasingMedia.length}, Finished: ${finishedMedia.length}, Upcoming: ${upcomingMedia.length}`);

    // Filter for high quality results with trailers
    const filterAnime = (anime) => {
      const hasTrailer = anime.trailer?.id && anime.trailer?.site === 'youtube';
      const hasImage = anime.bannerImage || anime.coverImage?.extraLarge;
      const hasTitle = anime.title?.english || anime.title?.romaji;
      return hasTrailer && hasImage && hasTitle;
    };

    const releasingFiltered = releasingMedia.filter(filterAnime);
    const finishedFiltered = finishedMedia.filter(filterAnime);
    const upcomingFiltered = upcomingMedia.filter(filterAnime);

    console.log(`Filtered counts - Releasing: ${releasingFiltered.length}, Finished: ${finishedFiltered.length}, Upcoming: ${upcomingFiltered.length}`);

    // Take equal amounts from each category (or as many as available)
    const perCategory = 10;
    const releasing = releasingFiltered.slice(0, perCategory);
    const finished = finishedFiltered.slice(0, perCategory);
    const upcoming = upcomingFiltered.slice(0, perCategory);

    // Combine and shuffle for variety
    const combined = [...releasing, ...finished, ...upcoming];
    const shuffled = combined.sort(() => Math.random() - 0.5);

    // Add display helper fields
    const enhanced = shuffled.map(anime => ({
      ...anime,
      displayTitle: anime.title.english || anime.title.romaji || anime.title.native,
      mainStudio: anime.studios?.nodes?.find(s => s.isAnimationStudio)?.name || 'Unknown Studio'
    }));

    console.log(`Final hero anime count: ${enhanced.length} (balanced mix)`);

    return enhanced;
  } catch (error) {
    console.error("Error in fetchHeroAnime:", error.message);
    return [];
  }
};

// Warm up cache on server start
const warmUpCache = async () => {
  try {
    const data = await fetchHeroAnime();
    if (data.length > 0) {
      heroCache = { data, timestamp: Date.now() };
      console.log("Hero cache warmed up successfully!");
    }
  } catch (err) {
    console.error("Failed to warm up hero cache:", err);
  }
};

// Start warming up immediately (fire and forget)
warmUpCache();

router.get("/hero-trailers", async (req, res) => {
  const now = Date.now();

  // 1. Try Memory Cache
  if (heroCache.data && heroCache.data.length > 0 && now - heroCache.timestamp < HERO_TTL) {
    return res.json(heroCache.data);
  }

  // 2. Fetch Fresh
  const freshData = await fetchHeroAnime();

  // 3. Update Cache & Respond
  if (freshData.length > 0) {
    heroCache = { data: freshData, timestamp: now };
    return res.json(freshData);
  }

  // 4. Fallback: Return stale cache if available, else empty
  if (heroCache.data && heroCache.data.length > 0) {
    console.log("Returning stale cache due to fetch failure");
    return res.json(heroCache.data);
  }

  res.json([]);
});

// Debug endpoint 
router.get("/hero-trailers/debug", (req, res) => {
  const now = Date.now();
  res.json({
    hasData: !!heroCache.data,
    count: heroCache.data?.length || 0,
    ageMinutes: heroCache.timestamp ? (now - heroCache.timestamp) / 60000 : 0,
    expired: now - heroCache.timestamp > HERO_TTL
  });
});

// Refresh endpoint
router.post("/hero-trailers/refresh", async (req, res) => {
  try {
    const data = await fetchHeroAnime();
    if (data.length > 0) {
      heroCache = { data, timestamp: Date.now() };
      res.json({ success: true, count: data.length });
    } else {
      res.status(500).json({ success: false, error: "No data fetched" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;