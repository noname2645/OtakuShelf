// anilistRoute.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// Declare headers only once and reuse
const axiosConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://anilist.co',
    'Referer': 'https://anilist.co',
    'User-Agent': 'Mozilla/5.0'
  }
};

// Latest Sequels Route
router.get("/latest-sequels", async (req, res) => {
  try {
    const query = `
      query {
        Page(perPage: 50) {
          media(
            sort: UPDATED_AT_DESC, 
            type: ANIME, 
            isAdult: false, 
            status_in: [NOT_YET_RELEASED, RELEASING]
          ) {
            id
            title {
              romaji
              english
              native
            }
            description(asHtml: false)
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
            status
            season
            seasonYear
            episodes
            duration
            genres
            averageScore
            popularity
            favourites
            bannerImage
            coverImage {
              large
              extraLarge
              color
            }
            studios {
              nodes {
                name
                isAnimationStudio
              }
            }
            relations {
              edges {
                relationType
                node {
                  id
                  type
                  title {
                    romaji
                    english
                  }
                  status
                }
              }
            }
            nextAiringEpisode {
              airingAt
              episode
              timeUntilAiring
            }
            updatedAt
          }
        }
      }
    `;

    const response = await axios.post('https://graphql.anilist.co', { query }, axiosConfig);

    const allMedia = response.data.data.Page.media;

    const relatedAnime = allMedia.filter((anime) => {
      const hasAnimeRelations = anime.relations?.edges?.some((rel) =>
        rel.node.type === "ANIME" &&
        (rel.relationType === "SEQUEL" ||
         rel.relationType === "PREQUEL" ||
         rel.relationType === "SIDE_STORY" ||
         rel.relationType === "ALTERNATIVE")
      );

      const isHighlyAnticipated = anime.popularity > 10000 || anime.favourites > 5000;
      return hasAnimeRelations || isHighlyAnticipated;
    });

    const sortedAnime = relatedAnime.sort((a, b) => {
      const timeScore = b.updatedAt - a.updatedAt;
      const popularityScore = (b.popularity || 0) - (a.popularity || 0);
      return timeScore * 0.7 + popularityScore * 0.3;
    });

    const finalResults = sortedAnime
      .filter(anime =>
        anime.title?.romaji &&
        (anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large) &&
        anime.description
      )
      .slice(0, 10);

    const enhancedResults = finalResults.map(anime => ({
      ...anime,
      displayTitle: anime.title.english || anime.title.romaji,
      hasNextEpisode: !!anime.nextAiringEpisode,
      mainStudio: anime.studios?.nodes?.find(studio => studio.isAnimationStudio)?.name || 'Unknown Studio',
      isSequel: anime.relations?.edges?.some(rel => rel.relationType === "SEQUEL"),
      relatedCount: anime.relations?.edges?.length || 0
    }));

    res.json(enhancedResults);
  } catch (err) {
    console.error("Error fetching sequels from AniList:", err.message);
    res.status(500).json({
      error: "Failed to fetch latest sequels.",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Trending Anime Route
router.get("/trending", async (req, res) => {
  try {
    const query = `
      query {
        Page(perPage: 15) {
          media(
            sort: TRENDING_DESC,
            type: ANIME,
            isAdult: false
          ) {
            id
            title {
              romaji
              english
            }
            description(asHtml: false)
            startDate {
              year
              month
              day
            }
            status
            bannerImage
            coverImage {
              large
              extraLarge
            }
            genres
            averageScore
            popularity
            updatedAt
          }
        }
      }
    `;

    const response = await axios.post('https://graphql.anilist.co', { query }, axiosConfig);
    const trendingAnime = response.data.data.Page.media.slice(0, 10);
    res.json(trendingAnime);
  } catch (err) {
    console.error("Error fetching trending anime:", err.message);
    res.status(500).json({ error: "Failed to fetch trending anime." });
  }
});

export default router;
