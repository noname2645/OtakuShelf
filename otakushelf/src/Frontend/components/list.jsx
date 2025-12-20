import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import "../Stylesheets/list.css";
import { Star } from 'lucide-react';
import { Navigate } from "react-router-dom";
import { Header } from '../components/header.jsx';
import BottomNavBar from "../components/bottom.jsx";


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

      const response = await axios.get(`http://localhost:5000/api/list/${userId}`);

      let listData = response.data;

      // Ensure all categories are arrays
      const normalizedList = {
        watching: [],
        completed: [],
        planned: [],
        dropped: [],
      };

      if (listData.watching !== undefined || listData.completed !== undefined ||
        listData.planned !== undefined || listData.dropped !== undefined) {
        normalizedList.watching = Array.isArray(listData.watching) ? listData.watching : [];
        normalizedList.completed = Array.isArray(listData.completed) ? listData.completed : [];
        normalizedList.planned = Array.isArray(listData.planned) ? listData.planned : [];
        normalizedList.dropped = Array.isArray(listData.dropped) ? listData.dropped : [];
      } else if (listData.list) {
        normalizedList.watching = Array.isArray(listData.list.watching) ? listData.list.watching : [];
        normalizedList.completed = Array.isArray(listData.list.completed) ? listData.list.completed : [];
        normalizedList.planned = Array.isArray(listData.list.planned) ? listData.list.planned : [];
        normalizedList.dropped = Array.isArray(listData.list.dropped) ? listData.list.dropped : [];
      } else if (Array.isArray(listData)) {
        normalizedList.watching = listData;
      }

      setAnimeList(normalizedList);
    } catch (error) {
      console.error("Error fetching list:", error);
      setError(error.message);
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

  const updateAnimeInList = useCallback((animeId, updates) => {
    setAnimeList(prev => {
      const newList = { ...prev };

      // Update anime in ALL categories, not just active tab
      Object.keys(newList).forEach(category => {
        if (Array.isArray(newList[category])) {
          newList[category] = newList[category].map(anime => {
            if (anime._id === animeId || anime.animeId === animeId) {
              return { ...anime, ...updates };
            }
            return anime;
          });
        }
      });

      return newList;
    });
  }, []);

  const moveAnimeBetweenCategories = useCallback((animeId, fromCategory, toCategory) => {
    setAnimeList(prev => {
      const newList = { ...prev };

      // Ensure categories are arrays
      if (!Array.isArray(newList[fromCategory])) newList[fromCategory] = [];
      if (!Array.isArray(newList[toCategory])) newList[toCategory] = [];

      // Find the anime in the source category
      const animeIndex = newList[fromCategory].findIndex(
        anime => anime._id === animeId || anime.animeId === animeId
      );

      if (animeIndex === -1) return prev;

      // Get the anime
      const [anime] = newList[fromCategory].splice(animeIndex, 1);

      // Update the anime with new status
      const updatedAnime = { ...anime, status: toCategory };

      // Add to target category
      newList[toCategory].push(updatedAnime);

      return newList;
    });
  }, []);

  const groupAnimeByMonthYear = useCallback((animeList) => {
    const groups = {};

    animeList.forEach(anime => {
      const date = new Date(anime.addedDate || anime.createdAt || Date.now());
      const month = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      const key = `${month} ${year}`;

      if (!groups[key]) {
        groups[key] = {
          title: `${month} ${year}`,
          sortDate: date,
          anime: []
        };
      }

      groups[key].anime.push(anime);
    });

    // Convert to array and sort by date descending
    return Object.values(groups).sort((a, b) => b.sortDate - a.sortDate);
  }, []);

  const handleRemove = useCallback(async (animeId) => {
    if (window.confirm('Are you sure you want to remove this anime from your list?')) {
      try {
        const userId = user?._id || user?.id;
        await axios.delete(`http://localhost:5000/api/list/${userId}/${animeId}`);

        // Update local state immediately
        setAnimeList(prev => {
          const newList = { ...prev };
          Object.keys(newList).forEach(category => {
            if (Array.isArray(newList[category])) {
              newList[category] = newList[category].filter(
                anime => anime._id !== animeId && anime.animeId !== animeId
              );
            }
          });
          return newList;
        });
      } catch (error) {
        console.error("Error removing anime:", error);
        alert('Failed to remove anime. Please try again.');
      }
    }
  }, [user]);

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

  const handleIncrementEpisode = async (anime) => {
    const userId = user._id || user.id;
    const animeId = anime._id || anime.animeId;
    const totalEpisodes = anime.totalEpisodes || anime.episodes || anime.episodeCount || 24;
    const currentEpisodes = anime.episodesWatched || 0;

    // Don't increment if already completed
    if (currentEpisodes >= totalEpisodes) {
      return;
    }

    const updatedEpisodes = currentEpisodes + 1;

    // Optimistically update UI - update in all categories
    updateAnimeInList(animeId, { episodesWatched: updatedEpisodes });

    try {
      await axios.put(
        `http://localhost:5000/api/list/${userId}/${animeId}`,
        {
          episodesWatched: updatedEpisodes,
          category: activeTab
        }
      );

      // AUTO-SHIFT TO COMPLETED: Check if all episodes are watched
      if (updatedEpisodes >= totalEpisodes) {
        // Get the current status from the anime object
        const currentStatus = anime.status || activeTab;

        // Only move if not already in completed tab
        if (currentStatus !== "completed") {
          // Update local state immediately - move to completed
          moveAnimeBetweenCategories(animeId, currentStatus, "completed");

          // Update server with new status
          await axios.put(
            `http://localhost:5000/api/list/${userId}/${animeId}`,
            {
              episodesWatched: totalEpisodes,
              status: "completed",
              fromCategory: currentStatus
            }
          );
        } else {
          // If already in completed tab, just update episodes
          updateAnimeInList(animeId, {
            episodesWatched: totalEpisodes,
            status: "completed"
          });
        }
      }
    } catch (err) {
      console.error("Failed to update episode count", err);
      // Revert on error
      updateAnimeInList(animeId, { episodesWatched: currentEpisodes });
    }
  };

  const handleStatusChange = async (anime, newStatus) => {
    const userId = user._id || user.id;
    const animeId = anime._id || anime.animeId;
    const totalEpisodes = anime.totalEpisodes || anime.episodes || anime.episodeCount || 24;

    // Get current status from anime object
    const currentStatus = anime.status || activeTab;

    // Get current episodes watched
    const currentEpisodes = anime.episodesWatched || 0;

    try {
      const payload = {
        status: newStatus,
        fromCategory: currentStatus
      };
      if (newStatus === "completed") {
        payload.episodesWatched = totalEpisodes;
      }
      else if (currentStatus === "completed") {
        payload.episodesWatched = currentEpisodes;
      }

      // Update local state optimistically
      let episodeUpdate = {};

      if (newStatus === "completed") {
        episodeUpdate = { episodesWatched: totalEpisodes };
      } else if (currentStatus === "completed") {
        // Keep current
        episodeUpdate = { episodesWatched: currentEpisodes };
      }

      updateAnimeInList(animeId, {
        status: newStatus,
        ...episodeUpdate
      });

      // Move between categories in local state
      if (currentStatus !== newStatus) {
        moveAnimeBetweenCategories(animeId, currentStatus, newStatus);
      }

      await axios.put(
        `http://localhost:5000/api/list/${userId}/${animeId}`,
        payload
      );
    } catch (err) {
      console.error("Failed to update status", err);
      // On error, refetch to sync with server
      fetchAnimeList();
    }
  };

  const groupedAnimeList = useMemo(() => {
    const list = animeList[activeTab];
    if (!Array.isArray(list)) return [];

    // First sort the list by addedDate
    const sortedList = [...list].sort((a, b) => {
      const dateA = new Date(a.addedDate || a.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.addedDate || b.createdAt || b.updatedAt || 0);
      return dateB - dateA;
    });

    // Then group by month/year
    return groupAnimeByMonthYear(sortedList);
  }, [animeList, activeTab, groupAnimeByMonthYear]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Header showSearch={true} onSearchChange={() => { }} />
      <BottomNavBar />
      <div className="enhanced-anime-list">
        <div className="list-header">
          <div className="list-tabs">
            {["watching", "completed", "planned", "dropped"].map(tab => (
              <button
                key={tab}
                className={activeTab === tab ? 'active' : ''}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="count-badge">
                  {Array.isArray(animeList[tab]) ? animeList[tab].length : 0}
                </span>
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
            {groupedAnimeList.length > 0 ? (
              groupedAnimeList.map(group => (
                <div key={group.title} className="month-group">
                  <h3 className="month-group-title-alt">
                    <span>{group.title}</span>
                  </h3>
                  <div className="month-group-cards">
                    {group.anime.map(anime => {
                      const totalEpisodes = anime.totalEpisodes || anime.episodes || anime.episodeCount || 24;
                      const episodesWatched = anime.episodesWatched || 0;
                      const progress = calculateProgress(episodesWatched, totalEpisodes);
                      const userRating = anime.userRating || 0;
                      const animeStatus = anime.status || activeTab;
                      const isCompleted = animeStatus === "completed";

                      return (
                        <div key={anime._id || anime.animeId || anime.title} className="anime-card3">
                          <div className={`status-badge2 ${getStatusBadgeClass(animeStatus)}`}>
                            <select
                              className="status-badge-select"
                              value={animeStatus}
                              onChange={(e) => handleStatusChange(anime, e.target.value)}
                            >
                        
                              <option value="watching">Watching</option>
                              <option value="completed">Completed</option>
                              <option value="planned">Planned</option>
                              <option value="dropped">Dropped</option>
                            </select>
                          </div>

                          <div className="card-poster">
                            <img
                              src={anime.image || anime.poster || 'https://via.placeholder.com/300x180/667eea/ffffff?text=Anime+Poster'}
                              alt={anime.title}
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/300x180/667eea/ffffff?text=Anime+Poster';
                              }}
                            />

                            <div className="poster-overlay">
                              <h3 className="anime-title-card">{anime.title || 'Unknown Title'}</h3>
                              <div className="card-content2">
                                <div className="episode-info">
                                  <span className="episode-dot"></span>
                                  <span>{formatEpisodeText(episodesWatched, totalEpisodes)}</span>
                                  <button
                                    className="epincbtn"
                                    onClick={() => handleIncrementEpisode(anime)}
                                    disabled={episodesWatched >= totalEpisodes || isCompleted}
                                  >
                                    +1 Ep
                                  </button>
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
                                    <Star size={16} className="star-icon" />
                                    <span>{userRating > 0 ? `${userRating}/10` : 'Not rated'}</span>
                                  </div>
                                  <button
                                    className="action-btn remove-btn-card"
                                    onClick={() => handleRemove(anime._id || anime.animeId)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-cards">
                <h3>No anime in this category yet</h3>
                <p>Start adding anime to your {activeTab} list!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default EnhancedAnimeList;