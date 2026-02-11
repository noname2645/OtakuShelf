// animeRoutes.js
import express from 'express';
import axios from 'axios';

const router = express.Router();
let cache = { data: null, timestamp: 0 };

const ANILIST_URL = "https://graphql.anilist.co";

// Helper for GraphQL requests
async function fetchAniList(query, variables = {}) {
  const response = await axios.post(
    ANILIST_URL,
    { query, variables },
    { headers: { "Content-Type": "application/json" } }
  );
  return response.data.data;
}

// Enhanced Anime Sections (Airing, Popular, Movies, Trending, Top Rated, Upcoming) 
router.get('/anime-sections', async (req, res) => {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < 1000 * 60 * 10) {
    return res.json(cache.data);
  }

  try {
    const query = `
      fragment mediaFields on Media {
        id
        idMal
        title { 
          english 
          romaji 
          native 
        }
        description
        coverImage { 
          large 
          extraLarge 
          medium
        }
        bannerImage
        episodes
        averageScore
        status
        genres
        season
        seasonYear
        format
        popularity
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
        studios {
          edges {
            node {
              name
            }
          }
        }
        trailer {
          id
          site
          thumbnail
        }
      }

      query {
        airing1: Page(page: 1, perPage: 30) {
          media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        airing2: Page(page: 2, perPage: 30) {
          media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        
        mostWatched1: Page(page: 1, perPage: 30) {
          media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        mostWatched2: Page(page: 2, perPage: 30) {
          media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        
        movies1: Page(page: 1, perPage: 30) {
          media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        movies2: Page(page: 2, perPage: 30) {
          media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }

        trending1: Page(page: 1, perPage: 30) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        trending2: Page(page: 2, perPage: 30) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
            ...mediaFields
          }
        }

        topRated1: Page(page: 1, perPage: 30) {
          media(type: ANIME, sort: SCORE_DESC, isAdult: false, averageScore_greater: 75) {
            ...mediaFields
          }
        }
        topRated2: Page(page: 2, perPage: 30) {
          media(type: ANIME, sort: SCORE_DESC, isAdult: false, averageScore_greater: 75) {
            ...mediaFields
          }
        }

        upcoming1: Page(page: 1, perPage: 30) {
          media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
        upcoming2: Page(page: 2, perPage: 30) {
          media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) {
            ...mediaFields
          }
        }
      }
    `;

    console.log("Fetching anime sections...");
    const data = await fetchAniList(query);
    console.log("Raw AniList data received.");

    // Process trailer URLs
    const processTrailer = (trailer) => {
      if (!trailer) return null;

      if (trailer.site === 'youtube') {
        return {
          ...trailer,
          url: `https://www.youtube.com/embed/${trailer.id}`,
          fullUrl: `https://www.youtube.com/watch?v=${trailer.id}`
        };
      }
      return trailer;
    };

    // Process each section to add trailer URLs
    const processMediaArray = (mediaArray) => {
      return mediaArray.map(anime => ({
        ...anime,
        trailer: processTrailer(anime.trailer)
      }));
    };

    // Combine pages
    const airingList = [...(data.airing1?.media || []), ...(data.airing2?.media || [])];
    const watchedList = [...(data.mostWatched1?.media || []), ...(data.mostWatched2?.media || [])];
    const moviesList = [...(data.movies1?.media || []), ...(data.movies2?.media || [])];
    const trendingList = [...(data.trending1?.media || []), ...(data.trending2?.media || [])];
    const topRatedList = [...(data.topRated1?.media || []), ...(data.topRated2?.media || [])];
    const upcomingList = [...(data.upcoming1?.media || []), ...(data.upcoming2?.media || [])];

    console.log(`Fetched counts - Airing: ${airingList.length}, Watched: ${watchedList.length}, Movies: ${moviesList.length}, Trending: ${trendingList.length}, Top Rated: ${topRatedList.length}, Upcoming: ${upcomingList.length}`);

    cache = {
      data: {
        topAiring: processMediaArray(airingList),
        mostWatched: processMediaArray(watchedList),
        topMovies: processMediaArray(moviesList),
        trending: processMediaArray(trendingList),
        topRated: processMediaArray(topRatedList),
        upcoming: processMediaArray(upcomingList),
      },
      timestamp: now,
    };

    res.json(cache.data);
  } catch (error) {
    console.error("AniList error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch anime sections" });
  }
});

