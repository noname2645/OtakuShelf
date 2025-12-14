import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import "../Stylesheets/list.css";
import { Edit, Star, Play, Trash2, Plus } from 'lucide-react';
import { Navigate } from "react-router-dom";

const EnhancedAnimeList = () => {
  const [activeTab, setActiveTab] = useState('watching');
  const [animeList, setAnimeList] = useState({
    watching: [],
    completed: [],
    planned: [],
    dropped: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch (e) {
      console.error("Error parsing user from localStorage:", e);
      return null;
    }
  }, []);

  const fetchAnimeList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        console.error("No user found");
        return;
      }

      const userId = user._id || user.id;
      if (!userId) {
        console.error("No user ID found");
        return;
      }

      console.log("Fetching anime list for user:", userId);
      const response = await axios.get(`http://localhost:5000/api/list/${userId}`);
      console.log("API Response:", response.data);

      // Handle different response structures
      let listData = response.data;

      // If response.data is already the list object
      if (listData.watching !== undefined ||
        listData.completed !== undefined ||
        listData.planned !== undefined ||
        listData.dropped !== undefined) {
        setAnimeList(listData);
      }
      // If response.data has a list property
      else if (listData.list) {
        setAnimeList(listData.list);
      }
      // If response.data is an array, assume it's all watching
      else if (Array.isArray(listData)) {
        setAnimeList({
          watching: listData,
          completed: [],
          planned: [],
          dropped: []
        });
      } else {
        // Default empty state
        setAnimeList({
          watching: [],
          completed: [],
          planned: [],
          dropped: [],
        });
      }
    } catch (error) {
      console.error("Error fetching list:", error);
      setError(error.message);

      // Set empty lists on error
      setAnimeList({
        watching: [],
        completed: [],
        planned: [],
        dropped: [],
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAnimeList();
    }
  }, [user, fetchAnimeList]);


  const handleRemove = useCallback(async (animeId) => {
    if (window.confirm('Are you sure you want to remove this anime from your list?')) {
      try {
        const userId = user?._id || user?.id;
        const response = await axios.delete(`http://localhost:5000/api/list/${userId}/${animeId}`);
        // Update state with the returned list
        if (response.data.list) {
          setAnimeList(response.data.list);
        } else if (response.data) {
          setAnimeList(response.data);
        }
        // Also refetch to be safe
        fetchAnimeList();
      } catch (error) {
        console.error("Error removing anime:", error);
        alert('Failed to remove anime. Please try again.');
      }
    }
  }, [user, fetchAnimeList]); // Add fetchAnimeList to dependencies

  const getStatusBadgeClass = useCallback((status) => {
    switch (status) {
      case 'watching': return 'watching-badge';
      case 'completed': return 'completed-badge';
      case 'planned': return 'planned-badge';
      case 'dropped': return 'dropped-badge';
      default: return 'watching-badge';
    }
  }, []);

  const calculateProgress = useCallback((episodesWatched, totalEpisodes = 24) => {
    if (!episodesWatched || episodesWatched === 0) return 0;
    return Math.min((episodesWatched / totalEpisodes) * 100, 100);
  }, []);

  const formatEpisodeText = useCallback((episodesWatched, totalEpisodes) => {
    if (episodesWatched === 0) return `0 / ${totalEpisodes} episodes`;
    return `${episodesWatched} / ${totalEpisodes} episodes`;
  }, []);

  const currentAnimeList = useMemo(() => {
    const list = animeList[activeTab] || [];
    console.log(`Current ${activeTab} list:`, list);
    return list;
  }, [animeList, activeTab]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="enhanced-anime-list">
      <div className="list-header">
        <h1>My Anime List</h1>
        <p>Track your anime journey</p>

        <div className="list-tabs">
          {["watching", "completed", "planned", "dropped"].map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="count-badge">{animeList[tab]?.length || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          Loading your anime list...
        </div>
      ) : error ? (
        <div className="empty-state-cards">
          <h3>Error Loading List</h3>
          <p>{error}</p>
          <button
            onClick={fetchAnimeList}
            className="action-btn edit-btn-card"
            style={{ marginTop: '20px', maxWidth: '200px', margin: '20px auto' }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="anime-list-container">
          {currentAnimeList.length > 0 ? (
            currentAnimeList.map(anime => {
              const totalEpisodes = anime.totalEpisodes || anime.episodes || anime.episodeCount || 24;
              const episodesWatched = anime.episodesWatched || 0;
              const progress = calculateProgress(episodesWatched, totalEpisodes);
              const userRating = anime.userRating || 0;

              return (
                <div key={anime._id || anime.animeId || anime.title} className="anime-card2">
                  <div className={`status-badge2 ${getStatusBadgeClass(activeTab)}`}>
                    {activeTab}
                  </div>

                  <div className="card-poster">
                    <img
                      src={anime.image || anime.poster || 'https://via.placeholder.com/300x180/667eea/ffffff?text=Anime+Poster'}
                      alt={anime.title}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/300x180/667eea/ffffff?text=Anime+Poster';
                      }}
                    />

                    {/* Title overlay on image */}
                    <div className="poster-overlay">
                      <h3 className="anime-title-card">{anime.title || 'Unknown Title'}</h3>
                      <div className="card-content2">
                        <div className="episode-info">
                          <span className="episode-dot"></span>
                          <span>{formatEpisodeText(episodesWatched, totalEpisodes)}</span>
                        </div>

                        <div className="progress-section">
                          <div className="progress-bar-container">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="progress-text">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                        </div>
                        <div className="rating-section">
                          <div className="rating-left">
                            <Star size={16} className="star-icon" fill={userRating > 0 ? "#fbbf24" : "#d1d5db"} />
                            <span>{userRating > 0 ? `${userRating}/10` : 'Not rated'}</span>
                          </div>

                          <button
                            className="action-btn remove-btn-card"
                            onClick={() => handleRemove(anime._id || anime.animeId)}
                          >
                            <Trash2 size={16} />
                            Remove
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state-cards">
              <h3>No anime in this category yet</h3>
              <p>Start adding anime to your {activeTab} list!</p>
              <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#6b7280' }}>
                <p>Try adding anime from the search or browse page.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedAnimeList;