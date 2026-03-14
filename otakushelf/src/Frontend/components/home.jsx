import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import "../Stylesheets/home.css";
import axios from "axios";
import Modal from "../components/modal.jsx";
import TrailerHero from './TrailerHero.jsx';
import { Header } from '../components/header.jsx';
import BottomNavBar from './bottom.jsx';
import { motion, AnimatePresence } from "framer-motion";

// API base URL
const API = import.meta.env.VITE_API_BASE_URL;

// Stale-while-revalidate key
const CACHE_KEY = 'animeSections_100_v4'; // Increment version to force fresh structure
const CACHE_TIME_KEY = `${CACHE_KEY}_time`;
const STALE_TIME = 1000 * 60 * 30; // 30 minutes until fresh fetch (but stale data shown immediately)

// Optimized Anime Card Component
const AnimeCard = React.memo(({ anime, onClick, index }) => {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleClick = useCallback(() => {
        onClick(anime);
    }, [anime, onClick]);

    const cardHeight = isMobile ? '240px' : '320px';
    const cardWidth = isMobile ? '160px' : '220px';

    // Prioritize high-quality images but fallback gracefully
    const imageSrc = anime.coverImage?.extraLarge ||
        anime.coverImage?.large ||
        anime.bannerImage ||
        '/placeholder-anime.jpg';

    // Extract dynamic color if available, fallback to brand color
    const brandColor = anime.coverImage?.color || '#ff6b6b';

    return (
        <motion.div
            className="anime-card2"
            onClick={handleClick}
            style={{
                height: cardHeight,
                width: cardWidth,
                minHeight: cardHeight,
                minWidth: cardWidth,
                '--brand-color': brandColor // Pass to CSS for glow effect
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.06, ease: "easeOut" }}
            whileHover={{ scale: 1.04, y: -4, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="home-card-image">
                <img
                    src={imageSrc}
                    alt={anime?.title || "Anime"}
                    loading="lazy"
                    width={isMobile ? 160 : 220}
                    height={isMobile ? 240 : 320}
                    decoding="async"
                />
                
                {/* Default Bottom Title */}
                <div className="card-title-bottom">
                    <h3>{anime?.title || "Unknown Title"}</h3>
                </div>

                {/* Glassmorphism Hover Overlay */}
                <div className="card-hover-overlay">
                    <h3 className="hover-title">{anime?.title || "Unknown Title"}</h3>
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
AnimeCard.displayName = 'AnimeCard';

// Section Component to manage its own "View More" state
const AnimeSection = React.memo(({ title, data, onOpenModal }) => {
    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollAmount = clientWidth * 0.8; // Scroll 80% of visible width
            scrollRef.current.scrollTo({
                left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (!data || data.length === 0) return null;

    return (
        <motion.div
            className="anime-carousel-section"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <div className="modern-section-header">
                <div className="accent-bar"></div>
                <h2 className="header-title">{title}</h2>
                <button className="view-more-btn">Explore <span className="arrow">&rsaquo;</span></button>
            </div>
            
            <div className="carousel-wrapper">
                <button className="carousel-btn prev-btn" onClick={() => scroll('left')}>‹</button>
                <div className="anime-carousel" ref={scrollRef}>
                    {data.map((anime, index) => (
                        <AnimeCard
                            key={`${title}-${anime.id || index}`}
                            anime={anime}
                            onClick={onOpenModal}
                            index={index}
                        />
                    ))}
                </div>
                <button className="carousel-btn next-btn" onClick={() => scroll('right')}>›</button>
            </div>
        </motion.div>
    );
});
AnimeSection.displayName = 'AnimeSection';

const AnimeHomepage = () => {
    // State
    const [loading, setLoading] = useState(true); // Initial skeleton state
    const [sections, setSections] = useState({
        topAiring: [],
        mostWatched: [],
        topMovies: [],
        trending: [],
        topRated: [],
        upcoming: []
    });

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [isMobile, setIsMobile] = useState(false);

    const controllerRef = useRef(null);

    // Helpers
    const normalizeGridAnime = useCallback((anime) => {
        if (!anime) return null;
        return {
            id: anime.id || anime.mal_id || Math.random().toString(36).substr(2, 9),
            idMal: anime.idMal || anime.mal_id,
            title: anime.title?.english || anime.title?.romaji || anime.title?.native || anime.title || "Unknown Title",
            coverImage: {
                large: anime.coverImage?.large || anime.image_url || anime.images?.jpg?.large_image_url,
                extraLarge: anime.coverImage?.extraLarge || anime.images?.jpg?.large_image_url,
                medium: anime.coverImage?.medium || anime.images?.jpg?.image_url
            },
            bannerImage: anime.bannerImage || anime.images?.jpg?.large_image_url,
            description: anime.description || anime.synopsis || null,
            episodes: anime.episodes || anime.episodes_count || anime.totalEpisodes || null,
            averageScore: anime.averageScore || anime.score || anime.rating || null,
            status: anime.status || anime.airing_status || null,
            genres: anime.genres || [],
            studios: anime.studios?.edges?.map(e => e.node.name) || anime.studios?.map(s => s.name) || [],
            trailer: anime.trailer || null,
            format: anime.format || null,
            season: anime.season || null,
            year: anime.year || anime.startDate?.year || null,
            startDate: anime.startDate || anime.aired?.from || null,
            endDate: anime.endDate || anime.aired?.to || null,
        };
    }, []);

    // Stale-While-Revalidate Data Fetching
    useEffect(() => {
        const loadWrapper = async () => {
            let hasCachedData = false;

            // 1. Load from Cache Immediately
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
                    const age = Date.now() - (parseInt(cacheTime) || 0);

                    // If valid JSON, show immediately
                    if (parsed.topAiring && parsed.mostWatched) {
                        setSections({
                            topAiring: (parsed.topAiring || []).map(normalizeGridAnime).filter(Boolean),
                            mostWatched: (parsed.mostWatched || []).map(normalizeGridAnime).filter(Boolean),
                            topMovies: (parsed.topMovies || []).map(normalizeGridAnime).filter(Boolean),
                            trending: (parsed.trending || []).map(normalizeGridAnime).filter(Boolean),
                            topRated: (parsed.topRated || []).map(normalizeGridAnime).filter(Boolean),
                            upcoming: (parsed.upcoming || []).map(normalizeGridAnime).filter(Boolean)
                        });
                        setLoading(false); // Stop skeleton loader immediately
                        hasCachedData = true;

                        // If data is fresh enough, we stop here to avoid aggressive networking
                        if (age < STALE_TIME) {
                            console.log("Using fresh cache, no network fetch needed.");
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Cache parse error:", e);
                    localStorage.removeItem(CACHE_KEY);
                }
            }

            // 2. Fetch Fresh Data (Background Update)
            try {
                // If we didn't have cache, we are still loading skeleton
                // If we did have cache, we are just silently updating
                console.log("Fetching fresh data...");
                const response = await axios.get(`${API}/api/anime/anime-sections`, { timeout: 15000 });
                const data = response.data;

                const newSections = {
                    topAiring: (data.topAiring || []).map(normalizeGridAnime).filter(Boolean),
                    mostWatched: (data.mostWatched || []).map(normalizeGridAnime).filter(Boolean),
                    topMovies: (data.topMovies || []).map(normalizeGridAnime).filter(Boolean),
                    trending: (data.trending || []).map(normalizeGridAnime).filter(Boolean),
                    topRated: (data.topRated || []).map(normalizeGridAnime).filter(Boolean),
                    upcoming: (data.upcoming || []).map(normalizeGridAnime).filter(Boolean)
                };

                // Update State
                setSections(newSections);
                setLoading(false);

                // Update Cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    topAiring: data.topAiring || [],
                    mostWatched: data.mostWatched || [],
                    topMovies: data.topMovies || [],
                    trending: data.trending || [],
                    topRated: data.topRated || [],
                    upcoming: data.upcoming || []
                }));
                localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

            } catch (error) {
                console.error("Network fetch failed:", error);
                // If we had no cache and network failed, stop loading to show empty state or error
                if (!hasCachedData) setLoading(false);
            }
        };

        loadWrapper();
    }, [normalizeGridAnime]);

    // Check Mobile
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Search Logic
    useEffect(() => {
        if (!searchQuery.trim()) {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        setIsSearching(true);

        if (controllerRef.current) controllerRef.current.abort();
        controllerRef.current = new AbortController();

        const searchTimer = setTimeout(async () => {
            try {
                const res = await axios.get(`${API}/api/anime/search?q=${encodeURIComponent(searchQuery)}&limit=20`, {
                    signal: controllerRef.current.signal
                });
                if (res.data) {
                    setSearchResults(res.data.map(normalizeGridAnime).filter(Boolean));
                }
            } catch (err) {
                if (!axios.isCancel(err)) console.error("Search error", err);
            } finally {
                setSearchLoading(false);
            }
        }, 500);

        return () => {
            clearTimeout(searchTimer);
            if (controllerRef.current) controllerRef.current.abort();
        };
    }, [searchQuery, normalizeGridAnime]);


    // Modal Handlers
    const openModal = useCallback((anime) => {
        setSelectedAnime(anime);
        setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setSelectedAnime(null);
        setIsModalOpen(false);
    }, []);

    const handleOpenRelatedAnime = useCallback((related) => {
        setSelectedAnime(related);
    }, []);


    if (loading && !isSearching) {
        return (
            <div className="homepage">
                <Header showSearch={true} onSearchChange={setSearchQuery} />
                <div className="loading-skeleton">
                    <div className="skeleton-hero"></div>

                    {/* Multiple sections to match actual layout */}
                    {['TOP AIRING', 'TRENDING THIS WEEK', 'MOST WATCHED', 'TOP RATED ALL TIME', 'TOP MOVIES', 'UPCOMING RELEASES'].map((title, sectionIndex) => (
                        <div key={sectionIndex} className="skeleton-section">
                            <div className="skeleton-section-header">
                                <div className="skeleton-bar"></div>
                                <div className="skeleton-title"></div>
                            </div>
                            <div className="skeleton-carousel">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="skeleton-card"></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <BottomNavBar />
            </div>
        );
    }

    return (
        <>
            <BottomNavBar />
            <div className="homepage">
                <div className="main-content">
                    <Header showSearch={true} onSearchChange={setSearchQuery} />

                    <TrailerHero onOpenModal={openModal} isMobile={isMobile} />

                    <main className="anime-sections">
                        {isSearching ? (
                            <div className="anime-section-container">
                                {searchLoading ? (
                                    <div className="loading-search">
                                        <div className="spinner"></div>
                                        <p>Searching...</p>
                                    </div>
                                ) : (
                                    <div className="anime-grid">
                                        {searchResults.map((anime, index) => (
                                            <AnimeCard
                                                key={`search-${anime.id}`}
                                                anime={anime}
                                                onClick={openModal}
                                                index={index}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <AnimeSection
                                    title="TOP AIRING"
                                    data={sections.topAiring}
                                    onOpenModal={openModal}
                                />
                                <AnimeSection
                                    title="TRENDING THIS WEEK"
                                    data={sections.trending}
                                    onOpenModal={openModal}
                                />
                                <AnimeSection
                                    title="MOST WATCHED"
                                    data={sections.mostWatched}
                                    onOpenModal={openModal}
                                />
                                <AnimeSection
                                    title="TOP RATED ALL TIME"
                                    data={sections.topRated}
                                    onOpenModal={openModal}
                                />
                                <AnimeSection
                                    title="TOP MOVIES"
                                    data={sections.topMovies}
                                    onOpenModal={openModal}
                                />
                                <AnimeSection
                                    title="UPCOMING RELEASES"
                                    data={sections.upcoming}
                                    onOpenModal={openModal}
                                />
                            </>
                        )}
                    </main>
                </div>

                <AnimatePresence>
                    {isModalOpen && selectedAnime && (
                        <Modal
                            isOpen={isModalOpen}
                            onClose={closeModal}
                            anime={selectedAnime}
                            onOpenAnime={handleOpenRelatedAnime}
                        />
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};

export default React.memo(AnimeHomepage);