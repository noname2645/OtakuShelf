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

export default router;
