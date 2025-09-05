// animeRoutes.js
import express from 'express';
import axios from 'axios';

const router = express.Router();
let cache = { data: null, timestamp: 0 };

router.get('/anime-sections', async (req, res) => {
  const now = Date.now();

 if (cache.data && now - cache.timestamp < 1000 * 60 * 10) {
  return res.json(cache.data);
}

  try {
    const [airing, watched, movies] = await Promise.all([
      axios.get(`https://api.jikan.moe/v4/top/anime?filter=airing&limit=25`),
      axios.get(`https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=25`),
      axios.get(`https://api.jikan.moe/v4/top/anime?type=movie&limit=25`)
    ]);

    cache = {
      data: {
        topAiring: airing.data.data,
        mostWatched: watched.data.data,
        topMovies: movies.data.data
      },
      timestamp: now
    };

    res.json(cache.data);
  } catch (error) {
    console.error("Jikan error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch anime sections" });
  }
});


// Search Anime (Jikan API)
router.get('/search', async (req, res) => {
  const q = req.query.q;
  if (!q) {
    return res.status(400).json({ error: "Missing search query" });
  }

  try {
    const response = await axios.get(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=20`
    );

    // Filter out hentai / adult stuff
    const safeResults = (response.data.data || []).filter(anime => {
      const rating = anime.rating ? anime.rating.toLowerCase() : "";
      return !(rating.includes("rx") || rating.includes("hentai"));
    });

    res.json(safeResults); 
  } catch (error) {
    console.error("Jikan search error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Search failed" });
  }
});



export default router;
