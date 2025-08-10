// src/components/Modal.jsx
import React from "react";
import "../Stylesheets/modal.css";

const Modal = ({ isOpen, onClose, anime }) => {
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
        if (!dateObj?.year) return "??";
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
        const statusColors = {
            "FINISHED": "#22c55e",
            "RELEASING": "#3b82f6", 
            "NOT_YET_RELEASED": "#f59e0b",
            "CANCELLED": "#ef4444"
        };
        return statusColors[status?.toUpperCase()] || "#6b7280";
    };

    // Prevent background scrolling when modal is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        // Cleanup when component unmounts
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
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

                        {(anime.type || anime.format || anime.aired?.prop) && (
                            <div className="anime-type-badge">
                                <div className="badge-content">
                                    <div className="badge-row">
                                        <span className="badge-type">{anime.type || anime.format}</span>
                                        {anime.aired?.prop?.from?.day && (
                                            <span className="badge-date">
                                                {anime.type?.toLowerCase() === "movie"
                                                    ? `${formatDate(anime.aired.prop.from)}`
                                                    : `${formatDate(anime.aired.prop.from)} - ${formatDate(anime.aired.prop.to)}`
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
                            <button className="info-btn synopsis-btn">
                                <span className="btn-icon"></span>
                                <span className="btn-text">Synopsis</span>
                                <div className="btn-glow"></div>
                            </button>
                            <button className="info-btn related-btn">
                                <span className="btn-icon"></span>
                                <span className="btn-text">Related</span>
                                <div className="btn-glow"></div>
                            </button>
                            <button className="info-btn trailer-btn">
                                <span className="btn-icon"></span>
                                <span className="btn-text">Trailer</span>
                                <div className="btn-glow"></div>
                            </button>
                        </div>

                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="stat-label">Episodes</span>
                                <span className="stat-value">
                                    {anime.episodes || anime.episodeCount || "?"}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Score</span>
                                <span 
                                    className="stat-value score"
                                    style={{ color: getScoreColor(anime.score || anime.averageScore) }}
                                >
                                    ⭐ {anime.score || anime.averageScore || "N/A"}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Age Rating</span>
                                <span className="stat-value age-rating">
                                    {anime.ageRating || anime.rating || (anime.isAdult ? "18+" : "N/A")}
                                </span>
                            </div>
                        </div>

                        <div className="synopsis-section">
                            <p className="synopsis-text">
                                {anime.synopsis || anime.description || "No description available."}
                            </p>
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
                                    <span className="status-indicator"></span>
                                    {anime.status || "Unknown"}
                                </span>
                            </div>

                            <div className="info-row genre-row">
                                <strong className="info-label">
                                    <span className="label-icon"></span>
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
                                    <span className="label-icon"></span>
                                    Studio :
                                </strong>
                                <span className="info-value studio-value">
                                    {anime.studios?.map(s => s.name).join(", ") || "N/A"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;