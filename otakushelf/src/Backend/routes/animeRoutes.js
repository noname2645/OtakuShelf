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

// Enhanced Anime Sections (Airing, Popular, Movies) 
router.get('/anime-sections', async (req, res) => {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < 1000 * 60 * 10) {
    return res.json(cache.data);
  }

  try {
    const query = `
      query {
        airing: Page(page: 1, perPage: 50) {
          media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
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
          }
        }
        mostWatched: Page(page: 1, perPage: 50) {
          media(type: ANIME, sort: POPULARITY_DESC) {
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
          }
        }
        movies: Page(page: 1, perPage: 50) {
          media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC) {
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
          }
        }
      }
    `;

    const data = await fetchAniList(query);

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

    cache = {
      data: {
        topAiring: processMediaArray(data.airing.media || []),
        mostWatched: processMediaArray(data.mostWatched.media || []),
        topMovies: processMediaArray(data.movies.media || []),
      },
      timestamp: now,
    };

    // console.log('API Response Sample (topAiring[0]):', cache.data.topAiring[0]);

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

    console.log('Search Results Sample:', safeResults[0]);

    res.json(safeResults);
  } catch (error) {
    console.error("AniList search error:", error.response?.data || error.message);
    res.status(500).json({ error: "Search failed" });
  }
});

// ----------- Get Single Anime Details -----------
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