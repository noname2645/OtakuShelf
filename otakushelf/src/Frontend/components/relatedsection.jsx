import React, { useEffect, useState } from "react";
import axios from "axios";
import AnimeCard from "./animecard.jsx";
import "../Stylesheets/relatedsection.css"; 

const RelatedSection = ({ animeId, animeMalId, onSelect }) => {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!animeId && !animeMalId) {
      setRelated([]);
      setLoading(false);
      return;
    }

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
                  }
                }
              }
            }
          }
        `;

        const res = await axios.post("https://graphql.anilist.co", {
          query,
          variables: { id: parseInt(id) },
        });

        const media = res.data.data?.Media;
        if (!media) return [];

        return media.relations?.edges || [];
      } catch (error) {
        console.error("AniList fetch error:", error);
        throw error;
      }
    };

    const fetchFromJikan = async (malId) => {
      try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime/${malId}/relations`);
        return res.data.data || [];
      } catch (error) {
        console.error("Jikan fetch error:", error);
        throw error;
      }
    };

    const fetchJikanAnimeDetails = async (malId) => {
      try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime/${malId}`);
        return res.data.data;
      } catch (error) {
        console.error(`Failed to fetch details for MAL ID ${malId}:`, error);
        return null;
      }
    };

    const isSequelOrPrequel = (relationType) => {
      const normalizedType = relationType?.toUpperCase();
      return normalizedType === "SEQUEL" ||
        normalizedType === "PREQUEL" ||
        normalizedType === "SEQUEL/PREQUEL" ||
        normalizedType?.includes("SEQUEL") ||
        normalizedType?.includes("PREQUEL");
    };

    const getBestImageUrl = (node) => {
      return (
        node.coverImage?.extraLarge ||
        node.coverImage?.large ||
        node.coverImage?.medium ||
        node.images?.jpg?.large_image_url ||
        node.images?.webp?.large_image_url ||
        node.images?.jpg?.image_url ||
        node.images?.webp?.image_url ||
        null
      );
    };

    const normalizeAniListNode = (edge) => {
      const node = edge.node;
      const imageUrl = getBestImageUrl(node);
      
      return {
        // IDs
        id: node.id,
        animeId: node.id, // AniList ID
        animeMalId: node.idMal, // MAL ID
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
        bannerImage: node.bannerImage,
        images: {
          jpg: { 
            large_image_url: imageUrl, 
            image_url: imageUrl 
          },
          webp: { 
            large_image_url: imageUrl, 
            image_url: imageUrl 
          }
        },
        image_url: imageUrl,
        
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
        
        // Meta
        relationType: edge.relationType,
        source: "anilist",
      };
    };

    const normalizeJikanEntry = async (entry, relationName) => {
      // Fetch full details for this anime
      const details = await fetchJikanAnimeDetails(entry.mal_id);
      if (!details) return null;

      return {
        // IDs
        id: details.mal_id,
        animeId: details.anilist_id || null, // Some Jikan responses include AniList ID
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
        isAdult: details.rating?.includes("R") || details.rating?.includes("Rx"),
        
        // Meta
        relationType: relationName.toUpperCase().replace(/ /g, "_"),
        source: "jikan",
      };
    };

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let normalized = [];
        let fetchedFromAniList = false;

        // Try AniList first if animeId exists
        if (animeId) {
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
        if ((!fetchedFromAniList || normalized.length === 0) && animeMalId) {
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
        setError(err.message || "Failed to fetch related anime");
        setRelated([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [animeId, animeMalId]);

  const formatRelationType = (relationType) => {
    if (!relationType) return "RELATED";
    return relationType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) return <div className="loading-message">Loading sequels and prequels...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!related.length) return <div className="no-results">No sequels or prequels found.</div>;

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
                  anime={node} // Pass the full normalized object
                  onClick={() => onSelect && onSelect(node)} // Pass the full normalized object
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