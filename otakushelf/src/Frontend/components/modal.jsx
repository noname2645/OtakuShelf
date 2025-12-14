// Enhanced Modal Component - Fixed Hooks Order Issue
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "../Stylesheets/modal.css";
import RelatedTab from "./relatedsection.jsx";
import Trailer from "./trailer";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check } from 'lucide-react';
import { useAuth } from "../components/AuthContext.jsx";
import axios from "axios";

const Modal = ({ isOpen, onClose, anime, onOpenAnime }) => {
    // ALL STATE AND REFS FIRST - ALWAYS CALLED
    const [synopsisModalOpen, setSynopsisModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("info");
    const [trailerVideoId, setTrailerVideoId] = useState(null);
    const titleRef = useRef(null);
    const [isAddingToList, setIsAddingToList] = useState(false);
    const [isInList, setIsInList] = useState(false);
    const [userListStatus, setUserListStatus] = useState(null);
    const { user } = useAuth();
    const isMobile = window.innerWidth <= 480;
    const synopsisLimit = isMobile ? 70 : 600;


    // ALL CALLBACKS - ALWAYS CALLED, NO CONDITIONS
    const formatAniListDate = useCallback((dateObj) => {
        if (!dateObj) return "TBA";

        if (typeof dateObj === 'string') {
            const date = new Date(dateObj);
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
    }, []);

    const getScoreColor = useCallback((score) => {
        const numScore = parseFloat(score);
        if (numScore >= 80) return "#4ade80";
        if (numScore >= 70) return "#fbbf24";
        if (numScore >= 60) return "#fb923c";
        return "#ef4444";
    }, []);

    const getStatusColor = useCallback((status) => {
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
    }, []);

    const truncateSynopsis = useCallback((text, maxLength = 800) => {
        if (!text) return "No description available.";
        const cleanText = text.replace(/<[^>]*>/g, '');
        return cleanText.length > maxLength ? cleanText.substring(0, maxLength) + "..." : cleanText;
    }, []);

    const handleSynopsisClick = useCallback(() => {
        setSynopsisModalOpen(true);
    }, []);

    const closeSynopsisModal = useCallback(() => {
        setSynopsisModalOpen(false);
    }, []);

    const getAiredRange = useCallback(() => {
        if (!anime) return "TBA";
        if (anime.format === "MOVIE") {
            return anime.startDate ? formatAniListDate(anime.startDate) : "TBA";
        }
        if (anime.startDate && anime.endDate) {
            return `${formatAniListDate(anime.startDate)} - ${formatAniListDate(anime.endDate)}`;
        }
        if (anime.startDate) {
            const startDate = formatAniListDate(anime.startDate);
            return `${startDate} - ${anime.status === 'RELEASING' ? 'Ongoing' : 'TBA'}`;
        }
        return "TBA";
    }, [anime, formatAniListDate]);

    const checkIfInList = useCallback(async () => {
        if (!user || !anime) return;

        try {
            const response = await axios.get(`http://localhost:5000/api/list/${user._id || user.id}`);
            const userList = response.data;
            const categories = ['watching', 'completed', 'planned', 'dropped'];
            let foundStatus = null;

            // Get the anime title
            let animeTitle = "Untitled";
            if (anime) {
                if (typeof anime.title === 'string') {
                    animeTitle = anime.title;
                } else if (anime.title && typeof anime.title === 'object') {
                    animeTitle = anime.title.english || anime.title.romaji || anime.title.native || "Untitled";
                }
            }

            for (const category of categories) {
                const animeInCategory = userList[category] || [];
                const foundAnime = animeInCategory.find(item => {
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

    // ALL MEMOS - ALWAYS CALLED
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

        return {
            title: (() => {
                if (typeof anime.title === 'string') return anime.title;
                if (anime.title && typeof anime.title === 'object') {
                    return anime.title.english || anime.title.romaji || anime.title.native || "Untitled";
                }
                return "Untitled";
            })(),
            image: (() => {
                if (anime.coverImage) {
                    return anime.coverImage.extraLarge ||
                        anime.coverImage.large ||
                        anime.coverImage.medium ||
                        anime.bannerImage ||
                        "/placeholder-anime.jpg";
                }
                return anime.bannerImage || "/placeholder-anime.jpg";
            })(),
            trailerVideoId: anime.trailer?.site === "youtube" && anime.trailer?.id ? anime.trailer.id : null,
            genres: (() => {
                if (!anime.genres || !Array.isArray(anime.genres)) return [];
                return anime.genres.map(g => {
                    if (typeof g === 'string') return g;
                    if (typeof g === 'object' && g.name) return g.name;
                    return g;
                }).filter(Boolean);
            })(),
            score: (() => {
                if (anime.score && anime.score !== "N/A") return (anime.score / 10).toFixed(1);
                if (anime.averageScore) return (anime.averageScore / 10).toFixed(1);
                return null;
            })(),
            episodes: anime.episodes || anime.episodeCount || "?",
            studio: (() => {
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
                    return anime.studios.map(s => s.name || s).filter(Boolean).join(", ") || "N/A";
                }
                return "N/A";
            })(),
            status: anime.status || "Unknown",
            format: (() => {
                if (!anime.format) return anime.type || "Unknown";
                const formatMap = {
                    "TV": "TV", "TV_SHORT": "Short", "MOVIE": "Movie",
                    "SPECIAL": "Special", "OVA": "OVA", "ONA": "ONA", "MUSIC": "Music"
                };
                return formatMap[anime.format] || anime.format;
            })(),
            rating: (() => {
                if (anime.isAdult) return "R - 17+ (violence & profanity)";
                if (anime.rating) return anime.rating;
                return "PG-13";
            })(),
            synopsis: (() => {
                const stripHTML = (html) => {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    return doc.body.textContent || "";
                };
                return stripHTML(anime.description || "No description available.");
            })()
        };
    }, [anime]);

    const genreColors = useMemo(() => ({
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
    }), []);

    // Enhanced background scroll prevention
    useEffect(() => {
        if (isOpen || synopsisModalOpen) {
            // Store original values
            const originalBodyOverflow = document.body.style.overflow;
            const originalBodyPaddingRight = document.body.style.paddingRight;
            const originalBodyPosition = document.body.style.position;
            const originalBodyTop = document.body.style.top;
            const originalBodyWidth = document.body.style.width;
            const originalHtmlOverflow = document.documentElement.style.overflow;

            // Get current scroll position
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;

            // Calculate scrollbar width to prevent layout shift
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

            useEffect(() => {
                if (isOpen || synopsisModalOpen) {
                    document.body.classList.add('modal-open');
                } else {
                    document.body.classList.remove('modal-open');
                }

                return () => {
                    document.body.classList.remove('modal-open');
                };
            }, [isOpen, synopsisModalOpen]);



            document.body.classList.add('modal-open');
            // on close
            document.body.classList.remove('modal-open');


            return () => {
                // Restore original styles
                document.body.style.overflow = originalBodyOverflow;
                document.body.style.paddingRight = originalBodyPaddingRight;
                document.body.style.position = originalBodyPosition;
                document.body.style.top = originalBodyTop;
                document.body.style.left = '';
                document.body.style.width = originalBodyWidth;
                document.documentElement.style.overflow = originalHtmlOverflow;

                // Restore scroll position
                if (scrollY > 0 || scrollX > 0) {
                    window.scrollTo(scrollX, scrollY);
                }
            };
        }
    }, [isOpen, synopsisModalOpen]);

    useEffect(() => {
        if (titleRef.current && animeData && isOpen) {
            const updateTitleClasses = () => {
                requestAnimationFrame(() => {
                    const titleElement = titleRef.current;
                    if (!titleElement) return;

                    titleElement.classList.remove('long-title', 'very-long-title');

                    const titleLength = animeData.title.length;
                    if (titleLength > 60) {
                        titleElement.classList.add('very-long-title');
                    } else if (titleLength > 35) {
                        titleElement.classList.add('long-title');
                    }
                });
            };

            updateTitleClasses();
        }
    }, [animeData, isOpen]);

    useEffect(() => {
        if (isOpen && user && animeData && anime) {
            const timeoutId = setTimeout(() => {
                checkIfInList();
            }, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [isOpen, user, animeData, anime, checkIfInList]);

    useEffect(() => {
        if (anime?.id) {
            setSynopsisModalOpen(false);
            setActiveTab("info");
            setTrailerVideoId(animeData?.trailerVideoId || null);
        }
    }, [anime?.id, animeData?.trailerVideoId]);

    // NOW EARLY RETURN - AFTER ALL HOOKS
    if (!isOpen || !anime) return null;

    console.log("Modal received AniList anime data:", anime);

    // REGULAR FUNCTIONS - NOT HOOKS
    const addToList = async (status) => {
        if (!user) {
            alert("Please log in to add anime to your list");
            return;
        }

        setIsAddingToList(true);
        try {
            await axios.post(`http://localhost:5000/api/list/${user._id || user.id}`, {
                category: status,
                animeTitle: animeData.title,
                animeData: anime
            });

            setIsInList(true);
            setUserListStatus(status);

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
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                                <img src={animeData.image} alt={animeData.title} loading="eager" />
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

                            {(animeData.format || getAiredRange()) && (
                                <div className="anime-type-badge">
                                    <div className="badge-content">
                                        <div className="badge-row">
                                            <span className="badge-type">{animeData.format}</span>
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
                                            <div className="stats-grid2">
                                                <div className="stat-item">
                                                    <span className="stat-label desktop-only">Episodes :</span>
                                                    <span className="stat-value">{animeData.episodes} Episodes</span>

                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label desktop-only">Score :</span>
                                                    <span className="stat-value score">⭐ {animeData.score || "N/A"}</span>

                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label desktop-only">Age Rating :</span>
                                                    <span className="stat-value age-rating">{animeData.rating}</span>

                                                </div>
                                            </div>

                                            <div className="synopsis-section">
                                                <p className="synopsis-text">
                                                    {truncateSynopsis(animeData.synopsis, synopsisLimit)}
                                                </p>

                                                {animeData.synopsis.length > synopsisLimit && (
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
                                                        style={{ color: getStatusColor(animeData.status) }}
                                                    >
                                                        <span
                                                            className="status-indicator"
                                                            style={{
                                                                backgroundColor: getStatusColor(animeData.status),
                                                                boxShadow: `0 0 10px ${getStatusColor(animeData.status)}`
                                                            }}
                                                        ></span>
                                                        {animeData.status}
                                                    </span>
                                                </div>

                                                <div className="info-row genre-row">
                                                    <strong className="info-label">
                                                        <span className="label-icon"></span>
                                                        Genre:
                                                    </strong>
                                                    <div className="genre-tags">
                                                        {animeData.genres.length > 0 ? (
                                                            animeData.genres.map((genre, i) => {
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
                                                        {animeData.studio}
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
                            <h3>{animeData.title} - Synopsis</h3>
                        </div>

                        <div className="synopsis-modal-body">
                            <p className="full-synopsis-text">{animeData.synopsis}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Modal;