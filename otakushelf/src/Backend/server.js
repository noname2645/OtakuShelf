import express from 'express';
import cors from 'cors';
import compression from 'compression';
import http from 'http';

import animeRoutes from './routes/animeRoutes.js';
import anilistRoutes from './routes/anilistRoute.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(compression());

// health check (for uptime pinger)
app.get('/healthz', (req, res) => res.send('ok'));

// Mount routes
app.use('/api/anime', animeRoutes);
app.use('/api/anilist', anilistRoutes);

const server = http.createServer(app);

// help avoid 502s on cold networks / free tiers
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
