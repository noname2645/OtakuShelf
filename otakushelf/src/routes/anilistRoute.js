// anilistRoute.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

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

    const response = await axios.post('https://graphql.anilist.co', { query });
    
    if (!response.data || !response.data.data || !response.data.data.Page) {
      throw new Error('Invalid response from AniList API');
    }

    const allMedia = response.data.data.Page.media;

    // Filter for sequels, prequels, or related anime
    const relatedAnime = allMedia.filter((anime) => {
      // Check if it has any anime relations (sequels, prequels, etc.)
      const hasAnimeRelations = anime.relations?.edges?.some((rel) => 
        rel.node.type === "ANIME" && 
        (rel.relationType === "SEQUEL" || 
         rel.relationType === "PREQUEL" || 
         rel.relationType === "SIDE_STORY" ||
         rel.relationType === "ALTERNATIVE")
      );

      // Also include highly anticipated new anime (high popularity/favorites)
      const isHighlyAnticipated = anime.popularity > 10000 || anime.favourites > 5000;

      return hasAnimeRelations || isHighlyAnticipated;
    });

    // Sort by a combination of factors for better variety
    const sortedAnime = relatedAnime.sort((a, b) => {
      // Prioritize by update time, then by popularity
      const timeScore = new Date(b.updatedAt) - new Date(a.updatedAt);
      const popularityScore = (b.popularity || 0) - (a.popularity || 0);
      
      // Weight recent updates more heavily
      return timeScore * 0.7 + popularityScore * 0.3;
    });

    // Ensure we have good data and limit to 10
    const finalResults = sortedAnime
      .filter(anime => 
        anime.title?.romaji && 
        (anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large) &&
        anime.description
      )
      .slice(0, 10);

    // Add some additional processed data for frontend use
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

// Additional endpoint for fallback data if main endpoint fails
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

    const response = await axios.post('https://graphql.anilist.co', { query });
    const trendingAnime = response.data.data.Page.media.slice(0, 10);

    res.json(trendingAnime);
  } catch (err) {
    console.error("Error fetching trending anime:", err);
    res.status(500).json({ error: "Failed to fetch trending anime." });
  }
});

export default router;