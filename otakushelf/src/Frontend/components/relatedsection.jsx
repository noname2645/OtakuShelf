import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import AnimeCard from "./animecard.jsx";
import "../Stylesheets/relatedsection.css";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Scrollable Relation Group Component
 */
const RelationGroup = ({ title, animeList, onSelect, type }) => {
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      checkScroll();
      window.addEventListener("resize", checkScroll);
      el.addEventListener("scroll", checkScroll);
      // Check after a short delay for images/rendering
      const timeout = setTimeout(checkScroll, 500);
      return () => {
        window.removeEventListener("resize", checkScroll);
        el.removeEventListener("scroll", checkScroll);
        clearTimeout(timeout);
      };
    }
  }, [checkScroll, animeList]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="relation-group">
      <h4>{title}</h4>
      <div className="related-grid-wrapper">
        <AnimatePresence>
          {showLeftArrow && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="scroll-btn left"
              onClick={() => scroll("left")}
            >
              <ChevronLeft size={24} />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="related-grid" ref={scrollRef}>
          {animeList.map((anime, index) => (
            anime && (
              <motion.div 
                key={`${anime.id || index}-${type}-${anime.source}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="anime-item"
              >
                <AnimeCard
                  anime={anime}
                  onClick={() => onSelect && onSelect(anime)}
                />
              </motion.div>
            )
          ))}
        </div>

        <AnimatePresence>
          {showRightArrow && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="scroll-btn right"
              onClick={() => scroll("right")}
            >
              <ChevronRight size={24} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const RelatedSection = ({ animeId, animeMalId, onSelect }) => {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const isValidId = (id) => {
    return id && !isNaN(parseInt(id));
  };

  const isSequelOrPrequel = (relationType) => {
    if (!relationType) return false;
    const normalizedType = relationType?.toUpperCase();
    return normalizedType === "SEQUEL" ||
      normalizedType === "PREQUEL" ||
      normalizedType === "SEQUEL/PREQUEL" ||
      normalizedType?.includes("SEQUEL") ||
      normalizedType?.includes("PREQUEL");
  };

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

      const aniId = parseInt(id);
      if (isNaN(aniId)) return [];

      const aniListAxios = createAniListAxios();
      const res = await aniListAxios.post("/", {
        query,
        variables: { id: aniId },
      }, { signal });

      const media = res.data.data?.Media;
      if (!media) return [];

      return media.relations?.edges || [];
    } catch (error) {
      return [];
    }
  }, []);

  const fetchFromJikan = useCallback(async (malId, signal) => {
    try {
      const jikanAxios = createJikanAxios();
      const res = await jikanAxios.get(`https://api.jikan.moe/v4/anime/${malId}/relations`, { signal });
      return res.data.data || [];
    } catch (error) {
      throw error;
    }
  }, []);

  const fetchJikanAnimeDetails = useCallback(async (malId, signal) => {
    try {
      const jikanAxios = createJikanAxios();
      const res = await jikanAxios.get(`https://api.jikan.moe/v4/anime/${malId}`, { signal });
      return res.data.data;
    } catch (error) {
      return null;
    }
  }, []);

  const normalizeAniListNode = (edge) => {
    const node = edge.node;
    const getTitleString = () => {
      if (!node.title) return "Untitled";
      if (typeof node.title === 'string') return node.title;
      return node.title.english || node.title.romaji || node.title.native || "Untitled";
    };

    return {
      id: node.id,
      idMal: node.idMal,
      title: getTitleString(),
      coverImage: {
        extraLarge: node.coverImage?.extraLarge,
        large: node.coverImage?.large,
        medium: node.coverImage?.medium,
      },
      bannerImage: node.bannerImage,
      status: node.status,
      description: node.description,
      episodes: node.episodes,
      averageScore: node.averageScore,
      format: node.format,
      genres: node.genres || [],
      trailer: node.trailer,
      relationType: edge.relationType,
      source: "anilist",
      _originalData: node
    };
  };

  const normalizeJikanEntry = useCallback(async (entry, relationName, signal) => {
    const details = await fetchJikanAnimeDetails(entry.mal_id, signal);
    if (!details) return null;

    return {
      id: details.mal_id,
      idMal: details.mal_id,
      title: details.title_english || details.title || "Untitled",
      coverImage: {
        extraLarge: details.images?.jpg?.large_image_url,
        large: details.images?.jpg?.large_image_url,
        medium: details.images?.jpg?.image_url
      },
      status: details.status,
      description: details.synopsis,
      episodes: details.episodes,
      averageScore: details.score ? Math.round(details.score * 10) : null,
      format: details.type,
      genres: details.genres?.map(g => g.name) || [],
      trailer: details.trailer ? { id: details.trailer.youtube_id, site: "youtube" } : null,
      relationType: relationName.toUpperCase().replace(/ /g, "_"),
      source: "jikan",
      _originalData: details
    };
  }, [fetchJikanAnimeDetails]);

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

        if (isValidId(animeId)) {
          const edges = await fetchFromAniList(animeId, controller.signal);
          const animeRelations = edges.filter(edge => edge.node.type === "ANIME");
          const sequelPrequelRelations = animeRelations.filter(edge => isSequelOrPrequel(edge.relationType));
          normalized = sequelPrequelRelations.map(normalizeAniListNode);
          fetchedFromAniList = normalized.length > 0;
        }

        if ((!fetchedFromAniList || normalized.length === 0) && isValidId(animeMalId)) {
          try {
              const data = await fetchFromJikan(animeMalId, controller.signal);
              for (const rel of data) {
                const relationName = rel.relation || "RELATED";
                if (isSequelOrPrequel(relationName)) {
                  for (const entry of rel.entry) {
                    if (entry?.mal_id) {
                      const normalizedEntry = await normalizeJikanEntry(entry, relationName, controller.signal);
                      if (normalizedEntry && isMounted) normalized.push(normalizedEntry);
                    }
                  }
                }
              }
          } catch (e) {}
        }

        if (isMounted) setRelated(normalized.filter(Boolean));
      } catch (err) {
        if (isMounted && !axios.isCancel(err)) {
          setError(err.message || "Failed to fetch related anime");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; controller.abort(); };
  }, [animeId, animeMalId, fetchFromAniList, fetchFromJikan, normalizeJikanEntry]);

  const renderSkeletonCards = (count = 3) => (
    <div className="related-grid">
      {Array.from({ length: count }, (_, index) => (
        <div key={`skeleton-${index}`} className="anime-item">
          <div className="card-skeleton">
            <div className="skeleton-image"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const formatRelationType = (relationType) => 
    relationType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  if (error) return <div className="error-message">Error: {error}</div>;

  if (loading) return (
    <div className="related-container">
      <div className="relation-group">
        <h4>Loading Related...</h4>
        {renderSkeletonCards(3)}
      </div>
    </div>
  );

  if (!related.length) return (
    <div className="no-related">
      Sequel or Prequel is not available for this anime
    </div>
  );

  const groupedRelated = related.reduce((acc, anime) => {
    const relType = anime.relationType || "RELATED";
    if (!acc[relType]) acc[relType] = [];
    acc[relType].push(anime);
    return acc;
  }, {});

  return (
    <div className="related-container">
      {Object.entries(groupedRelated).map(([relationType, animeList]) => (
        <RelationGroup 
          key={relationType} 
          type={relationType}
          title={formatRelationType(relationType)} 
          animeList={animeList} 
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

export default RelatedSection;