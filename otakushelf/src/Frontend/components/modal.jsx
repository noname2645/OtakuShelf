// Ultra-Performance Modal Component - Optimized for 4x CPU slowdown + 3G
import React, { useState, useEffect, useRef, useMemo } from "react";
import "../Stylesheets/modal.css";
import RelatedTab from "./relatedsection.jsx";
import Trailer from "./trailer";
import { Eye, CheckCircle, Clock, Check } from 'lucide-react';
import { useAuth } from "../components/AuthContext.jsx";
import api from "../api.js";
import { motion, AnimatePresence } from "framer-motion";

// Performance constants - computed once
const IS_MOBILE = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
const SYNOPSIS_LIMIT = IS_MOBILE ? 70 : 600;

const Modal = ({ isOpen, onClose, anime, onOpenAnime }) => {
    // ALL STATE AND REFS
    const [synopsisModalOpen, setSynopsisModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("info");
    const [trailerVideoId, setTrailerVideoId] = useState(null);
    const titleRef = useRef(null);
    const [isAddingToList, setIsAddingToList] = useState(false);
    const [isInList, setIsInList] = useState(false);
    const [userListStatus, setUserListStatus] = useState(null);
    const { user } = useAuth();
    const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    const [enriched, setEnriched] = useState(null);

    // HELPER FUNCTIONS - No hooks for simple functions
    const formatAniListDate = (dateObj) => {
        if (!dateObj) return "TBA";
        if (typeof dateObj === 'string') {
            const date = new Date(dateObj);
            if (isNaN(date.getTime())) return "TBA";
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const day = String(date.getDate()).padStart(2, "0");
            const month = months[date.getMonth()];
            return `${day} ${month} ${date.getFullYear()}`;
        }
        if (!dateObj.year) return "TBA";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = dateObj.day ? String(dateObj.day).padStart(2, "0") : "??";
        const month = dateObj.month ? months[dateObj.month - 1] : "??";
        return `${day} ${month} ${dateObj.year}`;
    };

    const getScoreColor = (score) => {
        const numScore = parseFloat(score);
        if (numScore >= 80) return "#4ade80";
        if (numScore >= 70) return "#fbbf24";
        if (numScore >= 60) return "#fb923c";
        return "#ef4444";
    };

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

    const formatStatus = (status) => {
        if (!status) return "Unknown";
        const normalizedStatus = status.toString().toUpperCase().replace(/\s+/g, '_');
        const statusMap = {
            "RELEASING": "Airing",
            "FINISHED": "Finished Airing",
            "NOT_YET_RELEASED": "Upcoming",
            "CANCELLED": "Cancelled",
            "HIATUS": "On Hiatus",
            "ANNOUNCED": "Announced"
        };
        return statusMap[normalizedStatus] || status;
    };

    const truncateSynopsis = (text, maxLength = 800) => {
        if (!text) return "No description available.";
        const cleanText = text.replace(/<[^>]*>/g, '');
        return cleanText.length > maxLength ? cleanText.substring(0, maxLength) + "..." : cleanText;
    };

    const getAiredRange = () => {
        const src = enriched || anime;
        if (!src) return "TBA";

        const isValidDateObj = (d) => d && (typeof d === 'string' || d.year);

        const hasStart = isValidDateObj(src.startDate);
        const hasEnd = isValidDateObj(src.endDate);

        if (src.format === "MOVIE") {
            return hasStart ? formatAniListDate(src.startDate) : "TBA";
        }

        if (hasStart && hasEnd) {
            const start = formatAniListDate(src.startDate);
            const end = formatAniListDate(src.endDate);
            if (start === "TBA" && end === "TBA") {
                if (src.seasonYear) return String(src.seasonYear);
                if (src.year) return String(src.year);
                return "TBA";
            }
            return `${start} - ${end}`;
        }

        if (hasStart) {
            const startDate = formatAniListDate(src.startDate);
            if (startDate === "TBA") {
                if (src.seasonYear) return String(src.seasonYear);
                if (src.year) return String(src.year);
                return "TBA";
            }
            const isOngoing = src.status === 'RELEASING' || !src.endDate;
            return `${startDate} - ${isOngoing ? 'Ongoing' : '?'}`;
        }

        if (src.seasonYear) return String(src.seasonYear);
        if (src.year) return String(src.year);

        return "TBA";
    };

    // Optimized animeData memo - minimal computations
    const animeData = useMemo(() => {
        if (!anime) {
            return {
                title: "Untitled",
                image: "/placeholder-anime.jpg",
                trailerVideoId: null,
                genres: [],
                score: null,
                episodes: "?",
                studio: "N/A",
                status: "Unknown",
                format: "Unknown",
                rating: "PG-13",
                synopsis: "No description available."
            };
        }

        // Merge enriched details over the sparse prop, so every field is filled
        const src = (enriched?.id || enriched?.title) ? { ...anime, ...enriched } : anime;

        // Fast title extraction
        let title = "Untitled";
        if (typeof src.title === 'string') {
            title = src.title;
        } else if (src.title) {
            title = src.title.english || src.title.romaji || src.title.native || "Untitled";
        }

        // Fast image extraction
        let image = "/placeholder-anime.jpg";
        if (src.coverImage) {
            image = src.coverImage.extraLarge || src.coverImage.large || src.coverImage.medium || image;
        }
        if (!image || image === "/placeholder-anime.jpg") {
            image = src.bannerImage || image;
        }

        // Fast genre extraction
        let genres = [];
        if (Array.isArray(src.genres)) {
            genres = src.genres.slice(0, 5); // Limit to 5 genres
        }

        // Fast score calculation
        let score = null;
        if (src.averageScore) {
            score = (src.averageScore / 10).toFixed(1);
        } else if (src.score && src.score !== "N/A") {
            score = (src.score / 10).toFixed(1);
        }

        // Fast studio extraction
        let studio = "N/A";
        if (src.studios) {
            if (Array.isArray(src.studios)) {
                if (src.studios.length > 0) {
                    if (typeof src.studios[0] === 'string') {
                        studio = src.studios.slice(0, 2).join(", ");
                    } else {
                        studio = src.studios.slice(0, 2).map(s => s.name).filter(Boolean).join(", ");
                    }
                }
            } else if (src.studios.edges) {
                const edges = src.studios.edges.slice(0, 2);
                studio = edges.map(edge => edge?.node?.name).filter(Boolean).join(", ") || "N/A";
            } else if (src.studios.nodes) {
                const nodes = src.studios.nodes.slice(0, 2);
                studio = nodes.map(node => node?.name).filter(Boolean).join(", ") || "N/A";
            }
        }

        // Fast format mapping
        const formatMap = {
            "TV": "TV", "TV_SHORT": "Short", "MOVIE": "Movie",
            "SPECIAL": "Special", "OVA": "OVA", "ONA": "ONA", "MUSIC": "Music"
        };
        const format = src.format ? (formatMap[src.format] || src.format) : (src.type || "Unknown");

        return {
            title,
            image,
            trailerVideoId: src.trailer?.site === "youtube" && src.trailer?.id ? src.trailer.id : null,
            genres,
            score,
            episodes: src.episodes || src.episodeCount || "?",
            studio,
            status: src.status || "Unknown",
            format,
            rating: src.isAdult ? "R 17+ (violence & profanity)" : (Array.isArray(src.genres) && src.genres.includes("Ecchi") ? "R+ Mild Nudity" : "PG-13"),
            synopsis: src.description?.replace(/<[^>]*>/g, '') || "No description available."
        };
    }, [anime, enriched]);

    // Static genre colors for mobile (solid), gradients for desktop
    const getGenreColor = (genre) => {
        if (IS_MOBILE) {
            // Solid colors for mobile performance
            const solidColors = {
                Action: "#ff4b2b",
                Adventure: "#ff8c00",
                Comedy: "#ffcc00",
                Drama: "#ff69b4",
                Fantasy: "#8a2be2",
                Horror: "#ff0000",
                Mystery: "#00ced1",
                Romance: "#ff1493",
                "Sci-Fi": "#00bfff",
                Sports: "#32cd32",
                Thriller: "#ff4500",
                "Slice of Life": "#20b2aa",
                Supernatural: "#9932cc"
            };
            return solidColors[genre] || "#666";
        }

        // Gradients for desktop
        const gradientColors = {
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
        return gradientColors[genre] || "linear-gradient(135deg, #666, #888)";
    };

    // Check if anime is in user's list
    const checkIfInList = async () => {
        if (!user || !anime) return;

        try {
            const response = await api.get(`${API}/api/list/${user._id || user.id}`);
            const userList = response.data.data; // Standardized response
            const categories = ['watching', 'completed', 'planned', 'dropped'];
            let foundStatus = null;

            const animeTitle = typeof anime.title === 'string'
                ? anime.title
                : anime.title?.english || anime.title?.romaji || anime.title?.native || "Untitled";

            for (const category of categories) {
                const animeInCategory = userList[category] || [];
                for (const item of animeInCategory) {
                    if (item.title === animeTitle ||
                        item.animeId === anime.id?.toString() ||
                        item.malId === anime.idMal?.toString()) {
                        foundStatus = category;
                        break;
                    }
                }
                if (foundStatus) break;
            }

            setIsInList(foundStatus !== null);
            setUserListStatus(foundStatus);
        } catch (error) {
            console.error("Error checking if anime is in list:", error);
            setIsInList(false);
            setUserListStatus(null);
        }
    };

    // Fetch enriched anime details (description, studios, dates, etc.) when modal opens
    useEffect(() => {
        if (!isOpen || !anime) return;
        setEnriched(null);
        const rawId = anime.id ?? anime.animeId;
        const idNum = typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10);
        if (!idNum) return;
        const isMalImport = anime.malId && anime.animeId && String(anime.malId) === String(anime.animeId);
        let cancelled = false;
        const fetchDetails = async () => {
            try {
                const res = await api.get(`${API}/api/anime/anime/${idNum}${isMalImport ? '?mal=1' : ''}`);
                if (!cancelled && res.data?.data) setEnriched(res.data.data);
            } catch (e) {}
        };
        const isSparse = !anime.description || !anime.startDate || !anime.studios?.length || !anime.trailer || !anime.averageScore || !anime.status || !anime.format;
        if (isSparse) fetchDetails();
        return () => { cancelled = true; };
    }, [isOpen, anime?.id, anime?.animeId, anime?.malId]);

    // Single optimized useEffect
    useEffect(() => {
        if (!isOpen || !anime) return;

        // Add modal-open class to both body and html for maximum compatibility
        document.body.classList.add('modal-open');
        document.documentElement.classList.add('modal-open');

        // Update title classes (delayed for performance)
        if (titleRef.current && animeData) {
            setTimeout(() => {
                const titleElement = titleRef.current;
                if (!titleElement) return;

                const titleLength = animeData.title.length;
                titleElement.classList.remove('long-title', 'very-long-title');

                if (titleLength > 60) {
                    titleElement.classList.add('very-long-title');
                } else if (titleLength > 35) {
                    titleElement.classList.add('long-title');
                }
            }, 50);
        }

        // Check if in list (debounced)
        if (user) {
            const timeoutId = setTimeout(() => {
                checkIfInList();
            }, 200);
            return () => {
                clearTimeout(timeoutId);
                document.body.classList.remove('modal-open');
                document.documentElement.classList.remove('modal-open');
            };
        }

        return () => {
            document.body.classList.remove('modal-open');
            document.documentElement.classList.remove('modal-open');
        };
    }, [isOpen, anime, animeData, user]);

    // Reset effect for anime changes
    useEffect(() => {
        if (anime?.id || anime?.animeId) {
            setSynopsisModalOpen(false);
            setActiveTab("info");
            setTrailerVideoId(animeData?.trailerVideoId || null);
        }
    }, [anime?.id, anime?.animeId, animeData?.trailerVideoId]);

    // EARLY RETURN — AnimatePresence handles exit, so we still return null when closed
    if (!isOpen || !anime) return null;

    // ACTION FUNCTIONS
    const addToList = async (status) => {
        if (!user) {
            alert("Please log in to add anime to your list");
            return;
        }

        setIsAddingToList(true);
        try {
            await api.post(`${API}/api/list/${user._id || user.id}`, {
                category: status,
                anime: {
                    animeId: anime.id?.toString() || anime.animeId || '',
                    title: animeData.title,
                    malId: anime.idMal?.toString() || anime.malId || '',
                    image: animeData.image,
                    totalEpisodes: anime.episodes || anime.episodeCount || (typeof animeData.episodes === 'number' ? animeData.episodes : 0),
                    genres: Array.isArray(anime.genres) ? anime.genres : [],
                    userRating: 0,
                }
            });

            setIsInList(true);
            setUserListStatus(status);

            // Re-check after adding
            setTimeout(() => checkIfInList(), 100);
        } catch (error) {
            console.error("Error adding to list:", error);
            alert("Failed to add to list");
        } finally {
            setIsAddingToList(false);
        }
    };

    const currentTrailerVideoId = trailerVideoId || animeData.trailerVideoId;

    return (
        <>
            <motion.div
                className="modal-overlay"
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
            >
                <motion.div
                    className="modal-content"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, y: 40, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.97 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                    {/* Banner image background */}
                    <div
                        className="modal-background"
                        style={{
                            backgroundImage: `url(${anime?.bannerImage || animeData.image})`,
                        }}
                    ></div>

                    {/* Close button */}
                    <button className="modal-close" onClick={onClose}>
                        <span className="close-icon">✖</span>
                    </button>

                    {/* Enhanced Title with dynamic sizing */}
                    <div className="modal-title">
                        <h2 ref={titleRef} title={animeData.title}>
                            {animeData.title}
                        </h2>
                    </div>

                    {/* Body with image left and info right */}
                    <div className="modal-body">
                        <div className="modal-image-wrapper">
                            <div className="image-container">
                                <img
                                    src={animeData.image}
                                    alt={animeData.title}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>

                            {(() => {
                                const airedRange = getAiredRange();
                                const hasDateInfo = airedRange && airedRange !== "TBA";
                                const displayStatus = hasDateInfo ? airedRange : formatStatus(animeData.status);
                                const displayText = animeData.format ? `${animeData.format} - ${displayStatus}` : displayStatus;

                                if (!displayText || displayText === " - ") return null;

                                return (
                                    <div className="anime-type-badge">
                                        <div className="badge-content">
                                            <div className="badge-row">
                                                <span className="badge-type">{displayText}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="modal-info">
                            <div className="stats-grid2">
                                <div className="stat-item">
                                    <span className="stat-label2">Episodes :</span>
                                    <span className="stat-value">{animeData.episodes} Episodes</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label2">Score :</span>
                                    <span className="stat-value score">⭐ {animeData.score || "N/A"}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label2">Age Rating :</span>
                                    <span className="stat-value age-rating">{animeData.rating}</span>
                                </div>
                            </div>

                            <div className="action-row">
                                <div className="info-buttons">
                                    <button
                                        className={`info-btn ${activeTab === 'info' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('info')}
                                    >
                                        Synopsis
                                    </button>
                                    <button
                                        className={`info-btn ${activeTab === 'related' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('related')}
                                    >
                                        Related
                                    </button>
                                    <button
                                        className={`info-btn ${activeTab === 'trailer' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('trailer')}
                                    >
                                        Trailer
                                    </button>
                                </div>

                                {!isInList ? (
                                    <div className="list-options">
                                        <button
                                            className="list-option-btn watching-btn"
                                            onClick={() => addToList('watching')}
                                            disabled={isAddingToList}
                                        >
                                            {isAddingToList ? 'Adding...' : <><Eye size={13} /><span>Watching</span></>}
                                        </button>
                                        <button
                                            className="list-option-btn completed-btn"
                                            onClick={() => addToList('completed')}
                                            disabled={isAddingToList}
                                        >
                                            {isAddingToList ? 'Adding...' : <><CheckCircle size={13} /><span>Completed</span></>}
                                        </button>
                                        <button
                                            className="list-option-btn planned-btn"
                                            onClick={() => addToList('planned')}
                                            disabled={isAddingToList}
                                        >
                                            {isAddingToList ? 'Adding...' : <><Clock size={13} /><span>Plan to Watch</span></>}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="already-in-list">
                                        <Check size={18} />
                                        <span>In your {userListStatus} list</span>
                                    </div>
                                )}
                            </div>

                            <div className="tab-content">
                                <AnimatePresence mode="wait">
                                    {activeTab === "info" && (
                                        <motion.div
                                            key="info"
                                            className="info-tab-content"
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 12 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            <div className="synopsis-section">
                                                <p className="synopsis-text">
                                                    {truncateSynopsis(animeData.synopsis, SYNOPSIS_LIMIT)}
                                                </p>

                                                {animeData.synopsis.length > SYNOPSIS_LIMIT && (
                                                    <button
                                                        className="read-more-btn"
                                                        onClick={() => setSynopsisModalOpen(true)}
                                                    >
                                                        Read More
                                                    </button>
                                                )}
                                            </div>

                                            <div className="anime-info-vertical">
                                                <div className="info-row status-row">
                                                    <strong className="info-label">Status :</strong>
                                                    <span
                                                        className="info-value status-value"
                                                        style={{ color: getStatusColor(animeData.status) }}
                                                    >
                                                        <span
                                                            className="status-indicator"
                                                            style={{
                                                                backgroundColor: getStatusColor(animeData.status)
                                                            }}
                                                        ></span>
                                                        {animeData.status}
                                                    </span>
                                                </div>

                                                <div className="info-row genre-row">
                                                    <strong className="info-label">Genre:</strong>
                                                    <div className="genre-tags">
                                                        {animeData.genres.length > 0 ? (
                                                            animeData.genres.map((genre, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="genre-pill"
                                                                    style={{ background: getGenreColor(genre) }}
                                                                >
                                                                    {genre}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="genre-pill no-genre">N/A</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="info-row studio-row">
                                                    <strong className="info-label">Studio :</strong>
                                                    <span className="info-value studio-value">
                                                        {animeData.studio}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeTab === 'related' && (
                                        <motion.div
                                            key="related"
                                            className="related-tab-wrapper"
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 12 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            <RelatedTab
                                                animeId={anime.id}
                                                animeMalId={anime.idMal}
                                                onSelect={(selectedAnime) => {
                                                    if (typeof onOpenAnime === "function") {
                                                        const normalizedAnime = {
                                                            id: selectedAnime.id,
                                                            idMal: selectedAnime.idMal,
                                                            title: selectedAnime.title,
                                                            coverImage: selectedAnime.coverImage,
                                                            bannerImage: selectedAnime.bannerImage,
                                                            description: selectedAnime.description,
                                                            episodes: selectedAnime.episodes,
                                                            format: selectedAnime.format,
                                                            status: selectedAnime.status,
                                                            genres: selectedAnime.genres,
                                                            averageScore: selectedAnime.averageScore,
                                                            trailer: selectedAnime.trailer,
                                                            studios: selectedAnime.studios,
                                                            ...selectedAnime._originalData
                                                        };
                                                        onOpenAnime(normalizedAnime);
                                                        setActiveTab("info");
                                                        setTrailerVideoId(null);
                                                    }
                                                }}
                                            />
                                        </motion.div>
                                    )}

                                    {activeTab === 'trailer' && (
                                        <motion.div
                                            key="trailer"
                                            className="trailer-tab-wrapper"
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 12 }}
                                            transition={{ duration: 0.25 }}
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
                </motion.div>
            </motion.div>

            {/* Synopsis Modal — animated */}
            <AnimatePresence>
                {synopsisModalOpen && (
                    <motion.div
                        className="synopsis-modal-overlay"
                        onClick={() => setSynopsisModalOpen(false)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <motion.div
                            className="synopsis-modal-content"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, y: 30, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <button className="synopsis-modal-close" onClick={() => setSynopsisModalOpen(false)}>
                                <span className="close-icon">✖</span>
                            </button>

                            <div className="synopsis-modal-header">
                                <h3>{animeData.title} - Synopsis</h3>
                            </div>

                            <div className="synopsis-modal-body">
                                <p className="full-synopsis-text">{animeData.synopsis}</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Modal;