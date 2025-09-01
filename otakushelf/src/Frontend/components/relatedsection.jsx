import React, { useEffect, useState } from "react";
import axios from "axios";
import AnimeCard from "./animecard.jsx";
import "../Stylesheets/relatedsection.css"; 

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
  const fetchFromAniList = async (id) => {
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
      });

      // Check if media exists
      const media = res.data.data?.Media;
      if (!media) return [];

      return media.relations?.edges || [];
    } catch (error) {
      console.error("AniList fetch error:", error.response?.data || error.message);
      return [];
    }
  };

  // Fetch from Jikan
  const fetchFromJikan = async (malId) => {
    try {
      const jikanAxios = createJikanAxios();
      const res = await jikanAxios.get(`https://api.jikan.moe/v4/anime/${malId}/relations`);
      return res.data.data || [];
    } catch (error) {
      console.error("Jikan fetch error:", error.message);
      throw error;
    }
  };

  // Fetch Jikan anime details
  const fetchJikanAnimeDetails = async (malId) => {
    try {
      const jikanAxios = createJikanAxios();
      const res = await jikanAxios.get(`https://api.jikan.moe/v4/anime/${malId}`);
      return res.data.data;
    } catch (error) {
      console.error(`Failed to fetch details for MAL ID ${malId}:`, error);
      return null;
    }
  };

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
  const normalizeJikanEntry = async (entry, relationName) => {
    const details = await fetchJikanAnimeDetails(entry.mal_id);
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
  };

  // Fetch related anime
  const fetchData = async () => {
    setError(null);
    setLoading(true);

    try {
      let normalized = [];
      let fetchedFromAniList = false;

      // Try AniList first if animeId exists and is valid
      if (isValidId(animeId)) {
        try {
          const edges = await fetchFromAniList(animeId);
          const animeRelations = edges.filter(edge => edge.node.type === "ANIME");
          const sequelPrequelRelations = animeRelations.filter(edge => isSequelOrPrequel(edge.relationType));

          normalized = sequelPrequelRelations.map(normalizeAniListNode);
          fetchedFromAniList = normalized.length > 0;
        } catch (err) {
          console.warn("AniList fetch failed:", err.message);
        }
      }

      // If AniList failed or no results, try MAL
      if ((!fetchedFromAniList || normalized.length === 0) && isValidId(animeMalId)) {
        try {
          const data = await fetchFromJikan(animeMalId);
          for (const rel of data) {
            const relationName = rel.relation || "RELATED";
            if (isSequelOrPrequel(relationName)) {
              const entries = Array.isArray(rel.entry) ? rel.entry : [rel.entry].filter(Boolean);

              for (const entry of entries) {
                if (entry && entry.mal_id) {
                  const normalizedEntry = await normalizeJikanEntry(entry, relationName);
                  if (normalizedEntry) {
                    normalized.push(normalizedEntry);
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn("Jikan fetch failed:", err.message);
        }
      }

      setRelated(normalized);
    } catch (err) {
      console.error("Overall fetch error:", err);
      setError(err.message || "Failed to fetch related anime");
      setRelated([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isValidId(animeId) && !isValidId(animeMalId)) {
      setRelated([]);
      setLoading(false);
      return;
    }

    fetchData();
  }, [animeId, animeMalId]);

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
  if (!related.length) return "Sequel or Prequel is not available for this anime";

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