import express from 'express';
import cors from 'cors';
import animeRoutes from './routes/animeRoutes.js'; // include .js extension
import newsRoutes from "./routes/newsRoute.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mount anime routes 
app.use('/api/anime', animeRoutes);
app.use("/api/news", newsRoutes);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
