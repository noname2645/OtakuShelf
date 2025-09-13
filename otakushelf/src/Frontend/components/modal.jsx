// Enhanced Modal Component - AniList GraphQL Compatible
import React, { useState, useEffect, useRef, useCallback } from "react";
import "../Stylesheets/modal.css";
import RelatedTab from "./relatedsection.jsx";
import Trailer from "./trailer";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check } from 'lucide-react';
import { useAuth } from "../components/AuthContext.jsx";
import axios from "axios";

const Modal = ({ isOpen, onClose, anime, onOpenAnime }) => {
    const [synopsisModalOpen, setSynopsisModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("info");
    const [trailerVideoId, setTrailerVideoId] = useState(null);
    const titleRef = useRef(null);
    const [isAddingToList, setIsAddingToList] = useState(false);
    const [isInList, setIsInList] = useState(false);
    const [userListStatus, setUserListStatus] = useState(null);
    const { user } = useAuth();

    // Define checkIfInList function with useCallback to prevent recreation on every render
    const checkIfInList = useCallback(async () => {
        if (!user || !anime) return;

        try {
            const response = await axios.get(`http://localhost:5000/api/list/${user._id || user.id}`);
            const userList = response.data;

            // Get the anime title from AniList structure
            const animeTitle = getAnimeTitle();

            // Check if anime is in any category with better matching
            const categories = ['watching', 'completed', 'planned', 'dropped'];
            let foundStatus = null;

            for (const category of categories) {
                const animeInCategory = userList[category] || [];
                const foundAnime = animeInCategory.find(item => {
                    // Multiple matching strategies for AniList data
                    return (
                        item.title === animeTitle ||
                        item.animeId === anime.id ||
                        item.malId === anime.idMal ||
                        (anime.id && item.animeId === anime.id.toString()) ||
                        (anime.idMal && item.malId === anime.idMal.toString())
                    );
                });

                if (foundAnime) {
                    foundStatus = category;
                    break;
                }
            }

            setIsInList(foundStatus !== null);
            setUserListStatus(foundStatus);

        } catch (error) {
            console.error("Error checking if anime is in list:", error);
            setIsInList(false);
            setUserListStatus(null);
        }
    }, [user, anime]);

    // Check if anime is in user's list
    useEffect(() => {
        let isMounted = true;

        const checkListStatus = async () => {
            if (user && anime) {
                await checkIfInList();
            }
        };

        checkListStatus();

        return () => {
            isMounted = false;
        };
    }, [user, anime, checkIfInList]);

    useEffect(() => {
        setSynopsisModalOpen(false);
        setActiveTab("info");
        setTrailerVideoId(null);
    }, [anime?.id]);

    // Dynamic title class assignment based on length
    useEffect(() => {
        if (titleRef.current && anime) {
            const title = getAnimeTitle();
            const titleElement = titleRef.current;

            // Remove existing title classes
            titleElement.classList.remove('long-title', 'very-long-title');

            // Apply classes based on title length
            if (title.length > 60) {
                titleElement.classList.add('very-long-title');
            } else if (title.length > 35) {
                titleElement.classList.add('long-title');
            }

            // Alternative: Check actual rendered height
            const timer = setTimeout(() => {
                const titleHeight = titleElement.scrollHeight;
                if (titleHeight > 80) {
                    titleElement.classList.add('very-long-title');
                } else if (titleHeight > 60) {
                    titleElement.classList.add('long-title');
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [anime]);

    // Fetch trailer data when component mounts or anime changes
    useEffect(() => {
        if (anime && isOpen) {
            const videoId = getTrailerVideoId();
            setTrailerVideoId(videoId);
        }
    }, [anime, isOpen]);

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen || synopsisModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, synopsisModalOpen]);

    if (!isOpen || !anime) return null;
    console.log("Modal received AniList anime data:", anime);

    const addToList = async (status) => {
        if (!user) {
            alert("Please log in to add anime to your list");
            return;
        }

        setIsAddingToList(true);
        try {
            const animeTitle = getAnimeTitle();

            const response = await axios.post(`http://localhost:5000/api/list/${user._id || user.id}`, {
                category: status,
                animeTitle: animeTitle,
                animeData: anime
            });

            // Immediately update the local state
            setIsInList(true);
            setUserListStatus(status);

            // Re-fetch the actual list status to ensure consistency
            setTimeout(() => {
                checkIfInList();
            }, 100);

        } catch (error) {
            console.error("Error adding to list:", error);
            alert("Failed to add to list");
        } finally {
            setIsAddingToList(false);
        }
    };

    // AniList title fetch - prioritize English, fallback to Romaji, then Native
    const getAnimeTitle = () => {
        if (!anime) return "Untitled";
        if (typeof anime.title === 'string') {
            return anime.title;
        }
        if (anime.title && typeof anime.title === 'object') {
            return anime.title.english || 
                   anime.title.romaji || 
                   anime.title.native || 
                   "Untitled";
        }
        return "Untitled";
    };

    // AniList image fetch - prioritize extraLarge, fallback to large, then banner
    const getAnimeImage = () => {
        if (!anime) return "/placeholder-anime.jpg";
        if (anime.coverImage) {
            return anime.coverImage.extraLarge || 
                   anime.coverImage.large || 
                   anime.coverImage.medium ||
                   anime.bannerImage || 
                   "/placeholder-anime.jpg";
        }
        return anime.bannerImage || "/placeholder-anime.jpg";
    };

    // Enhanced trailer video ID extraction for AniList data
    const getTrailerVideoId = () => {
        if (anime.trailer?.site === "youtube" && anime.trailer?.id) {
            return anime.trailer.id;
        }
        return null;
    };

    // AniList date formatting
    const formatAniListDate = (dateObj) => {
        if (!dateObj) return "TBA";

        if (typeof dateObj === 'string') {
            const date = new Date(dateObj);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const day = String(date.getDate()).padStart(2, "0");
            const month = months[date.getMonth()];
            return `${day} ${month} ${date.getFullYear()}`;
        }

        // AniList date object format: { year: 2023, month: 4, day: 5 }
        if (!dateObj.year) return "TBA";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = dateObj.day ? String(dateObj.day).padStart(2, "0") : "??";
        const month = dateObj.month ? months[dateObj.month - 1] : "??";
        return `${day} ${month} ${dateObj.year}`;
    };

    const genreColors = {
        Action: "linear-gradient(135deg, #ff4b2b, #ff416c)",
        Adventure: "linear-gradient(135deg, #ff8c00, #ffdb58)",
        Comedy: "linear-gradient(135deg, #ffcc00, #ffd700)",
        Drama: "linear-gradient(135deg, #ff69b4, #ff1493)",
        Fantasy: "linear-gradient(135deg, #8a2be2, #4b0082)",
        Horror: "linear-gradient(135deg, #ff0000, #8b0000)",
        Mystery: "linear-gradient(135deg, #00ced1, #1e90ff)",
        Romance: "linear-gradient(135deg, #ff1493, #ff69b4)",
        "Sci-Fi": "linear-gradient(135deg, #00bfff, #1e3c72)",
        Sports: "linear-gradient(135deg, #32cd32, #228b22)",
        Thriller: "linear-gradient(135deg, #ff4500, #ff6347)",
        "Slice of Life": "linear-gradient(135deg, #20b2aa, #008080)",
        Supernatural: "linear-gradient(135deg, #9932cc, #4b0082)"
    };

    const getScoreColor = (score) => {
        const numScore = parseFloat(score);
        if (numScore >= 80) return "#4ade80";
        if (numScore >= 70) return "#fbbf24";
        if (numScore >= 60) return "#fb923c";
        return "#ef4444";
    };

    // AniList status color mapping
    const getStatusColor = (status) => {
        if (!status) return "#6b7280";

        const normalizedStatus = status.toString().toUpperCase().replace(/\s+/g, '_');

        const statusColors = {
            "FINISHED": "#22c55e",
            "RELEASING": "#3b82f6",
            "NOT_YET_RELEASED": "#f59e0b",
            "CANCELLED": "#ef4444",
            "HIATUS": "#f59e0b"
        };

        return statusColors[normalizedStatus] || "#6b7280";
    };

    // AniList studio extraction
    const getStudioInfo = () => {
        if (!anime.studios) return "N/A";
        
        if (anime.studios.edges && Array.isArray(anime.studios.edges)) {
            return anime.studios.edges
                .filter(edge => edge.node && edge.node.name)
                .map(edge => edge.node.name)
                .join(", ") || "N/A";
        }
        
        if (anime.studios.nodes && Array.isArray(anime.studios.nodes)) {
            return anime.studios.nodes
                .filter(node => node && node.name)
                .map(node => node.name)
                .join(", ") || "N/A";
        }

        if (Array.isArray(anime.studios)) {
            return anime.studios
                .map(s => s.name || s)
                .filter(Boolean)
                .join(", ") || "N/A";
        }

        return "N/A";
    };

    // AniList genres extraction
    const getGenres = () => {
        if (!anime.genres || !Array.isArray(anime.genres)) return [];
        
        // Handle both string arrays and object arrays
        return anime.genres.map(g => {
            if (typeof g === 'string') return g;
            if (typeof g === 'object' && g.name) return g.name;
            return g;
        }).filter(Boolean);
    };

    // AniList score - averageScore is out of 100
    const getScore = () => {
        if (anime.averageScore) {
            return (anime.averageScore / 10).toFixed(1); // Convert to 10-point scale
        }
        // Handle other possible score formats
        if (anime.score && anime.score <= 10) {
            return anime.score.toFixed(1);
        }
        return null;
    };

    // AniList episodes
    const getEpisodes = () => {
        return anime.episodes || anime.episodeCount || "?";
    };

    // AniList rating
    const getRating = () => {
        if (anime.isAdult) return "R - 17+ (violence & profanity)";
        if (anime.rating) return anime.rating;
        // Default based on common AniList patterns
        return "PG-13";
    };

    // AniList aired info
    const getAiredInfo = () => {
        return anime.startDate ? formatAniListDate(anime.startDate) : "TBA";
    };

    // AniList aired range
    const getAiredRange = () => {
        if (anime.format === "MOVIE") {
            return getAiredInfo();
        }
        if (anime.startDate && anime.endDate) {
            return `${formatAniListDate(anime.startDate)} - ${formatAniListDate(anime.endDate)}`;
        }
        if (anime.startDate) {
            return `${getAiredInfo()} - ${anime.status === 'RELEASING' ? 'Ongoing' : 'TBA'}`;
        }
        return "TBA";
    };

    // AniList format display
    const getFormatDisplay = () => {
        if (!anime.format) return anime.type || "Unknown";
        
        const formatMap = {
            "TV": "TV",
            "TV_SHORT": "Short",
            "MOVIE": "Movie",
            "SPECIAL": "Special",
            "OVA": "OVA",
            "ONA": "ONA",
            "MUSIC": "Music"
        };
        
        return formatMap[anime.format] || anime.format;
    };

    const truncateSynopsis = (text, maxLength = 800) => {
        if (!text) return "No description available.";
        const cleanText = text.replace(/<[^>]*>/g, '');
        return cleanText.length > maxLength ? cleanText.substring(0, maxLength) + "..." : cleanText;
    };

    const fullSynopsis = anime.description || "No description available.";

    const handleSynopsisClick = () => {
        setSynopsisModalOpen(true);
    };

    const closeSynopsisModal = () => {
        setSynopsisModalOpen(false);
    };

    const currentTrailerVideoId = trailerVideoId || getTrailerVideoId();
    const animeTitle = getAnimeTitle();
    const animeImage = getAnimeImage();

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    {/* Banner image background */}
                    <div
                        className="modal-background"
                        style={{
                            backgroundImage: `url(${anime?.bannerImage || animeImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            filter: 'brightness(0.3)',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: -1,
                        }}
                    ></div>

                    {/* Close button */}
                    <button className="modal-close" onClick={onClose}>
                        <span className="close-icon">✖</span>
                    </button>

                    {/* Enhanced Title with dynamic sizing */}
                    <div className="modal-title">
                        <h2 ref={titleRef} title={animeTitle}>
                            {animeTitle}
                        </h2>
                    </div>

                    {/* Body with image left and info right */}
                    <div className="modal-body">
                        <div className="modal-image-wrapper">
                            <div className="image-container">
                                <img src={animeImage} alt={animeTitle} />
                                <div className="image-overlay"></div>

                                {/* add-to-list-buttons */}
                                <div className="add-to-list-buttons">
                                    {!isInList ? (
                                        <div className="list-options">
                                            <button
                                                className="list-option-btn watching-btn"
                                                onClick={() => addToList('watching')}
                                                disabled={isAddingToList}
                                            >
                                                {isAddingToList ? 'Adding...' : <><Plus size={16} /><span>Watching</span></>}
                                            </button>
                                            <button
                                                className="list-option-btn completed-btn"
                                                onClick={() => addToList('completed')}
                                                disabled={isAddingToList}
                                            >
                                                {isAddingToList ? 'Adding...' : <><Plus size={16} /><span>Completed</span></>}
                                            </button>
                                            <button
                                                className="list-option-btn planned-btn"
                                                onClick={() => addToList('planned')}
                                                disabled={isAddingToList}
                                            >
                                                {isAddingToList ? 'Adding...' : <><Plus size={16} /><span>Plan to Watch</span></>}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="already-in-list">
                                            <Check size={20} />
                                            <span>In your {userListStatus} list</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(getFormatDisplay() || getAiredInfo()) && (
                                <div className="anime-type-badge">
                                    <div className="badge-content">
                                        <div className="badge-row">
                                            <span className="badge-type">{getFormatDisplay()}</span>
                                            <span className="badge-date">{getAiredRange()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-info">
                            <div className="info-buttons">
                                <button
                                    className={`info-btn synopsis-btn ${activeTab === 'info' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('info')}
                                >
                                    <span className="btn-icon"></span>
                                    <span className="btn-text">Synopsis</span>
                                    <div className="btn-glow"></div>
                                </button>
                                <button
                                    className={`info-btn related-btn ${activeTab === 'related' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('related')}
                                >
                                    <span className="btn-icon"></span>
                                    <span className="btn-text">Related</span>
                                    <div className="btn-glow"></div>
                                </button>
                                <button
                                    className={`info-btn trailer-btn ${activeTab === 'trailer' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('trailer')}
                                >
                                    <span className="btn-icon"></span>
                                    <span className="btn-text">Trailer</span>
                                    <div className="btn-glow"></div>
                                </button>
                            </div>

                            <div className="tab-content">
                                <AnimatePresence mode="wait">
                                    {activeTab === "info" && (
                                        <motion.div
                                            key="info"
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -30 }}
                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                        >
                                            <div className="stats-grid">
                                                <div className="stat-item">
                                                    <span className="stat-label">Episodes :</span>
                                                    <span className="stat-value">{getEpisodes()}</span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Score :</span>
                                                    <span
                                                        className="stat-value score"
                                                        style={{ color: getScoreColor(anime.averageScore) }}
                                                    >
                                                        ⭐ {getScore() || "N/A"}
                                                    </span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Age Rating :</span>
                                                    <span className="stat-value age-rating">{getRating()}</span>
                                                </div>
                                            </div>

                                            <div className="synopsis-section">
                                                <p className="synopsis-text">
                                                    {truncateSynopsis(fullSynopsis, 800)}
                                                </p>
                                                {fullSynopsis.length > 800 && (
                                                    <button className="read-more-btn" onClick={handleSynopsisClick}>
                                                        Read More
                                                    </button>
                                                )}
                                            </div>

                                            <div className="anime-info-vertical">
                                                <div className="info-row status-row">
                                                    <strong className="info-label">
                                                        <span className="label-icon"></span>
                                                        Status :
                                                    </strong>
                                                    <span
                                                        className="info-value status-value"
                                                        style={{ color: getStatusColor(anime.status) }}
                                                    >
                                                        <span
                                                            className="status-indicator"
                                                            style={{
                                                                backgroundColor: getStatusColor(anime.status),
                                                                boxShadow: `0 0 10px ${getStatusColor(anime.status)}`
                                                            }}
                                                        ></span>
                                                        {anime.status || "Unknown"}
                                                    </span>
                                                </div>

                                                <div className="info-row genre-row">
                                                    <strong className="info-label">
                                                        <span className="label-icon"></span>
                                                        Genres :
                                                    </strong>
                                                    <div className="genre-tags">
                                                        {getGenres().length > 0 ? (
                                                            getGenres().map((genre, i) => {
                                                                const bgColor = genreColors[genre] || "linear-gradient(135deg, #666, #888)";
                                                                return (
                                                                    <span
                                                                        key={i}
                                                                        className="genre-pill"
                                                                        style={{ background: bgColor }}
                                                                    >
                                                                        {genre}
                                                                    </span>
                                                                );
                                                            })
                                                        ) : (
                                                            <span className="genre-pill no-genre">N/A</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="info-row studio-row">
                                                    <strong className="info-label">
                                                        <span className="label-icon"></span>
                                                        Studio :
                                                    </strong>
                                                    <span className="info-value studio-value">
                                                        {getStudioInfo()}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeTab === 'related' && (
                                        <motion.div
                                            key="related"
                                            initial={{ opacity: 0, x: 0 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -30 }}
                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                            className="related-tab-wrapper"
                                        >
                                            <RelatedTab
                                                animeId={anime.id}
                                                animeMalId={anime.idMal}
                                                onSelect={(selectedNormalizedAnime) => {
                                                    console.log("Modal received related anime:", selectedNormalizedAnime);
                                                    if (typeof onOpenAnime === "function") {
                                                        onOpenAnime(selectedNormalizedAnime);
                                                        setActiveTab("info");
                                                        setTrailerVideoId(null);
                                                    } else {
                                                        console.warn("onOpenAnime not provided to Modal; selected:", selectedNormalizedAnime);
                                                    }
                                                }}
                                            />
                                        </motion.div>
                                    )}

                                    {activeTab === 'trailer' && (
                                        <motion.div
                                            key="trailer"
                                            initial={{ opacity: 0, x: 0 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -30 }}
                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                            className="trailer-tab-wrapper"
                                        >
                                            {currentTrailerVideoId ? (
                                                <Trailer
                                                    key={`trailer-${anime.id}-${currentTrailerVideoId}`}
                                                    videoId={currentTrailerVideoId}
                                                />
                                            ) : (
                                                <div className="no-trailer">
                                                    <p>No trailer available for this anime.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Synopsis Modal */}
            {synopsisModalOpen && (
                <div className="synopsis-modal-overlay" onClick={closeSynopsisModal}>
                    <div className="synopsis-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="synopsis-modal-close" onClick={closeSynopsisModal}>
                            <span className="close-icon">✖</span>
                        </button>

                        <div className="synopsis-modal-header">
                            <h3>{animeTitle} - Synopsis</h3>
                        </div>

                        <div className="synopsis-modal-body">
                            <p className="full-synopsis-text">{fullSynopsis}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Modal;