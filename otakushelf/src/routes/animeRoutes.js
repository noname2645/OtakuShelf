import express from 'express';
import axios from 'axios';

const router = express.Router();

//Top airing
router.get('/top-airing', async (req, res) => {
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/top/anime?filter=airing&limit=10`);
        res.json(response.data.data);
    } catch {
        res.status(500).json({ error: 'Failed to fetch top airing anime' });
    }
});

//Most-watched
router.get('/most-watched', async (req, res) => {
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=10`);
        res.json(response.data.data);
    } catch {
        res.status(500).json({ error: 'Failed to fetch top airing anime' });
    }
});

//Most hated
router.get('/most-hated', async (req, res) => {
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime`, {
            params: {
                order_by: "score",
                sort: "asc", // lowest score first
                limit: 10
            }
        });
        res.json(response.data.data);

    } catch {
        res.status(500).json({ error: 'Failed to fetch most hated anime' });
    }
});

export default router;