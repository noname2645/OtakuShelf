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

  // Normalize AniList node - SIMPLIFIED VERSION
  const normalizeAniListNode = (edge) => {
    const node = edge.node;
    const imageUrl = getBestImageUrl(node);

    // SAFELY extract title as a STRING, not an object
    const getTitleString = () => {
      if (!node.title) return "Untitled";
      if (typeof node.title === 'string') return node.title;
      if (typeof node.title === 'object') {
        return node.title.english || 
               node.title.romaji || 
               node.title.native || 
               "Untitled";
      }
      return "Untitled";
    };

    return {
      // IDs
      id: node.id,
      idMal: node.idMal,
      
      // Title as STRING, not object
      title: getTitleString(),
      
      // Images
      coverImage: {
        extraLarge: node.coverImage?.extraLarge || imageUrl,
        large: node.coverImage?.large || imageUrl,
        medium: node.coverImage?.medium || imageUrl,
      },
      bannerImage: node.bannerImage || null,
      
      // Details
      status: node.status,
      description: node.description,
      episodes: node.episodes,
      averageScore: node.averageScore,
      format: node.format,
      genres: node.genres || [],
      
      // Trailer data
      trailer: node.trailer,
      
      // Meta
      relationType: edge.relationType,
      source: "anilist",
      
      // Original data for debugging
      _originalData: node
    };
  };

  // Normalize Jikan entry - SIMPLIFIED VERSION
  const normalizeJikanEntry = useCallback(async (entry, relationName, signal) => {
    const details = await fetchJikanAnimeDetails(entry.mal_id, signal);
    if (!details) return null;

    // SAFELY extract title as a STRING
    const getTitleString = () => {
      return details.title_english || 
             details.title || 
             details.title_japanese || 
             "Untitled";
    };

    return {
      // IDs
      id: details.mal_id,
      idMal: details.mal_id,
      
      // Title as STRING
      title: getTitleString(),
      
      // Images
      coverImage: {
        extraLarge: details.images?.jpg?.large_image_url,
        large: details.images?.jpg?.large_image_url,
        medium: details.images?.jpg?.image_url
      },
      bannerImage: null,
      
      // Details
      status: details.status,
      description: details.synopsis,
      episodes: details.episodes,
      averageScore: details.score ? Math.round(details.score * 10) : null,
      format: details.type,
      genres: details.genres?.map(g => g.name) || [],
      
      // Trailer data
      trailer: details.trailer ? {
        id: details.trailer.youtube_id,
        site: "youtube"
      } : null,
      
      // Meta
      relationType: relationName.toUpperCase().replace(/ /g, "_"),
      source: "jikan",
      
      // Original data for debugging
      _originalData: details
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
          // Filter out any null entries and log the data
          console.log("Related anime data:", normalized.filter(Boolean));
          setRelated(normalized.filter(Boolean));
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
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
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
    if (!anime) return acc;
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
            {animeList.map((anime, index) => (
              anime && (
                <div key={`${anime.id || index}-${anime.relationType || 'unknown'}`} className="anime-item">
                  <AnimeCard
                    anime={anime}
                    onClick={() => onSelect && onSelect(anime)}
                  />
                </div>
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RelatedSection;