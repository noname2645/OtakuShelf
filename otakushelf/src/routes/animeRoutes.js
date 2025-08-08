// animeRoutes.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// === Helper function for logging errors ===
const handleAxiosError = (err, label) => {
  console.error(`\n❌ ${label} - Error fetching from Jikan:\n`, {
    message: err?.message,
    status: err?.response?.status,
    data: err?.response?.data
  });
};

// === TOP AIRING ===
router.get('/top-airing', async (req, res) => {
  try {
    const response = await axios.get(`https://api.jikan.moe/v4/top/anime`, {
      params: {
        filter: 'airing',
        limit: 25
      }
    });
    res.json(response.data.data);
  } catch (err) {
    handleAxiosError(err, 'Top Airing');
    res.status(500).json({ error: 'Failed to fetch top airing anime' });
  }
});

// === MOST WATCHED ===
router.get('/most-watched', async (req, res) => {
  try {
    const response = await axios.get(`https://api.jikan.moe/v4/top/anime`, {
      params: {
        filter: 'bypopularity',
        limit: 25
      }
    });
    res.json(response.data.data);
  } catch (err) {
    handleAxiosError(err, 'Most Watched');
    res.status(500).json({ error: 'Failed to fetch most watched anime' });
  }
});

// === TOP MOVIES ===
router.get('/top-movies', async (req, res) => {
  try {
    const response = await axios.get(`https://api.jikan.moe/v4/top/anime`, {
      params: {
        type: 'movie',
        limit: 25
      }
    });
    res.json(response.data.data);
  } catch (err) {
    handleAxiosError(err, 'Top Movies');
    res.status(500).json({ error: 'Failed to fetch top movies' });
  }
});

export default router;
