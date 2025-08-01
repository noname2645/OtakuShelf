import express from 'express';
import cors from 'cors';
import animeRoutes from './routes/animeRoutes.js'; // include .js extension

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 👇 Mount your anime routes here
app.use('/api/anime', animeRoutes);

app.listen(PORT, () => {
  console.log(`🔥 Server is running at http://localhost:${PORT}`);
});