// ----------- Enhanced Search Anime -----------
router.get('/search', async (req, res) => {
  const q = req.query.q;
  const limit = parseInt(req.query.limit) || 20;

  if (!q) return res.status(400).json({ error: "Missing search query" });

  try {
    const query = `
      query ($search: String, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          media(search: $search, type: ANIME) {
            id
            idMal
            title { 
              english 
              romaji 
              native 
            }
            description
            coverImage { 
              large 
              extraLarge 
              medium
            }
            bannerImage
            episodes
            averageScore
            status
            season
            seasonYear
            genres
            format
            duration
            popularity
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
            studios {
              edges {
                node {
                  name
                }
              }
            }
            trailer {
              id
              site
              thumbnail
            }
            isAdult
            source
          }
        }
      }
    `;

    const data = await fetchAniList(query, {
      search: q,
      perPage: limit
    });

    // Process trailers for search results
    const processTrailer = (trailer) => {
      if (!trailer) return null;

      if (trailer.site === 'youtube') {
        return {
          ...trailer,
          url: `https://www.youtube.com/embed/${trailer.id}`,
          fullUrl: `https://www.youtube.com/watch?v=${trailer.id}`
        };
      }
      return trailer;
    };

    // Safe filter: remove adult content and process trailers
    const safeResults = (data.Page.media || [])
      .filter(anime => !anime.isAdult)
      .map(anime => ({
        ...anime,
        trailer: processTrailer(anime.trailer)
      }));

    // console.log('Search Results Sample:', safeResults[0]);

    res.json(safeResults);
  } catch (error) {
    console.error("AniList search error:", error.response?.data || error.message);
    res.status(500).json({ error: "Search failed" });
  }
});

// Get Single Anime Details 
router.get('/anime/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          idMal
          title { 
            english 
            romaji 
            native 
          }
          description
          coverImage { 
            large 
            extraLarge 
            medium
          }
          bannerImage
          episodes
          averageScore
          status
          genres
          season
          seasonYear
          format
          duration
          popularity
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
          studios {
            edges {
              node {
                name
              }
            }
          }
          trailer {
            id
            site
            thumbnail
          }
          isAdult
          source
          relations {
            edges {
              node {
                id
                title {
                  english
                  romaji
                  native
                }
                coverImage {
                  large
                  medium
                }
                format
                status
              }
              relationType
            }
          }
          characters(page: 1, perPage: 10, sort: ROLE) {
            edges {
              node {
                id
                name {
                  full
                }
                image {
                  large
                  medium
                }
              }
              role
              voiceActors(language: JAPANESE) {
                id
                name {
                  full
                }
                image {
                  large
                  medium
                }
              }
            }
          }
        }
      }
    `;

    const data = await fetchAniList(query, { id: parseInt(id) });

    if (!data.Media) {
      return res.status(404).json({ error: "Anime not found" });
    }

    // Process trailer
    const processTrailer = (trailer) => {
      if (!trailer) return null;

      if (trailer.site === 'youtube') {
        return {
          ...trailer,
          url: `https://www.youtube.com/embed/${trailer.id}`,
          fullUrl: `https://www.youtube.com/watch?v=${trailer.id}`
        };
      }
      return trailer;
    };

    const processedAnime = {
      ...data.Media,
      trailer: processTrailer(data.Media.trailer)
    };

    res.json(processedAnime);
  } catch (error) {
    console.error("AniList single anime error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch anime details" });
  }
});

export default router;