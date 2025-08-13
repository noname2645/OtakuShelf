// src/components/RelatedSection.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import AnimeCard from "./animecard.jsx";

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
                    coverImage {
                      large
                      medium
                    }
                    status
                    description
                    episodes
                    averageScore
                    format
                    genres {
                      name
                    }
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
        
        if (res.data.errors) {
          throw new Error(res.data.errors[0].message);
        }
        
        return res.data.data?.Media?.relations?.edges || [];
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

    // Filter function to only include sequels and prequels
    const isSequelOrPrequel = (relationType) => {
      const normalizedType = relationType?.toUpperCase();
      return normalizedType === "SEQUEL" || 
             normalizedType === "PREQUEL" ||
             normalizedType === "SEQUEL/PREQUEL" ||
             normalizedType?.includes("SEQUEL") ||
             normalizedType?.includes("PREQUEL");
    };

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (animeId) {
          // Prefer AniList for more complete data
          console.log("Fetching from AniList with ID:", animeId);
          const edges = await fetchFromAniList(animeId);
          
          // Filter and normalize AniList data
          const normalized = edges
            .filter(edge => isSequelOrPrequel(edge.relationType))
            .map((edge) => {
              const node = edge.node;
              return {
                id: node.id,
                idMal: node.idMal,
                title: {
                  english: node.title?.english,
                  romaji: node.title?.romaji,
                  native: node.title?.native
                },
                coverImage: {
                  large: node.coverImage?.large,
                  medium: node.coverImage?.medium
                },
                status: node.status,
                description: node.description,
                episodes: node.episodes,
                averageScore: node.averageScore,
                format: node.format,
                genres: node.genres,
                relationType: edge.relationType,
                source: "anilist",
              };
            });
          
          console.log("AniList normalized data (sequels/prequels only):", normalized);
          setRelated(normalized);
          
        } else if (animeMalId) {
          // Fallback to Jikan
          console.log("Fetching from Jikan with MAL ID:", animeMalId);
          const data = await fetchFromJikan(animeMalId);
          
          // Filter and normalize Jikan data
          const normalized = [];
          data.forEach((rel) => {
            const relationName = rel.relation || "RELATED";
            
            // Only process if it's a sequel or prequel
            if (isSequelOrPrequel(relationName)) {
              const entries = Array.isArray(rel.entry) ? rel.entry : [rel.entry].filter(Boolean);
              
              entries.forEach((entry) => {
                if (entry && entry.mal_id) {
                  normalized.push({
                    id: entry.mal_id,
                    idMal: entry.mal_id,
                    title: {
                      english: entry.name || entry.title,
                      romaji: entry.name || entry.title,
                    },
                    coverImage: {
                      large: entry.images?.jpg?.image_url || entry.images?.jpg?.large_image_url,
                    },
                    relationType: relationName.toUpperCase().replace(/ /g, "_"),
                    source: "jikan",
                  });
                }
              });
            }
          });
          
          console.log("Jikan normalized data (sequels/prequels only):", normalized);
          setRelated(normalized);
        }
      } catch (err) {
        console.error("Error fetching related:", err);
        setError(err.message || "Failed to fetch related anime");
        setRelated([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [animeId, animeMalId]);

  // Helper to normalize for parent component
  const normalizeForParent = (node) => {
    const normalizedTitle = node.title?.english || 
                           node.title?.romaji || 
                           node.title?.native || 
                           "Untitled";
    
    return {
      // Provide both id formats for compatibility
      mal_id: node.idMal || node.id,
      id: node.id || node.idMal,
      
      // Normalize title structure
      title: normalizedTitle,
      title_english: node.title?.english,
      title_romaji: node.title?.romaji,
      
      // Normalize image structure for different components
      images: {
        jpg: {
          large_image_url: node.coverImage?.large || node.coverImage?.medium
        }
      },
      coverImage: node.coverImage,
      
      // Other properties
      status: node.status,
      synopsis: node.description,
      description: node.description,
      episodes: node.episodes,
      averageScore: node.averageScore,
      format: node.format,
      genres: node.genres,
      _source: node.source,
      _relationType: node.relationType,
    };
  };

  const formatRelationType = (relationType) => {
    if (!relationType) return "RELATED";
    
    return relationType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "rgba(255,255,255,0.7)" }}>
        <p>Loading sequels and prequels...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "#ff6b6b" }}>
        <p>Error loading sequels and prequels: {error}</p>
      </div>
    );
  }
  
  if (!related.length) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "rgba(255,255,255,0.7)" }}>
        <p>No sequels or prequels found.</p>
      </div>
    );
  }

  // Group related anime by relation type (will only be sequels/prequels now)
  const groupedRelated = related.reduce((acc, anime) => {
    const relType = anime.relationType || "RELATED";
    if (!acc[relType]) {
      acc[relType] = [];
    }
    acc[relType].push(anime);
    return acc;
  }, {});

  return (
    <div className="related-container">
      {Object.entries(groupedRelated).map(([relationType, animeList]) => (
        <div key={relationType} className="relation-group" style={{ marginBottom: "24px" }}>
          <h4 style={{ 
            color: "rgba(255,255,255,0.9)", 
            marginBottom: "12px",
            fontSize: "16px",
            fontWeight: "600"
          }}>
            {formatRelationType(relationType)}
          </h4>
          
          <div 
            className="related-grid" 
            style={{ 
              display: "flex", 
              gap: "16px", 
              flexWrap: "wrap",
              justifyContent: "flex-start"
            }}
          >
            {animeList.map((node, index) => (
              <div 
                key={`${node.id}-${relationType}-${index}`} 
                style={{ 
                  width: "160px", 
                  cursor: "pointer",
                  transition: "transform 0.2s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <AnimeCard
                  anime={{
                    title: node.title,
                    coverImage: node.coverImage,
                    images: { 
                      jpg: { 
                        large_image_url: node.coverImage?.large || node.coverImage?.medium 
                      } 
                    },
                  }}
                  onClick={() => {
                    const normalized = normalizeForParent(node);
                    console.log("Selected anime:", normalized);
                    onSelect && onSelect(normalized);
                  }}
                />
                
                {/* Optional: Show additional info */}
                {(node.episodes || node.averageScore) && (
                  <div style={{ 
                    textAlign: "center", 
                    marginTop: "4px", 
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.6)"
                  }}>
                    {node.episodes && `${node.episodes} eps`}
                    {node.episodes && node.averageScore && " • "}
                    {node.averageScore && `⭐ ${(node.averageScore / 10).toFixed(1)}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RelatedSection;