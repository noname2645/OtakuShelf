import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import AnimeCard from "./animecard.jsx";
import "../Stylesheets/relatedsection.css";
import { motion } from "framer-motion";

const RelatedSection = ({ animeId, animeMalId, onSelect }) => {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create isolated axios instances for external APIs
  const createJikanAxios = () => {
    return axios.create({
      withCredentials: false,
      headers: {
        'Authorization': undefined
      }
    });
  };

  const createAniListAxios = () => {
    return axios.create({
      baseURL: 'https://graphql.anilist.co',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  };

  // Helper function to validate IDs
  const isValidId = (id) => {
    return id && !isNaN(parseInt(id));
  };

  // Check if relation is sequel or prequel
  const isSequelOrPrequel = (relationType) => {
    if (!relationType) return false;
    const normalizedType = relationType?.toUpperCase();
    return normalizedType === "SEQUEL" ||
      normalizedType === "PREQUEL" ||
      normalizedType === "SEQUEL/PREQUEL" ||
      normalizedType?.includes("SEQUEL") ||
      normalizedType?.includes("PREQUEL");
  };

  // Fetch from AniList
  const fetchFromAniList = useCallback(async (id, signal) => {
    try {
      const query = `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    relations {
                        edges {
                            relationType
                            node {
                                id
                                idMal
                                title {
                                    romaji
                                    english
                                    native
                                }
                                type
                                coverImage {
                                    large
                                    medium
                                    extraLarge
                                }
                                bannerImage
                                status
                                description
                                episodes
                                averageScore
                                format
                                genres
                                studios {
                                    edges {
                                        node {
                                            name
                                        }
                                    }
                                }
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
                                season
                                seasonYear
                                popularity
                                isAdult
                                trailer {
                                    id
                                    site
                                }
                            }
                        }
                    }
                }
            }
        `;

      // Convert ID to integer
      const animeId = parseInt(id);
      if (isNaN(animeId)) {
        console.error('Invalid AniList ID:', id);
        return [];
      }

      // Use dedicated axios instance for AniList
      const aniListAxios = createAniListAxios();
      const res = await aniListAxios.post("/", {
        query,
        variables: { id: animeId },
      }, { signal });

      // Check if media exists
      const media = res.data.data?.Media;
      if (!media) return [];

      return media.relations?.edges || [];
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('AniList request cancelled');
      } else {
        console.error("AniList fetch error:", error.response?.data || error.message);
      }
      return [];
    }
  }, []);

  // Fetch from Jikan
  const fetchFromJikan = useCallback(async (malId, signal) => {
    try {
      const jikanAxios = createJikanAxios();
      const res = await jikanAxios.get(`https://api.jikan.moe/v4/anime/${malId}/relations`, { signal });
      return res.data.data || [];
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Jikan request cancelled');
      } else {
        console.error("Jikan fetch error:", error.message);
      }
      throw error;
    }
  }, []);

  // Fetch Jikan anime details
  const fetchJikanAnimeDetails = useCallback(async (malId, signal) => {
    try {
      const jikanAxios = createJikanAxios();
      const res = await jikanAxios.get(`https://api.jikan.moe/v4/anime/${malId}`, { signal });
      return res.data.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Jikan details request cancelled');
      } else {
        console.error(`Failed to fetch details for MAL ID ${malId}:`, error);
      }
      return null;
    }
  }, []);

  // Get the best image URL from a node
  const getBestImageUrl = (node) => {
    return (
      node.coverImage?.extraLarge ||
      node.coverImage?.large ||
      node.coverImage?.medium ||
      null
    );
  };

  // Normalize AniList node
  const normalizeAniListNode = (edge) => {
    const node = edge.node;
    const imageUrl = getBestImageUrl(node);

    return {
      // IDs
      id: node.id,
      animeId: node.id,
      animeMalId: node.idMal,
      idMal: node.idMal,
      mal_id: node.idMal,

      // Title
      title: {
        english: node.title?.english,
        romaji: node.title?.romaji,
        native: node.title?.native
      },
      title_english: node.title?.english,
      title_romaji: node.title?.romaji,

      // Images
      coverImage: {
        large: node.coverImage?.large || imageUrl,
        medium: node.coverImage?.medium || imageUrl,
        extraLarge: node.coverImage?.extraLarge || imageUrl,
      },

      // Details
      status: node.status,
      description: node.description,
      synopsis: node.description,
      episodes: node.episodes,
      episodeCount: node.episodes,
      averageScore: node.averageScore,
      score: node.averageScore,
      format: node.format,
      type: node.format,
      genres: node.genres?.map(g => ({ name: g })) || node.genres,
      studios: node.studios,
      startDate: node.startDate,
      endDate: node.endDate,
      season: node.season,
      seasonYear: node.seasonYear,
      popularity: node.popularity,
      isAdult: node.isAdult,

      // Trailer data
      trailer: node.trailer ? {
        id: node.trailer.id,
        site: node.trailer.site,
        youtube_id: node.trailer.site === "youtube" ? node.trailer.id : null,
      } : null,
      trailer_video_id: node.trailer?.site === "youtube" ? node.trailer.id : null,

      // Meta
      relationType: edge.relationType,
      source: "anilist",
    };
  };

  // Normalize Jikan entry
  const normalizeJikanEntry = useCallback(async (entry, relationName, signal) => {
    const details = await fetchJikanAnimeDetails(entry.mal_id, signal);
    if (!details) return null;

    return {
      // IDs
      id: details.mal_id,
      animeId: details.anilist_id || null,
      animeMalId: details.mal_id,
      idMal: details.mal_id,
      mal_id: details.mal_id,

      // Title
      title: {
        english: details.title_english || details.title,
        romaji: details.title || details.title_english,
        native: details.title_japanese
      },
      title_english: details.title_english,
      title_romaji: details.title,

      // Images
      coverImage: {
        large: details.images?.jpg?.large_image_url,
        medium: details.images?.jpg?.image_url,
        extraLarge: details.images?.jpg?.large_image_url
      },
      images: details.images,
      image_url: details.images?.jpg?.large_image_url,

      // Details
      status: details.status,
      description: details.synopsis,
      synopsis: details.synopsis,
      episodes: details.episodes,
      episodeCount: details.episodes,
      averageScore: details.score ? Math.round(details.score * 10) : null,
      score: details.score,
      format: details.type,
      type: details.type,
      genres: details.genres?.map(g => ({ name: g.name })) || [],
      studios: details.studios?.map(s => ({ name: s.name })) || [],
      startDate: details.aired?.from ? {
        year: new Date(details.aired.from).getFullYear(),
        month: new Date(details.aired.from).getMonth() + 1,
        day: new Date(details.aired.from).getDate()
      } : null,
      endDate: details.aired?.to ? {
        year: new Date(details.aired.to).getFullYear(),
        month: new Date(details.aired.to).getMonth() + 1,
        day: new Date(details.aired.to).getDate()
      } : null,
      season: details.season,
      seasonYear: details.year,
      popularity: details.popularity,
      isAdult: details.rating?.includes("R") || details.rating?.includes("R+"),

      // Trailer data
      trailer: details.trailer ? {
        youtube_id: details.trailer.youtube_id,
        url: details.trailer.url,
        embed_url: details.trailer.embed_url,
      } : null,
      trailer_video_id: details.trailer?.youtube_id,

      // Meta
      relationType: relationName.toUpperCase().replace(/ /g, "_"),
      source: "jikan",
    };
  }, [fetchJikanAnimeDetails]);

  // Fetch related anime
  useEffect(() => {
    if (!isValidId(animeId) && !isValidId(animeMalId)) {
      setRelated([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const fetchData = async () => {
      setError(null);
      setLoading(true);

      try {
        let normalized = [];
        let fetchedFromAniList = false;

        // Try AniList first if animeId exists and is valid
        if (isValidId(animeId)) {
          try {
            const edges = await fetchFromAniList(animeId, controller.signal);
            const animeRelations = edges.filter(edge => edge.node.type === "ANIME");
            const sequelPrequelRelations = animeRelations.filter(edge => isSequelOrPrequel(edge.relationType));

            normalized = sequelPrequelRelations.map(normalizeAniListNode);
            fetchedFromAniList = normalized.length > 0;
          } catch (err) {
            if (!axios.isCancel(err) && isMounted) {
              console.warn("AniList fetch failed:", err.message);
            }
          }
        }

        // If AniList failed or no results, try MAL
        if ((!fetchedFromAniList || normalized.length === 0) && isValidId(animeMalId)) {
          try {
            const data = await fetchFromJikan(animeMalId, controller.signal);
            for (const rel of data) {
              const relationName = rel.relation || "RELATED";
              if (isSequelOrPrequel(relationName)) {
                const entries = Array.isArray(rel.entry) ? rel.entry : [rel.entry].filter(Boolean);

                for (const entry of entries) {
                  if (entry && entry.mal_id) {
                    const normalizedEntry = await normalizeJikanEntry(entry, relationName, controller.signal);
                    if (normalizedEntry && isMounted) {
                      normalized.push(normalizedEntry);
                    }
                  }
                }
              }
            }
          } catch (err) {
            if (!axios.isCancel(err) && isMounted) {
              console.warn("Jikan fetch failed:", err.message);
            }
          }
        }

        if (isMounted && !controller.signal.aborted) {
          setRelated(normalized);
        }
      } catch (err) {
        if (isMounted && !controller.signal.aborted) {
          console.error("Overall fetch error:", err);
          setError(err.message || "Failed to fetch related anime");
          setRelated([]);
        }
      } finally {
        if (isMounted && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [animeId, animeMalId, fetchFromAniList, fetchFromJikan, normalizeJikanEntry]);

  // Render skeleton cards
  const renderSkeletonCards = (count = 3) => {
    const variants = ['skeleton-variant-1', 'skeleton-variant-2', 'skeleton-variant-3'];
    return Array.from({ length: count }, (_, index) => (
      <div key={`skeleton-${index}`} className="anime-item">
        <div className={`card-skeleton floating ${variants[index % variants.length]}`}>
          <div className="skeleton-image"></div>
          <div className="skeleton-content">
            <div className="skeleton-title"></div>
          </div>
        </div>
      </div>
    ));
  };

  // Format the relation type for display
  const formatRelationType = (relationType) => {
    if (!relationType) return "RELATED";
    return relationType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Show error if there's an actual error
  if (error) return <div className="error-message">Error: {error}</div>;

  // Show skeleton loading with headers immediately
  if (loading) {
    return (
      <div className="related-container">
        <div className="relation-group">
          <h4 style={{ marginTop: "4px" }}>Prequel</h4>
          <div className="related-grid">
            {renderSkeletonCards(1)}
          </div>
        </div>
        <div className="relation-group">
          <h4 style={{ marginTop: "4px" }}>Sequel</h4>
          <div className="related-grid">
            {renderSkeletonCards(1)}
          </div>
        </div>
      </div>
    );
  }

  // Show nothing if no results
  if (!related.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}   // starts invisible + slightly up
        animate={{ opacity: 1, y: 0 }}     // fades in + slides down
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          marginTop: "50px",
          padding: "12px",
          width: "90%",
          border: "1px solid #ddd",
          backdropFilter: "blur(10px)",
          borderRadius: "15px",
          textAlign: "center",
          fontSize: "20px",
          fontStyle: "Roboto",
          color: "#ffffffff",
          letterSpacing: "1px"
        }}
      >
        Sequel or Prequel is not available for this anime
      </motion.div>
    );
  }


  // Group related anime by relation type
  const groupedRelated = related.reduce((acc, anime) => {
    const relType = anime.relationType || "RELATED";
    if (!acc[relType]) acc[relType] = [];
    acc[relType].push(anime);
    return acc;
  }, {});

  return (
    <div className="related-container">
      {Object.entries(groupedRelated).map(([relationType, animeList]) => (
        <div key={relationType} className="relation-group">
          <h4 style={{ marginTop: "4px" }}>{formatRelationType(relationType)}</h4>
          <div className="related-grid">
            {animeList.map((node) => (
              <div key={`${node.id}-${node.relationType}`} className="anime-item">
                <AnimeCard
                  anime={node}
                  onClick={() => onSelect && onSelect(node)}
                  lazy={true}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RelatedSection;