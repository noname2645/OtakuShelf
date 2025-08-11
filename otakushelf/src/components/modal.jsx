// src/components/Modal.jsx
import React, { useState, useEffect } from "react";
import "../Stylesheets/modal.css";

const Modal = ({ isOpen, onClose, anime }) => {
    const [synopsisModalOpen, setSynopsisModalOpen] = useState(false);

    // Prevent background scrolling when modal is open - MUST be before early return
    useEffect(() => {
        if (isOpen || synopsisModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup when component unmounts
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, synopsisModalOpen]);

    if (!isOpen || !anime) return null;

    // Universal title fetch (AniList + Jikan)
    const animeTitle =
        anime.title?.english ||
        anime.title_english ||
        anime.title?.romaji ||
        anime.title ||
        "Untitled";

    // Universal image fetch (AniList + Jikan)
    const animeImage =
        anime.bannerImage ||
        anime.coverImage?.extraLarge ||
        anime.coverImage?.large ||
        anime.images?.jpg?.large_image_url ||
        anime.image_url;

    const formatDate = (dateObj) => {
        if (!dateObj?.year) return "TBA";
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
        if (numScore >= 8) return "#4ade80"; // green
        if (numScore >= 7) return "#fbbf24"; // yellow
        if (numScore >= 6) return "#fb923c"; // orange
        return "#ef4444"; // red
    };

    const getStatusColor = (status) => {
        if (!status) return "#6b7280";

        const normalizedStatus = status.toString().toUpperCase().replace(/\s+/g, '_');

        const statusColors = {
            // AniList statuses
            "FINISHED": "#22c55e",
            "RELEASING": "#3b82f6",
            "NOT_YET_RELEASED": "#f59e0b",
            "CANCELLED": "#ef4444",
            // Jikan statuses
            "FINISHED_AIRING": "#22c55e",
            "CURRENTLY_AIRING": "#3b82f6",
            "NOT_YET_AIRED": "#f59e0b",
            // Additional common variations
            "COMPLETED": "#22c55e",
            "ONGOING": "#3b82f6",
            "UPCOMING": "#f59e0b",
            "DISCONTINUED": "#ef4444",
            "HIATUS": "#f59e0b",
            "ON_HOLD": "#f59e0b"
        };

        return statusColors[normalizedStatus] || "#6b7280";
    };

    // Function to get studio information from different API formats
    const getStudioInfo = () => {
        // For AniList data (hero slider)
        if (anime.studios?.edges && Array.isArray(anime.studios.edges)) {
            return anime.studios.edges.map(edge => edge.node.name).join(", ") || "N/A";
        }
        // For AniList data (direct nodes array)
        if (anime.studios?.nodes && Array.isArray(anime.studios.nodes)) {
            return anime.studios.nodes.map(node => node.name).join(", ") || "N/A";
        }
        // For direct studios array (some APIs)
        if (Array.isArray(anime.studios)) {
            return anime.studios.map(s => s.name || s).join(", ") || "N/A";
        }
        // For mainStudio property (hero slider data)
        if (anime.mainStudio) {
            return anime.mainStudio;
        }
        // For other possible studio formats
        if (anime.studio) {
            return anime.studio;
        }
        return "N/A";
    };

    // Truncate synopsis - increased limit for main modal
    const truncateSynopsis = (text, maxLength = 900) => {
        if (!text) return "No description available.";
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    };

    const fullSynopsis = anime.synopsis || anime.description || "No description available.";

    const handleSynopsisClick = () => {
        setSynopsisModalOpen(true);
    };

    const closeSynopsisModal = () => {
        setSynopsisModalOpen(false);
    };



    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    {/* Floating particles background */}
                    <div className="floating-particles">
                        {[...Array(15)].map((_, i) => (
                            <div key={i} className={`particle particle-${i + 1}`}></div>
                        ))}
                    </div>

                    {/* Close button */}
                    <button className="modal-close" onClick={onClose}>
                        <span className="close-icon">✖</span>
                    </button>

                    {/* Title at the top */}
                    <div className="modal-title">
                        <h2>{animeTitle}</h2>
                    </div>

                    {/* Body with image left and info right */}
                    <div className="modal-body">
                        <div className="modal-image-wrapper">
                            <div className="image-container">
                                <img src={animeImage} alt={animeTitle} />
                                <div className="image-overlay"></div>
                            </div>

                            {(anime.type || anime.format || anime.aired?.prop || anime.startDate) && (
                                <div className="anime-type-badge">
                                    <div className="badge-content">
                                        <div className="badge-row">
                                            <span className="badge-type">{anime.type || anime.format}</span>

                                            {(anime.aired?.prop || anime.startDate) && (
                                                <span className="badge-date">
                                                    {anime.startDate
                                                        ? formatDate(anime.startDate)  // AniList format - will show "TBA" if no year
                                                        : anime.aired?.prop?.from
                                                            ? anime.type?.toLowerCase() === "movie"
                                                                ? `${formatDate(anime.aired.prop.from)}`
                                                                : `${formatDate(anime.aired.prop.from)} - ${formatDate(anime.aired.prop.to)}`
                                                            : "TBA"  // Fallback if no date info
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-info">
                            <div className="info-buttons">
                                <button className="info-btn synopsis-btn" onClick={handleSynopsisClick}>
                                    <span className="btn-icon">📖</span>
                                    <span className="btn-text">Synopsis</span>
                                    <div className="btn-glow"></div>
                                </button>
                                <button className="info-btn related-btn">
                                    <span className="btn-icon">🔗</span>
                                    <span className="btn-text">Related</span>
                                    <div className="btn-glow"></div>
                                </button>
                                <button className="info-btn trailer-btn">
                                    <span className="btn-icon">🎬</span>
                                    <span className="btn-text">Trailer</span>
                                    <div className="btn-glow"></div>
                                </button>
                            </div>

                            <div className="stats-grid">
                                <div className="stat-item">
                                    <span className="stat-label">Episodes :</span>
                                    <span className="stat-value">
                                        {anime.episodes || anime.episodeCount || "?"}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Score :</span>
                                    <span
                                        className="stat-value score"
                                        style={{ color: getScoreColor(anime.score || anime.averageScore) }}
                                    >
                                        ⭐ {anime.score || anime.averageScore || "N/A"}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Age Rating :</span>
                                    <span className="stat-value age-rating">
                                        {anime.ageRating || anime.rating || (anime.isAdult ? "18+" : "N/A")}
                                    </span>
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
                                        <span className="label-icon">📊</span>
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
                                        <span className="label-icon">🏷️</span>
                                        Genres :
                                    </strong>
                                    <div className="genre-tags">
                                        {anime.genres?.length > 0 ? (
                                            anime.genres.map((g, i) => {
                                                const bgColor = genreColors[g.name] || genreColors[g] || "linear-gradient(135deg, #666, #888)";
                                                return (
                                                    <span
                                                        key={i}
                                                        className="genre-pill"
                                                        style={{ background: bgColor }}
                                                    >
                                                        {g.name || g}
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
                                        <span className="label-icon">🎭</span>
                                        Studio :
                                    </strong>
                                    <span className="info-value studio-value">
                                        {getStudioInfo()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Synopsis Modal */}
            {synopsisModalOpen && (
                <div className="synopsis-modal-overlay" onClick={closeSynopsisModal}>
                    <div className="synopsis-modal-content" onClick={(e) => e.stopPropagation()}>
                        {/* Close button for synopsis modal */}
                        <button className="synopsis-modal-close" onClick={closeSynopsisModal}>
                            <span className="close-icon">✖</span>
                        </button>

                        {/* Synopsis modal header */}
                        <div className="synopsis-modal-header">
                            <h3>{animeTitle} - Synopsis</h3>
                        </div>

                        {/* Synopsis modal body */}
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