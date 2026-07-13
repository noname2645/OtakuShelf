import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// Import CSS since we use raw classnames matching home.css
import "../Stylesheets/home.css"; 

// ─── Shared singleton resize tracker ──────────────────────────────────────────
// Instead of each card attaching its own window resize listener (100+ listeners!),
// we use a single module-level listener that notifies all subscribers.
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

    useEffect(() => {
        const cb = (mobile) => setIsMobile(mobile);
        resizeCallbacks.add(cb);
        return () => resizeCallbacks.delete(cb);
    }, []);

    const handleClick = useCallback((e) => {
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (onClick) onClick(anime);
    }, [anime, onClick, isDragging]);

    const defaultHeight = isMobile ? '228px' : '320px';
    const defaultWidth = isMobile ? '160px' : '220px';
    
    const height = customHeight || defaultHeight;
    const width = customWidth || defaultWidth;

    const cardStyle = {
        '--brand-color': anime.coverImage?.color || '#ff6b6b',
        height: height,
        width: isGrid ? '100%' : width,
        maxWidth: width,
        minHeight: height,
        minWidth: isGrid ? 'auto' : width,
        margin: isGrid ? '0 auto' : '0'
    };

    const displayTitle = typeof anime?.title === 'object' 
        ? (anime.title.english || anime.title.romaji || anime.title.native || "Unknown Title")
        : (anime?.title || "Unknown Title");

    const imageSrc = anime.coverImage?.extraLarge ||
        anime.coverImage?.large ||
        anime.bannerImage ||
        '/placeholder-anime.jpg';

    return (
        <motion.div
            className={`anime-card2 ${isGrid ? 'grid-mode' : ''}`}
            onClick={handleClick}
            style={{
                ...cardStyle,
                animationDelay: `${Math.min(index, 8) * 0.05}s`,
            }}
            whileHover={{ scale: isGrid ? 1.02 : 1.04, y: -4, transition: { duration: 0.18, ease: "easeOut" } }}
            whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
        >
            <div className="home-card-image" style={{ width: '100%', height: '100%' }}>
                <img
                    src={imageSrc}
                    alt={displayTitle}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    decoding="async"
                />
                
                <div className="card-title-bottom">
                    <h3>{displayTitle}</h3>
                </div>

                <div className="card-hover-overlay">
                    <h3 className="hover-title">{displayTitle}</h3>
                    <div className="hover-stats">
                        <span className="hover-score">⭐ {anime.averageScore ? `${(anime.averageScore / 10).toFixed(1)}/10` : 'N/A'}</span>
                        <span className="hover-episodes">{anime.episodes ? `${anime.episodes} EPS` : 'TBA'}</span>
                        <span className="hover-status">{anime.status?.replace(/_/g, ' ') || 'Unknown'}</span>
                    </div>
                    {anime.genres && anime.genres.length > 0 && (
                        <div className="hover-genres">
                            {anime.genres.slice(0, 3).map((g, i) => (
                                <span key={i} className="genre-tag">{g}</span>
                            ))}
                        </div>
                    )}
                    {anime.description && (
                        <p className="hover-synopsis">
                            {anime.description.replace(/<[^>]*>/g, '').substring(0, 80)}...
                        </p>
                    )}
                    <button className="hover-add-btn" onClick={(e) => {
                        e.stopPropagation(); // prevent opening modal
                        // Future: hook up to add to list logic
                    }}>+ Add to List</button>
                </div>
            </div>
        </motion.div>
    );
});

AnimeCardUI.displayName = 'AnimeCardUI';

export default AnimeCardUI;
