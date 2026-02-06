// routes/anilistRoute.js - Fixed Version
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

// Reduced cache time and added fallback mechanism
let heroCache = { data: null, timestamp: 0 };
const HERO_TTL = 6 * 60 * 60 * 1000; // 6 hours instead of 24

// Fallback cache for when primary query fails
let fallbackCache = { data: null, timestamp: 0 };

// Multiple query strategies for better reliability
const getQueryStrategies = () => {
  const currentYear = new Date().getFullYear();
  const currentSeason = getCurrentSeason();
  
  return [
    // Strategy 1: Current season with lower score threshold
    {
      name: "Current Season",
      variables: { 
        season: currentSeason, 
        seasonYear: currentYear,
        scoreThreshold: 60
      }
    },
    // Strategy 2: Popular recent anime (last 2 years)
    {
      name: "Recent Popular",
      variables: { 
        startYear: currentYear - 1,
        endYear: currentYear,
        scoreThreshold: 65
      }
    },
    // Strategy 3: All-time popular with trailers (no season restriction)
    {
      name: "All Time Popular",
      variables: { 
        scoreThreshold: 70
      }
    },
    // Strategy 4: Most lenient - just popular anime with trailers
    {
      name: "Most Lenient",
      variables: { 
        scoreThreshold: 50
      }
    }
  ];
};

// Get current season
const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 12 || month <= 2) return 'WINTER';
  if (month >= 3 && month <= 5) return 'SPRING';
  if (month >= 6 && month <= 8) return 'SUMMER';
  return 'FALL';
};

// Build dynamic query based on strategy
const buildQuery = (strategy) => {
  const { variables } = strategy;
  
  // Base query structure
  let queryConditions = [
    'type: ANIME',
    'isAdult: false',
    'status_in: [RELEASING, NOT_YET_RELEASED, FINISHED]'
  ];

  // Add conditional filters based on strategy
  if (variables.season && variables.seasonYear) {
    queryConditions.push(`season: $season`);
    queryConditions.push(`seasonYear: $seasonYear`);
  }
  
  if (variables.startYear && variables.endYear) {
    queryConditions.push(`startDate_greater: "${variables.startYear}-01-01"`);
    queryConditions.push(`startDate_lesser: "${variables.endYear}-12-31"`);
  }

  if (variables.scoreThreshold) {
    queryConditions.push(`averageScore_greater: ${variables.scoreThreshold}`);
  }

  return `
    query ${variables.season ? '($season: MediaSeason, $seasonYear: Int)' : ''} {
      Page(perPage: 100) {
        pageInfo {
          hasNextPage
          total
        }
        media(
          sort: [POPULARITY_DESC, TRENDING_DESC, SCORE_DESC]
          ${queryConditions.join('\n          ')}
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
};

// Try multiple strategies until we get enough results
const fetchAnimeWithStrategies = async () => {
  const strategies = getQueryStrategies();
  
  for (const strategy of strategies) {
    try {
      console.log(`Trying strategy: ${strategy.name}`);
      
      const query = buildQuery(strategy);
      const variables = {};
      
      // Only add variables that are needed for this strategy
      if (strategy.variables.season) variables.season = strategy.variables.season;
      if (strategy.variables.seasonYear) variables.seasonYear = strategy.variables.seasonYear;

      const response = await axios.post(
        'https://graphql.anilist.co',
        { query, variables },
        axiosConfig
      );

      const media = response.data?.data?.Page?.media || [];
      console.log(`${strategy.name} returned ${media.length} results`);

      // More lenient filtering - prioritize having trailers
      const filtered = media.filter(anime => {
        // Must have trailer
        const hasTrailer = anime.trailer?.id && anime.trailer?.site;
        
        // Must have image (banner OR cover)
        const hasImage = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large;
        
        // More lenient score requirement (allow null scores for newer anime)
        const hasDecentScore = !anime.averageScore || anime.averageScore >= 50;
        
        // Must have basic info
        const hasBasicInfo = anime.title && (anime.title.english || anime.title.romaji);
        
        return hasTrailer && hasImage && hasDecentScore && hasBasicInfo;
      });

      console.log(`After filtering: ${filtered.length} results`);

      // If we have enough results, use this strategy
      if (filtered.length >= 10) {
        // Shuffle and take top results
        const shuffled = filtered.sort(() => Math.random() - 0.5);
        const limited = shuffled.slice(0, 50); // Increased from 30 to 50

        return limited.map(anime => ({
          ...anime,
          displayTitle: anime.title.english || anime.title.romaji || anime.title.native,
          mainStudio: anime.studios?.nodes?.find(s => s.isAnimationStudio)?.name || 'Unknown Studio',
          strategy: strategy.name // Debug info
        }));
      }

    } catch (error) {
      console.error(`Strategy ${strategy.name} failed:`, error.message);
      continue; // Try next strategy
    }
  }

  // If all strategies fail, return empty array
  console.error("All strategies failed to fetch anime data");
  return [];
};

router.get("/hero-trailers", async (req, res) => {
  try {
    const now = Date.now();
    
    // Check cache first
    if (heroCache.data && heroCache.data.length > 0 && now - heroCache.timestamp < HERO_TTL) {
      console.log("Returning cached data");
      return res.json(heroCache.data);
    }

    console.log("Fetching fresh data...");
    const enhanced = await fetchAnimeWithStrategies();

    if (enhanced.length > 0) {
      // Update primary cache
      heroCache = { data: enhanced, timestamp: now };
      // Update fallback cache as backup
      fallbackCache = { data: enhanced, timestamp: now };
      
      console.log(`Successfully fetched ${enhanced.length} anime with trailers`);
      res.json(enhanced);
    } else {
      // If no results, try to use fallback cache
      if (fallbackCache.data && fallbackCache.data.length > 0) {
        console.log("Using fallback cache");
        return res.json(fallbackCache.data);
      }
      
      // Last resort: return minimal error response
      console.log("No data available, returning empty array");
      res.json([]);
    }

  } catch (err) {
    console.error("Error fetching AniList hero trailers:", err.message);
    
    // Try to return cached data even on error
    if (heroCache.data && heroCache.data.length > 0) {
      console.log("Returning cached data due to error");
      return res.json(heroCache.data);
    }
    
    if (fallbackCache.data && fallbackCache.data.length > 0) {
      console.log("Returning fallback cache due to error");
      return res.json(fallbackCache.data);
    }
    
    res.status(500).json({ 
      error: "Failed to fetch hero trailers.",
      fallback: []
    });
  }
});

// Debug endpoint to check cache status
router.get("/hero-trailers/debug", async (req, res) => {
  const now = Date.now();
  res.json({
    cache: {
      hasData: !!heroCache.data,
      count: heroCache.data?.length || 0,
      age: now - heroCache.timestamp,
      expired: now - heroCache.timestamp > HERO_TTL
    },
    fallback: {
      hasData: !!fallbackCache.data,
      count: fallbackCache.data?.length || 0,
      age: now - fallbackCache.timestamp
    }
  });
});

// Force refresh endpoint
router.post("/hero-trailers/refresh", async (req, res) => {
  try {
    console.log("Force refreshing hero trailers...");
    heroCache = { data: null, timestamp: 0 };
    
    const enhanced = await fetchAnimeWithStrategies();
    
    if (enhanced.length > 0) {
      heroCache = { data: enhanced, timestamp: Date.now() };
      fallbackCache = { data: enhanced, timestamp: Date.now() };
      res.json({ success: true, count: enhanced.length });
    } else {
      res.json({ success: false, count: 0 });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;