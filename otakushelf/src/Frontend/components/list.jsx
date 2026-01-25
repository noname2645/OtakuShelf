import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importOption, setImportOption] = useState('replace'); // 'replace' or 'merge'
  const [importProgress, setImportProgress] = useState(''); // Store progress like "15/250"

  const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const wsRef = useRef(null);

  const getFallbackImage = (animeTitle) => {
    const encodedTitle = encodeURIComponent(animeTitle || 'Anime Poster');
    return `https://placehold.co/300x180/667eea/ffffff?text=${encodedTitle}&font=roboto`;
  };

  // FIXED: Proper user extraction with debugging
  const user = useMemo(() => {
    try {
      const userStr = localStorage.getItem("user");
      // console.log("Raw user from localStorage:", userStr);

      if (!userStr) {
        console.log("No user found in localStorage");
        return null;
      }

      const storedUser = JSON.parse(userStr);
      // console.log("Parsed user:", storedUser);

      // Normalize user object - ensure _id exists
      const normalizedUser = {
        ...storedUser,
        _id: storedUser._id || storedUser.id,
        id: storedUser._id || storedUser.id
      };

      // console.log("Normalized user:", normalizedUser);

      if (!normalizedUser._id) {
        console.error("User object has no ID:", normalizedUser);
        return null;
      }

      return normalizedUser;
    } catch (e) {
      console.error("Error parsing user from localStorage:", e);
      return null;
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!user || !user._id) return;

    const connectWebSocket = () => {
      try {
        // Get the correct backend URL
        const backendUrl = API.replace('http://', 'ws://').replace('https://', 'wss://');
        const wsUrl = `${backendUrl}/ws?userId=${user._id}`;

        console.log('Connecting to WebSocket:', wsUrl);

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('✅ WebSocket connected to:', wsUrl);
          console.log('User ID for connection:', user._id);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket progress message:', data);

            if (data.type === 'progress') {
              // Method 1: Use structured data from backend (current/total fields)
              if (data.current !== undefined && data.total !== undefined) {
                const progressStr = `${data.current}/${data.total}`;
                setImportProgress(progressStr);
                console.log(`Progress updated: ${progressStr}`);
              }
              // Method 2: Fallback - extract from message string
              else if (data.message) {
                // Try multiple patterns to extract [X/Y]
                const patterns = [
                  /\[(\d+)\s*\/\s*(\d+)\]/g,  // [X/Y] with spaces
                  /\((\d+)\/(\d+)\)/g,         // (X/Y)
                  /(\d+)\s*\/\s*(\d+)/g        // Just X/Y
                ];

                let match = null;
                for (const pattern of patterns) {
                  const matches = data.message.matchAll(pattern);
                  for (const m of matches) {
                    if (m[1] && m[2]) {
                      match = m;
                      break;
                    }
                  }
                  if (match) break;
                }

                if (match && match[1] && match[2]) {
                  const progressStr = `${match[1]}/${match[2]}`;
                  setImportProgress(progressStr);
                  console.log(`Progress from message: ${progressStr}`);
                } else if (data.message.includes('Starting') || data.message.includes('Clearing')) {
                  setImportProgress('0/?');
                } else if (data.message.includes('completed') || data.message.includes('finished')) {
                  setImportProgress('');
                }
              }
            } else if (data.type === 'error') {
              console.error('WebSocket error:', data.message);
            } else if (data.type === 'connected') {
              console.log('WebSocket connection confirmed');
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
            console.log('Raw WebSocket data:', event.data);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket connection error:', error);
        };

        wsRef.current.onclose = (event) => {
          console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
          // Attempt to reconnect after 3 seconds if not a normal closure
          if (event.code !== 1000) {
            setTimeout(() => {
              console.log('Attempting to reconnect WebSocket...');
              connectWebSocket();
            }, 3000);
          }
        };

      } catch (error) {
        console.error('WebSocket setup error:', error);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xml') && file.type !== 'application/xml' && file.type !== 'text/xml') {
      alert('Please select a valid XML file exported from MyAnimeList');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setShowImportModal(true);
    event.target.value = ''; // Reset file input
  };

  const handleImportConfirm = async () => {
    if (!selectedFile || !user || !user._id) {
      alert('Please select a file and ensure you are logged in.');
      return;
    }

    setShowImportModal(false);
    setImporting(true);
    setImportProgress('0/?'); // Reset progress

    const formData = new FormData();
    formData.append('malFile', selectedFile);
    formData.append('userId', user._id);
    formData.append('clearExisting', (importOption === 'replace').toString());

    console.log("Sending import request with option:", importOption);

    try {
      const response = await axios.post(`${API}/api/list/import/mal`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      console.log('Import response:', response.data);

      if (response.data.success) {
        alert(`Success! ${response.data.message}`);
        fetchAnimeList();
      } else {
        alert(`Import failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`Failed to import: ${error.response?.data?.message || error.message}`);
    } finally {
      setImporting(false);
      // Clear progress after a short delay
      setTimeout(() => setImportProgress(''), 3000);
      setSelectedFile(null);
    }
  };

  const handleImportCancel = () => {
    setShowImportModal(false);
    setSelectedFile(null);
    setImportOption('replace'); // Reset to default
  };

  const fetchAnimeList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user || !user._id) {
        console.error("No user or user ID found");
        setError("Please log in to view your list");
        setLoading(false);
        return;
      }

      const userId = user._id;
      // console.log("Fetching list for user ID:", userId);

      const response = await axios.get(`${API}/api/list/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      // console.log("List API response:", response.data);

      let listData = response.data;

      const normalizedList = {
        watching: [],
        completed: [],
        planned: [],
        dropped: [],
      };

      // Extract lists from response
      if (listData) {
        normalizedList.watching = Array.isArray(listData.watching) ? listData.watching : [];
        normalizedList.completed = Array.isArray(listData.completed) ? listData.completed : [];
        normalizedList.planned = Array.isArray(listData.planned) ? listData.planned : [];
        normalizedList.dropped = Array.isArray(listData.dropped) ? listData.dropped : [];
      }

      // console.log("Normalized list counts:", {
      //   watching: normalizedList.watching.length,
      //   completed: normalizedList.completed.length,
      //   planned: normalizedList.planned.length,
      //   dropped: normalizedList.dropped.length
      // });

      setAnimeList(normalizedList);
    } catch (error) {
      console.error("Error fetching list:", error);
      console.error("Error response:", error.response?.data);

      setError(error.response?.data?.message || error.message || "Failed to load anime list");
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
      // console.log("User detected, fetching list...");
      fetchAnimeList();
    } else {
      console.log("No user, setting loading to false");
      setLoading(false);
    }
  }, [user, fetchAnimeList]);

  const updateAnimeInList = useCallback((animeId, updates) => {
    setAnimeList(prev => {
      const newList = { ...prev };

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

      if (!Array.isArray(newList[fromCategory])) newList[fromCategory] = [];
      if (!Array.isArray(newList[toCategory])) newList[toCategory] = [];

      const animeIndex = newList[fromCategory].findIndex(
        anime => anime._id === animeId || anime.animeId === animeId
      );

      if (animeIndex === -1) return prev;

      const [anime] = newList[fromCategory].splice(animeIndex, 1);
      const updatedAnime = { ...anime, status: toCategory };
      newList[toCategory].push(updatedAnime);

      return newList;
    });
  }, []);

  const groupAnimeByMonthYear = useCallback((animeList) => {
    const groups = {};

    animeList.forEach(anime => {
      // Debug the date
      // console.log(`Processing anime: ${anime.title}, addedDate: ${anime.addedDate}`);

      let date;

      // Try different date formats
      if (anime.addedDate) {
        date = new Date(anime.addedDate);
      } else if (anime.createdAt) {
        date = new Date(anime.createdAt);
      } else if (anime.updatedAt) {
        date = new Date(anime.updatedAt);
      } else {
        date = new Date();
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date for anime: ${anime.title}, using current date`);
        date = new Date();
      }

      const month = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      const key = `${month} ${year}`;

      if (!groups[key]) {
        groups[key] = {
          title: `${month} ${year}`,
          sortDate: new Date(year, date.getMonth(), 1), // Use first day of month for consistent sorting
          anime: []
        };
      }

      groups[key].anime.push(anime);
    });

    // Debug groups
    // console.log('Groups created:', Object.keys(groups));

    // Convert to array and sort by date descending (newest first)
    const sortedGroups = Object.values(groups).sort((a, b) => b.sortDate - a.sortDate);

    // console.log('Sorted groups:', sortedGroups.map(g => ({
    //   title: g.title,
    //   count: g.anime.length,
    //   sortDate: g.sortDate
    // })));

    return sortedGroups;
  }, []);

  const handleRemove = useCallback(async (animeId) => {
    if (window.confirm('Are you sure you want to remove this anime from your list?')) {
      try {
        if (!user || !user._id) {
          alert('User not found');
          return;
        }

        const userId = user._id;
        await axios.delete(`${API}/api/list/${userId}/${animeId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        });

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
    if (!episodesWatched || episodesWatched === 0 || !totalEpisodes || totalEpisodes === 0) return 0;
    return Math.min((episodesWatched / totalEpisodes) * 100, 100);
  }, []);

  const formatEpisodeText = useCallback((episodesWatched, totalEpisodes) => {
    if (episodesWatched === 0) return `0 / ${totalEpisodes} episodes`;
    return `${episodesWatched || 0} / ${totalEpisodes} episodes`;
  }, []);

  const handleIncrementEpisode = async (anime) => {
    if (!user || !user._id) {
      alert('User not found');
      return;
    }

    const userId = user._id;
    const animeId = anime._id || anime.animeId;
    const totalEpisodes = anime.totalEpisodes || anime.episodes || anime.episodeCount || 24;
    const currentEpisodes = anime.episodesWatched || 0;

    if (currentEpisodes >= totalEpisodes) {
      return;
    }

    const updatedEpisodes = currentEpisodes + 1;
    updateAnimeInList(animeId, { episodesWatched: updatedEpisodes });

    try {
      await axios.put(
        `${API}/api/list/${userId}/${animeId}`,
        {
          episodesWatched: updatedEpisodes,
          category: activeTab
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        }
      );

      if (updatedEpisodes >= totalEpisodes) {
        const currentStatus = anime.status || activeTab;

        if (currentStatus !== "completed") {
          moveAnimeBetweenCategories(animeId, currentStatus, "completed");

          await axios.put(
            `${API}/api/list/${userId}/${animeId}`,
            {
              episodesWatched: totalEpisodes,
              status: "completed",
              fromCategory: currentStatus
            },
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
              }
            }
          );
        }
      }
    } catch (err) {
      console.error("Failed to update episode count", err);
      updateAnimeInList(animeId, { episodesWatched: currentEpisodes });
    }
  };

  const handleStatusChange = async (anime, newStatus) => {
    if (!user || !user._id) {
      alert('User not found');
      return;
    }

    const userId = user._id;
    const animeId = anime._id || anime.animeId;
    const totalEpisodes = anime.totalEpisodes || anime.episodes || anime.episodeCount || 24;
    const currentStatus = anime.status || activeTab;
    const currentEpisodes = anime.episodesWatched || 0;

    try {
      const payload = {
        status: newStatus,
        fromCategory: currentStatus
      };

      if (newStatus === "completed") {
        payload.episodesWatched = totalEpisodes;
      } else if (currentStatus === "completed") {
        payload.episodesWatched = currentEpisodes;
      }

      let episodeUpdate = {};
      if (newStatus === "completed") {
        episodeUpdate = { episodesWatched: totalEpisodes };
      } else if (currentStatus === "completed") {
        episodeUpdate = { episodesWatched: currentEpisodes };
      }

      updateAnimeInList(animeId, {
        status: newStatus,
        ...episodeUpdate
      });

      if (currentStatus !== newStatus) {
        moveAnimeBetweenCategories(animeId, currentStatus, newStatus);
      }

      await axios.put(
        `${API}/api/list/${userId}/${animeId}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        }
      );
    } catch (err) {
      console.error("Failed to update status", err);
      fetchAnimeList();
    }
  };

  const groupedAnimeList = useMemo(() => {
    const list = animeList[activeTab];
    if (!Array.isArray(list)) return [];

    const sortedList = [...list].sort((a, b) => {
      const dateA = new Date(a.addedDate || a.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.addedDate || b.createdAt || b.updatedAt || 0);
      return dateB - dateA;
    });

    return groupAnimeByMonthYear(sortedList);
  }, [animeList, activeTab, groupAnimeByMonthYear]);

  if (!user) {
    console.log("No user, redirecting to login");
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
              </button>
            ))}
            <div className="import-section">
              <label className={`import-btn ${importing ? 'importing' : ''}`}>
                <input
                  type="file"
                  accept=".xml"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  disabled={importing}
                />
                {importing ? (
                  <>
                    <span className="spinnerlist">
                      <span className="spinnerin"></span>
                    </span>
                    {importProgress ? ` Importing ${importProgress}` : ' Importing…'}
                  </>
                ) : (
                  '📥 Import MAL List'
                )}
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner-container">
            <div className="circular-spinner"></div>
            <p>Loading your anime list...</p>
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

                      // Calculate progress percentage
                      const progressPercentage = `${progress}%`;
                      const imageUrl = anime.image || anime.poster || getFallbackImage(anime.title);

                      return (
                        <div
                          key={anime._id || anime.animeId || anime.title}
                          className={`anime-card3 ${isCompleted ? 'status-completed' : ''}`}
                          style={{ '--progress-width': progressPercentage, '--poster-bg': `url(${imageUrl})` }}
                        >
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

                          <div
                            className="card-poster"
                            style={{ '--progress': `${progress}%` }}
                          >
                            <img
                              className="poster-img grayscale"
                              src={imageUrl}
                              alt={anime.title}
                              onError={(e) => (e.target.src = getFallbackImage(anime.title))}
                            />

                            <img
                              className="poster-img color"
                              src={imageUrl}
                              alt=""
                              aria-hidden
                              onError={(e) => (e.target.src = getFallbackImage(anime.title))}
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
                                      style={{ width: progressPercentage }}
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
                                    <span>{userRating > 0 ? `${userRating}/5` : 'Not rated'}</span>
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
                <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                  Or import your MyAnimeList using the button above.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Import Confirmation Modal */}
      {showImportModal && (
        <div className="import-modal-overlay">
          <div className="import-modal">
            <div className="import-modal-header">
              <h3>Import MAL List</h3>
              <button className="modal-close-btn" onClick={handleImportCancel}>×</button>
            </div>

            <div className="import-modal-content">
              <div className="import-file-info">
                <div className="file-icon">📄</div>
                <div className="file-details">
                  <h4>{selectedFile?.name}</h4>
                  <p>{(selectedFile?.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>

              <div className="import-options">
                <h4>Import Options</h4>
                <div className="option-item">
                  <label className="option-radio">
                    <input
                      type="radio"
                      name="importOption"
                      value="replace"
                      checked={importOption === 'replace'}
                      onChange={(e) => setImportOption(e.target.value)}
                    />
                    <span className="radio-custom"></span>
                    <div className="option-content">
                      <strong>Replace existing list (Clean Import)</strong>
                      <p>Clears your current list and re-imports everything from the XML file.
                        Slower, but fixes inconsistencies.</p>
                    </div>
                  </label>
                </div>

                <div className="option-item">
                  <label className="option-radio">
                    <input
                      type="radio"
                      name="importOption"
                      value="merge"
                      checked={importOption === 'merge'}
                      onChange={(e) => setImportOption(e.target.value)}
                    />
                    <span className="radio-custom"></span>
                    <div className="option-content">
                      <strong>Merge with existing list (Faster)</strong>
                      <p>Adds new and updated entries from the XML file to your current list.
                        Faster, but incorrect data may remain.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button className="modal-btn cancel-btn" onClick={handleImportCancel}>
                  Cancel
                </button>
                <button className="modal-btn confirm-btn" onClick={handleImportConfirm}>
                  Start Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnhancedAnimeList;