import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../api.js';
import "../Stylesheets/list.css";
import "../Stylesheets/settings.css";
import { Star } from 'lucide-react';
import { Navigate } from "react-router-dom";
import { Header } from '../components/header.jsx';
import BottomNavBar from "../components/bottom.jsx";
import Import from "../images/import.png";
import { useAnimePreferences } from './useAnimePreferences';

const StarRating = ({ rating, onRatingChange, disabled = false }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-btn ${star <= (hoverRating || rating) ? 'active' : ''}`}
          onClick={() => !disabled && onRatingChange(Math.round(star))}
          onMouseEnter={() => !disabled && setHoverRating(star)}
          onMouseLeave={() => !disabled && setHoverRating(0)}
          disabled={disabled}
          title={`${star}/5`}
        >
          <Star
            size={16}
            fill={star <= (hoverRating || rating) ? "#ffd700" : "none"}
            color={star <= (hoverRating || rating) ? "#ffd700" : "#ccc"}
            className="star-icon"
          />
        </button>
      ))}
    </div>
  );
};

const PremiumAnimeCard = ({
  anime,
  activeTab,
  user,
  API,
  handleStatusChange,
  handleIncrementEpisode,
  handleRatingChange,
  handleRemove,
  getFallbackImage,
  calculateProgress
}) => {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (anime?.animeId || anime?._id) {
      const id = anime.animeId || anime._id;
      setIsFavorite(localStorage.getItem(`favorite_${id}`) === 'true');
    }
  }, [anime]);

  const toggleFavorite = (e) => {
    e.stopPropagation();
    const id = anime.animeId || anime._id;
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    localStorage.setItem(`favorite_${id}`, String(nextState));
  };

  const cardRef = useRef(null);
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setShowStatusDropdown(false);
        setShowActionsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const totalEpisodes = anime.totalEpisodes || anime.episodes || anime.episodeCount || 24;
  const episodesWatched = anime.episodesWatched || 0;
  const progress = calculateProgress(episodesWatched, totalEpisodes);
  const userRating = anime.userRating || 0;
  const animeStatus = anime.status || activeTab;
  const isCompleted = animeStatus === "completed";

  const imageUrl = anime.image || anime.poster || getFallbackImage(anime.title);

  // Parse compound titles into main title and subtitle
  const parsedTitle = useMemo(() => {
    const fullTitle = anime.title || 'Unknown Title';
    
    // Check for parenthesis: "Romaji (English)" or vice-versa
    const parenMatch = fullTitle.match(/^([^(]+)\(([^)]+)\)$/);
    if (parenMatch) {
      return {
        main: parenMatch[1].trim(),
        sub: parenMatch[2].trim()
      };
    }
    
    // Check for colon: "Enen no Shouboutai: Fire Force"
    if (fullTitle.includes(':')) {
      const parts = fullTitle.split(':');
      return {
        main: parts[0].trim(),
        sub: parts.slice(1).join(':').trim()
      };
    }
    
    // Check for dash: "Enen no Shouboutai - Fire Force"
    if (fullTitle.includes(' - ')) {
      const parts = fullTitle.split(' - ');
      return {
        main: parts[0].trim(),
        sub: parts.slice(1).join(' - ').trim()
      };
    }

    // Default subtitle to first genre if available
    const fallbackSub = anime.genres && anime.genres.length > 0 ? anime.genres[0] : 'Anime';
    
    return { main: fullTitle, sub: fallbackSub };
  }, [anime.title, anime.genres]);

  // Handle status select click
  const selectStatus = (newStatus) => {
    setShowStatusDropdown(false);
    handleStatusChange(anime, newStatus);
  };

  // Handle actions dropdown select
  const selectAction = (action) => {
    setShowActionsDropdown(false);
    if (action === 'remove') {
      handleRemove(anime._id || anime.animeId);
    } else {
      handleStatusChange(anime, action);
    }
  };

  // Determine dynamic status display label
  const getStatusLabel = (status) => {
    switch (status) {
      case 'watching': return '✓ WATCHING';
      case 'completed': return '✓ COMPLETED';
      case 'planned': return '✓ PLANNED';
      case 'dropped': return '✓ DROPPED';
      default: return `✓ ${status.toUpperCase()}`;
    }
  };

  // Determine dynamic brand color for bar
  const accentColor = anime.coverImage?.color || '#ff5533';

  return (
    <div
      ref={cardRef}
      className={`premium-anime-card ${isCompleted ? 'status-completed' : ''}`}
      style={{
        '--anime-accent-color': accentColor,
        '--status-color': animeStatus === 'completed' ? '#00e676' :
                          animeStatus === 'watching' ? '#3b82f6' :
                          animeStatus === 'planned' ? '#f97316' : '#9ca3af'
      }}
    >
      {/* Top Overlay Badges */}
      <div className="premium-card-header-badges">
        {/* Favorite Heart badge */}
        <button
          className={`premium-badge-favorite ${isFavorite ? 'active' : ''}`}
          onClick={toggleFavorite}
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <svg className="heart-svg-icon" viewBox="0 0 24 24" fill={isFavorite ? "#ff2a5f" : "none"} stroke="#ff2a5f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Status Pill Badge with interactive custom dropdown */}
        <div className="premium-badge-status-container">
          <button
            className={`premium-badge-status-pill ${animeStatus}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowStatusDropdown(prev => !prev);
              setShowActionsDropdown(false);
            }}
          >
            <span>{getStatusLabel(animeStatus)}</span>
          </button>
          
          {showStatusDropdown && (
            <div className="premium-status-menu-dropdown">
              <button className={animeStatus === 'watching' ? 'active' : ''} onClick={() => selectStatus('watching')}>Watching</button>
              <button className={animeStatus === 'completed' ? 'active' : ''} onClick={() => selectStatus('completed')}>Completed</button>
              <button className={animeStatus === 'planned' ? 'active' : ''} onClick={() => selectStatus('planned')}>Planned</button>
              <button className={animeStatus === 'dropped' ? 'active' : ''} onClick={() => selectStatus('dropped')}>Dropped</button>
            </div>
          )}
        </div>
      </div>

      {/* Poster Image Area */}
      <div className="premium-poster-area">
        <img
          className="premium-poster-img"
          src={imageUrl}
          alt={parsedTitle.main}
          onError={(e) => (e.target.src = getFallbackImage(anime.title))}
        />
        <div className="premium-poster-gradient-fade" />
      </div>

      {/* Card Info and Controls Body */}
      <div className="premium-card-body-content">
        {/* Titles */}
        <div className="premium-title-group">
          <h2 className="premium-title-main" title={parsedTitle.main}>
            {parsedTitle.main.toUpperCase()}
          </h2>
        </div>

        {/* Grid Progress Box */}
        <div className="premium-progress-stats-box">
          <div className="premium-stats-grid">
            {/* Left Col: Episodes Incrementor */}
            <div className="premium-stat-col-left">
              <button
                className={`premium-ep-increment-btn-circle ${episodesWatched >= totalEpisodes || isCompleted ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (episodesWatched < totalEpisodes && !isCompleted) {
                    handleIncrementEpisode(anime);
                  }
                }}
                disabled={episodesWatched >= totalEpisodes || isCompleted}
                title="Increment Watched Episode (+1 Ep)"
              >
                <div className="clapboard-svg-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="clapboard-svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                  </svg>
                </div>
              </button>
              
              <div className="premium-stat-info-text">
                <span className="premium-stat-label">EPISODES</span>
                <span className="premium-stat-value">{episodesWatched} / {totalEpisodes}</span>
              </div>
            </div>

            <div className="premium-stats-vertical-divider" />

            {/* Right Col: Progress Percent */}
            <div className="premium-stat-col-right">
              <span className="premium-stat-label">PROGRESS</span>
              <span className={`premium-stat-value progress-percent ${isCompleted ? 'completed' : ''}`}>
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* Glowing Green Progress Bar */}
          <div className="premium-progress-glow-track">
            <div
              className="premium-progress-glow-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Bottom Row: Rating and Action Button */}
        <div className="premium-card-footer-row">
          {/* Your Rating Block */}
          <div className="premium-rating-container">
            <span className="premium-rating-header-label">YOUR RATING</span>
            <div className="premium-rating-stars-interactive">
              <StarRating
                rating={userRating}
                onRatingChange={(newRating) => handleRatingChange(anime, newRating)}
                disabled={!user}
              />
              <span className="premium-rating-text-value">{userRating > 0 ? `${userRating}/5` : '0/5'}</span>
            </div>
          </div>

          {/* Bookmark IN YOUR LIST Button with dropdown */}
          <div className="premium-bookmark-action-container">
            <button
              className="premium-in-list-button-rect"
              onClick={(e) => {
                e.stopPropagation();
                setShowActionsDropdown(prev => !prev);
                setShowStatusDropdown(false);
              }}
            >
              <div className="bookmark-svg-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="bookmark-svg">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <span>IN YOUR LIST</span>
            </button>

            {showActionsDropdown && (
              <div className="premium-list-actions-menu-dropdown">
                <button className="remove-item-btn" onClick={() => selectAction('remove')}>
                  <span className="action-emoji">🗑️</span> Remove from List
                </button>
                <div className="dropdown-divider-line" />
                <button className={animeStatus === 'watching' ? 'selected' : ''} onClick={() => selectAction('watching')}>
                  <span className="action-emoji">🕒</span> Move to Watching
                </button>
                <button className={animeStatus === 'completed' ? 'selected' : ''} onClick={() => selectAction('completed')}>
                  <span className="action-emoji">✅</span> Move to Completed
                </button>
                <button className={animeStatus === 'planned' ? 'selected' : ''} onClick={() => selectAction('planned')}>
                  <span className="action-emoji">📅</span> Move to Planned
                </button>
                <button className={animeStatus === 'dropped' ? 'selected' : ''} onClick={() => selectAction('dropped')}>
                  <span className="action-emoji">❌</span> Move to Dropped
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const EnhancedAnimeList = () => {
  const { preferences } = useAnimePreferences();
  const [activeTab, setActiveTab] = useState('watching');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmRemove, setConfirmRemove] = useState(null); // stores animeId to confirm
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
  const [importOption, setImportOption] = useState('replace');
  const [importProgress, setImportProgress] = useState('');

  const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const wsRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const getFallbackImage = (animeTitle) => {
    const title = (animeTitle || 'No Image').replace(/"/g, '&quot;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180">
      <rect width="300" height="180" fill="#1a1a2e"/>
      <rect x="110" y="50" width="80" height="60" rx="8" fill="#2d2d4e"/>
      <text x="150" y="140" font-family="sans-serif" font-size="12" fill="#6b6b9a" text-anchor="middle">${title}</text>
      <path d="M135 70 l30 20 l-30 20 Z" fill="#6b6b9a"/>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  const user = useMemo(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        return null;
      }

      const storedUser = JSON.parse(userStr);
      const normalizedUser = {
        ...storedUser,
        _id: storedUser._id || storedUser.id,
        id: storedUser._id || storedUser.id
      };

      if (!normalizedUser._id) {
        return null;
      }

      return normalizedUser;
    } catch (e) {
      console.error("Error parsing user:", e);
      return null;
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!user || !user._id) return;

    const connectWebSocket = () => {
      try {
        const backendUrl = API.replace('http://', 'ws://').replace('https://', 'wss://');
        const wsUrl = `${backendUrl}/ws?userId=${user._id}`;

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('✅ WebSocket connected');
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'progress') {
              if (data.current !== undefined && data.total !== undefined) {
                const progressStr = `${data.current}/${data.total}`;
                setImportProgress(progressStr);
              }

              if (data.completed) {
                setImporting(false);
                setTimeout(() => setImportProgress(''), 2000);
                showToast(`✅ ${data.message || 'Import completed successfully!'}`);
                fetchAnimeList(); // Refresh list after background import finishes
              }

              if (data.error) {
                setImporting(false);
                setTimeout(() => setImportProgress(''), 2000);
                showToast(`❌ Import error: ${data.message || 'Unknown error'}`, 'error');
              }
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket connection error:', error);
        };

        wsRef.current.onclose = (event) => {
          if (event.code !== 1000) {
            setTimeout(() => {
              connectWebSocket();
            }, 3000);
          }
        };

      } catch (error) {
        console.error('WebSocket setup error:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xml') && file.type !== 'application/xml' && file.type !== 'text/xml') {
      showToast('Please select a valid XML file exported from MyAnimeList', 'error');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setShowImportModal(true);
    event.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!selectedFile || !user || !user._id) {
      showToast('Please select a file and ensure you are logged in.', 'error');
      return;
    }

    setShowImportModal(false);
    setImporting(true);
    setImportProgress('0/?');

    const formData = new FormData();
    formData.append('malFile', selectedFile);
    formData.append('userId', user._id);
    formData.append('clearExisting', (importOption === 'replace').toString());

    try {
      // Fire-and-forget with no timeout — backend processes in background,
      // WebSocket handles progress updates and completion notification
      const response = await api.post(`${API}/api/list/import/mal`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0, // No timeout — large lists can take many minutes
      });

      const resData = response.data;
      // 202 Accepted means background processing started
      if (resData.status === 'accepted' || resData.status === 'success') {
        showToast('⏳ Import started! Progress updates will appear automatically.');
        // Don't set importing=false here — WebSocket completion will do that
      } else {
        showToast(`Import failed: ${resData.message}`, 'error');
        setImporting(false);
      }
    } catch (error) {
      console.error('Import error:', error);
      let errorMsg = error.response?.data?.message || error.message || 'Unknown error';

      if (errorMsg.includes('Invalid XML')) {
        errorMsg = 'Not a valid MAL XML export. Please re-export your list from MyAnimeList.';
      } else if (errorMsg.includes('Rate limited')) {
        errorMsg = 'Too many requests. Please wait a few minutes before trying again.';
      }

      showToast(`Failed to import: ${errorMsg}`, 'error');
      setImporting(false);
    } finally {
      setTimeout(() => setImportProgress(''), 300);
      setSelectedFile(null);
    }
  };

  const handleImportCancel = () => {
    setShowImportModal(false);
    setSelectedFile(null);
    setImportOption('replace');
  };

  const fetchAnimeList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user || !user._id) {
        setError("Please log in to view your list");
        setLoading(false);
        return;
      }

      const userId = user._id;
      const response = await api.get(`${API}/api/list/${userId}`);

      let listData = response.data.data; // Standardized response

      const normalizedList = {
        watching: [],
        completed: [],
        planned: [],
        dropped: [],
      };

      if (listData) {
        normalizedList.watching = Array.isArray(listData.watching) ? listData.watching : [];
        normalizedList.completed = Array.isArray(listData.completed) ? listData.completed : [];
        normalizedList.planned = Array.isArray(listData.planned) ? listData.planned : [];
        normalizedList.dropped = Array.isArray(listData.dropped) ? listData.dropped : [];
      }

      setAnimeList(normalizedList);
    } catch (error) {
      console.error("Error fetching list:", error);
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
      fetchAnimeList();
    } else {
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

  const groupAnimeByMonthYear = useCallback((animeList, category) => {
    if (!Array.isArray(animeList) || animeList.length === 0) {
      return [];
    }

    const groups = {};

    animeList.forEach(anime => {
      let date;
      let hasValidDate = true;

      // SPECIAL CASE: For completed anime, use finishDate first
      if (category === 'completed') {
        if (anime.finishDate) {
          date = new Date(anime.finishDate);
        } else if (anime.addedDate) {
          date = new Date(anime.addedDate);
        } else if (anime.updatedAt) {
          date = new Date(anime.updatedAt);
        } else if (anime.createdAt) {
          date = new Date(anime.createdAt);
        } else {
          // No date at all - group them under "Unknown Date"
          date = new Date(0);
          hasValidDate = false;
        }
      }
      // For other categories
      else {
        if (anime.addedDate) {
          date = new Date(anime.addedDate);
        } else if (anime.createdAt) {
          date = new Date(anime.createdAt);
        } else if (anime.updatedAt) {
          date = new Date(anime.updatedAt);
        } else {
          date = new Date(0);
          hasValidDate = false;
        }
      }

      // Validate date
      if (isNaN(date.getTime())) {
        date = new Date(0);
        hasValidDate = false;
      }

      // Create group key
      let key;
      if (!hasValidDate || date.getTime() === 0) {
        key = "Unknown Date";
      } else {
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();
        key = `${month} ${year}`;
      }

      if (!groups[key]) {
        groups[key] = {
          title: key,
          sortDate: hasValidDate ? new Date(date.getFullYear(), date.getMonth(), 1) : new Date(0),
          hasValidDate: hasValidDate,
          anime: []
        };
      }

      groups[key].anime.push(anime);
    });

    // Sort groups: Valid date groups first (newest to oldest), then "Unknown Date" at bottom
    const sortedGroups = Object.values(groups).sort((a, b) => {
      // "Unknown Date" always goes to bottom
      if (!a.hasValidDate && b.hasValidDate) return 1;
      if (a.hasValidDate && !b.hasValidDate) return -1;

      // Both have valid dates or both don't - sort by date
      return b.sortDate - a.sortDate;
    });

    return sortedGroups;
  }, []);
  const handleRemove = useCallback(async (animeId) => {
    setConfirmRemove(animeId);
  }, []);

  const confirmRemoveAnime = useCallback(async (animeId) => {
    try {
      if (!user || !user._id) {
        showToast('User not found', 'error');
        return;
      }
      const userId = user._id;
      await api.delete(`${API}/api/list/${userId}/${animeId}`);
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
      showToast('Removed from your list');
    } catch (error) {
      console.error("Error removing anime:", error);
      showToast('Failed to remove anime. Please try again.', 'error');
    } finally {
      setConfirmRemove(null);
    }
  }, [user, API]);

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
      showToast('User not found', 'error');
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
      await api.put(
        `${API}/api/list/${userId}/${animeId}`,
        {
          episodesWatched: updatedEpisodes,
          category: activeTab
        }
      );

      if (updatedEpisodes >= totalEpisodes) {
        const currentStatus = anime.status || activeTab;

        if (currentStatus !== "completed") {
          moveAnimeBetweenCategories(animeId, currentStatus, "completed");

          await api.put(
            `${API}/api/list/${userId}/${animeId}`,
            {
              episodesWatched: totalEpisodes,
              status: "completed",
              fromCategory: currentStatus
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
      showToast('User not found', 'error');
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

      await api.put(
        `${API}/api/list/${userId}/${animeId}`,
        payload
      );
    } catch (err) {
      console.error("Failed to update status", err);
      fetchAnimeList();
    }
  };

  const groupedAnimeList = useMemo(() => {
    const list = animeList[activeTab];
    if (!Array.isArray(list) || list.length === 0) {
      return [];
    }

    // Separate anime with and without dates
    const animeWithDates = [];
    const animeWithoutDates = [];

    list.forEach(anime => {
      if (activeTab === 'completed') {
        // For completed, check if has ANY date field
        if (anime.finishDate || anime.addedDate || anime.createdAt || anime.updatedAt) {
          animeWithDates.push(anime);
        } else {
          animeWithoutDates.push(anime);
        }
      } else {
        // For other tabs
        if (anime.addedDate || anime.createdAt || anime.updatedAt) {
          animeWithDates.push(anime);
        } else {
          animeWithoutDates.push(anime);
        }
      }
    });

    // Sort anime with dates (newest first)
    const sortedWithDates = animeWithDates.sort((a, b) => {
      const dateA = new Date(
        activeTab === 'completed'
          ? (a.finishDate || a.addedDate || a.createdAt || a.updatedAt)
          : (a.addedDate || a.createdAt || a.updatedAt)
      );
      const dateB = new Date(
        activeTab === 'completed'
          ? (b.finishDate || b.addedDate || b.createdAt || b.updatedAt)
          : (b.addedDate || b.createdAt || b.updatedAt)
      );
      return dateB - dateA;
    });

    // Sort anime without dates alphabetically
    const sortedWithoutDates = animeWithoutDates.sort((a, b) =>
      a.title?.localeCompare(b.title) || 0
    );

    // Group only anime with dates
    const groupedWithDates = groupAnimeByMonthYear(sortedWithDates, activeTab);

    // If there are anime without dates, add a special group at the bottom
    if (sortedWithoutDates.length > 0) {
      groupedWithDates.push({
        title: "No Date Available",
        sortDate: new Date(0),
        hasValidDate: false,
        anime: sortedWithoutDates
      });
    }

    return groupedWithDates;
  }, [animeList, activeTab, groupAnimeByMonthYear]);
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleRatingChange = useCallback(async (anime, newRating) => {
    if (!user || !user._id) {
      showToast('Please log in to rate anime', 'error');
      return;
    }

    const userId = user._id;
    const animeId = anime._id || anime.animeId;

    // Update local state immediately for better UX
    updateAnimeInList(animeId, { userRating: newRating });

    try {
      await api.put(
        `${API}/api/list/${userId}/${animeId}`,
        {
          userRating: newRating,
          status: anime.status || activeTab
        }
      );
    } catch (err) {
      console.error("Failed to update rating", err);
      updateAnimeInList(animeId, { userRating: anime.userRating || 0 });
      showToast('Failed to save rating. Please try again.', 'error');
    }
  }, [user, updateAnimeInList]);

  // StarRating is declared at top level

  return (
    <>
      <Header showSearch={false} />
      <BottomNavBar />
      {/* Toast notification */}
      {toast.show && (
        <div className={`settings-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
          <span>{toast.type === 'error' ? '❌' : '✅'}</span>
          {toast.message}
        </div>
      )}
      {/* Inline Remove Confirmation */}
      {confirmRemove && (
        <div className="settings-modal-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-modal-icon">🗑️</div>
            <h3>Remove from List?</h3>
            <p>This anime will be removed from your list. This cannot be undone.</p>
            <div className="settings-modal-actions">
              <button className="settings-btn-danger" onClick={() => confirmRemoveAnime(confirmRemove)}>Remove</button>
              <button className="settings-btn-ghost" onClick={() => setConfirmRemove(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
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
                  <span className="import-icon">
                    <img src={Import} alt="Import" />
                    Import MAL List
                  </span>
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
                    {group.anime.map(anime => (
                      <PremiumAnimeCard
                        key={anime._id || anime.animeId || anime.title}
                        anime={anime}
                        activeTab={activeTab}
                        user={user}
                        API={API}
                        handleStatusChange={handleStatusChange}
                        handleIncrementEpisode={handleIncrementEpisode}
                        handleRatingChange={handleRatingChange}
                        handleRemove={handleRemove}
                        getFallbackImage={getFallbackImage}
                        calculateProgress={calculateProgress}
                      />
                    ))}
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
                      <p>Clears your current list and re-imports everything from the XML file.</p>
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
                      <p>Adds new and updated entries from the XML file to your current list.</p>
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