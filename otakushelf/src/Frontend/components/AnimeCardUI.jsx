import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../api.js';

// Import CSS matching the new premium card design rules
import "../Stylesheets/home.css"; 

// ─── Shared singleton resize tracker ──────────────────────────────────────────
const resizeCallbacks = new Set();
let sharedIsMobile = window.innerWidth <= 768;

const handleGlobalResize = () => {
    const mobile = window.innerWidth <= 768;
    if (mobile !== sharedIsMobile) {
        sharedIsMobile = mobile;
        resizeCallbacks.forEach(cb => cb(mobile));
    }
};
window.addEventListener('resize', handleGlobalResize, { passive: true });
// ──────────────────────────────────────────────────────────────────────────────

const AnimeCardUI = React.memo(({ anime, onClick, index = 0, isDragging = false, isGrid = false, customWidth, customHeight }) => {
    const [isMobile, setIsMobile] = useState(sharedIsMobile);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isWatchlisted, setIsWatchlisted] = useState(false);

    useEffect(() => {
        const cb = (mobile) => setIsMobile(mobile);
        resizeCallbacks.add(cb);
        
        // Load initial interactive states from localStorage
        if (anime?.id) {
            setIsFavorite(localStorage.getItem(`favorite_${anime.id}`) === 'true');
            setIsWatchlisted(localStorage.getItem(`watchlist_${anime.id}`) === 'true');
        }

        return () => resizeCallbacks.delete(cb);
    }, [anime?.id]);

    const handleClick = useCallback((e) => {
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (onClick) onClick(anime);
    }, [anime, onClick, isDragging]);

    // Handle Favorite Toggle
    const handleFavorite = useCallback(async (e) => {
        e.stopPropagation();
        if (!anime?.id) return;
        const nextState = !isFavorite;
        setIsFavorite(nextState);
        localStorage.setItem(`favorite_${anime.id}`, String(nextState));

        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                // AuthContext stores user as { id } not { _id }, so check both
                const userId = user?._id || user?.id;
                if (userId) {
                    await api.post(`/api/list/favorite/${userId}`, {
                        animeId: anime.id,
                        isFavorite: nextState,
                        animeData: anime
                    });
                } else {
                    console.warn('Favorite: no user ID found in localStorage', user);
                }
            }
        } catch (err) {
            console.error("Failed to sync favorite with backend", err);
        }
    }, [anime, isFavorite]);

    // Handle Watchlist Toggle
    const handleWatchlist = useCallback((e) => {
        e.stopPropagation();
        if (!anime?.id) return;
        const nextState = !isWatchlisted;
        setIsWatchlisted(nextState);
        localStorage.setItem(`watchlist_${anime.id}`, String(nextState));
    }, [anime?.id, isWatchlisted]);

    // Handle Native Share
    const handleShare = useCallback((e) => {
        e.stopPropagation();
        const displayTitle = typeof anime?.title === 'object'
            ? (anime.title.english || anime.title.romaji || "Anime")
            : (anime?.title || "Anime");
        
        const shareUrl = `${window.location.origin}/anime/${anime?.id}`;
        
        if (navigator.share) {
            navigator.share({
                title: displayTitle,
                text: `Check out ${displayTitle} on OtakuShelf!`,
                url: shareUrl
            }).catch(err => console.log('Share canceled'));
        } else {
            navigator.clipboard.writeText(shareUrl);
            alert(`Link copied to clipboard: ${shareUrl}`);
        }
    }, [anime]);

    // Handle Trailer Click
    const handleTrailer = useCallback((e) => {
        e.stopPropagation();
        if (onClick) onClick(anime); // For trailer, we open the details modal where they can watch trailer
    }, [anime, onClick]);

    // Dimensions matching the smaller card layout requirements
    const defaultHeight = isMobile ? '230px' : '380px';
    const defaultWidth = isMobile ? '180px' : '250px';
    
    const height = customHeight || defaultHeight;
    const width = customWidth || defaultWidth;

    const cardStyle = {
        '--brand-color': anime.coverImage?.color || '#ff6b6b',
        height: height,
        width: isGrid ? '100%' : width,
        maxWidth: isGrid ? '100%' : width,   // grid: fill the cell; list: fixed width
        minHeight: height,
        minWidth: isGrid ? 'auto' : width,
        margin: '0'
    };

    const displayTitle = typeof anime?.title === 'object' 
        ? (anime.title.english || anime.title.romaji || anime.title.native || "Unknown Title")
        : (anime?.title || "Unknown Title");

    const romajiTitle = typeof anime?.title === 'object' ? anime.title.romaji : (anime?.title || "");
    const romajiSpaced = typeof romajiTitle === 'string'
        ? romajiTitle.toUpperCase().split("").join(" ")
        : "";

    const imageSrc = anime.coverImage?.extraLarge ||
        anime.coverImage?.large ||
        anime.bannerImage ||
        '/placeholder-anime.jpg';

    // Parse Score (avoid default garbage 8.5, fallback to N/A)
    const hasScore = (anime.averageScore && anime.averageScore > 0) || (anime.score && anime.score > 0);
    const score = hasScore
        ? (anime.averageScore ? (anime.averageScore / 10).toFixed(1) : (anime.score / 10).toFixed(1))
        : "N/A";

    // Parse Year
    const releaseYear = anime.year || (anime.startDate && anime.startDate.year) || "2024";

    // Parse Episodes (Ongoing if releasing, TBA if not released yet)
    const episodesVal = anime.episodes || anime.episodes_count || anime.totalEpisodes || null;
    const episodesText = episodesVal 
        ? `${episodesVal} Ep` 
        : (anime.status === 'RELEASING' ? 'Ongoing' : 'TBA');

    // Parse Genre
    const mainGenres = anime.genres && anime.genres.length > 0
        ? anime.genres.slice(0, 2).join(", ")
        : "Action, Fantasy";

    return (
        <motion.div
            className={`anime-card-premium ${isGrid ? 'grid-mode' : ''}`}
            onClick={handleClick}
            style={{
                ...cardStyle,
                animationDelay: `${Math.min(index, 8) * 0.05}s`,
            }}
            whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
        >
            {/* Top Rating and Bookmark overlay */}
            <div className="premium-card-header">
                <div className="premium-rating-badge">
                    <span className="premium-rating-star">★</span>
                    <span className="premium-rating-number">{score}</span>
                </div>
                
                <button 
                    className={`premium-bookmark-btn ${isFavorite ? 'active' : ''}`}
                    onClick={handleFavorite}
                    aria-label={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                >
                    <svg className="heart-svg-icon" viewBox="0 0 24 24" fill={isFavorite ? "#ff2a5f" : "none"} stroke="#ff2a5f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </button>
            </div>

            {/* Poster image background */}
            <div className="premium-card-poster">
                <img
                    src={imageSrc}
                    alt={displayTitle}
                    loading="lazy"
                    decoding="async"
                />
                <div className="premium-poster-fade" />
            </div>

            {/* Content Area */}
            <div className="premium-card-body">
                {/* Format outline pill */}
                <div className="premium-format-tag">
                    <span className="format-dot">○</span>
                    {anime.format || 'TV'}
                </div>

                {/* Big bold title */}
                <h2 className="premium-main-title">{displayTitle}</h2>





                {/* Metadata Row */}
                <div className="premium-meta-row">
                    <div className="premium-meta-col">
                        <svg className="meta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <div className="meta-info">
                            <span className="meta-label">RELEASED</span>
                            <span className="meta-val">{releaseYear}</span>
                        </div>
                    </div>
                    <div className="meta-separator" />
                    <div className="premium-meta-col">
                        <svg className="meta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                        <div className="meta-info">
                            <span className="meta-label">EPISODES</span>
                            <span className="meta-val">{episodesText}</span>
                        </div>
                    </div>
                    <div className="meta-separator" />
                    <div className="premium-meta-col">
                        <svg className="meta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                            <line x1="7" y1="2" x2="7" y2="22" />
                            <line x1="17" y1="2" x2="17" y2="22" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <line x1="2" y1="7" x2="7" y2="7" />
                            <line x1="2" y1="17" x2="7" y2="17" />
                            <line x1="17" y1="17" x2="22" y2="17" />
                            <line x1="17" y1="7" x2="22" y2="7" />
                        </svg>
                        <div className="meta-info">
                            <span className="meta-label">GENRE</span>
                            <span className="meta-val">{mainGenres}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Bar Footer */}
            <div className="premium-card-footer">
                <button className={`footer-action-item ${isWatchlisted ? 'active' : ''}`} onClick={handleWatchlist}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        {isWatchlisted ? (
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        ) : (
                            <line x1="12" y1="5" x2="12" y2="19" />
                        )}
                        {!isWatchlisted && <line x1="5" y1="12" x2="19" y2="12" />}
                        {isWatchlisted && <polyline points="22 4 12 14.01 9 11.01" />}
                    </svg>
                    <span>{isWatchlisted ? 'ADDED' : 'WATCHLIST'}</span>
                </button>
                <div className="footer-separator" />
                <button className="footer-action-item" onClick={handleShare}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>SHARE</span>
                </button>
            </div>
        </motion.div>
    );
});

AnimeCardUI.displayName = 'AnimeCardUI';

export default AnimeCardUI;
