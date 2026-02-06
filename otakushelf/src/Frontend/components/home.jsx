import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import "../Stylesheets/home.css";
import axios from "axios";
import Modal from "../components/modal.jsx";
import TrailerHero from './TrailerHero.jsx';
import { Header } from '../components/header.jsx';
import BottomNavBar from './bottom.jsx';

// API base URL
const API = import.meta.env.VITE_API_BASE_URL;

// Stale-while-revalidate key
const CACHE_KEY = 'animeSections_100_v3'; // Increment version to force fresh structure
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

    return (
        <div
            className="anime-card2"
            onClick={handleClick}
            style={{
                // Inline styles for base sizing to reduce layout thrash
                height: cardHeight,
                width: cardWidth,
                minHeight: cardHeight,
                minWidth: cardWidth,
                // Only animate the first few items to prevent massive paint storms
                animationDelay: index < 12 ? `${index * 0.05}s` : '0s',
                opacity: index < 12 ? 0 : 1, // Start hidden only if animating
                animation: index < 12 ? 'fadeInUp 0.5s ease-out forwards' : 'none'
            }}
        >
            <div className="home-card-image">
                <img
                    src={imageSrc}
                    alt={anime?.title || "Anime"}
                    loading="lazy" // Native lazy loading relies on browser to optimize
                    width={isMobile ? 160 : 220}
                    height={isMobile ? 240 : 320}
                    decoding="async"
                />
                <div className="card-title-bottom">
                    <h3>{anime?.title || "Unknown Title"}</h3>
                </div>
            </div>
        </div>
    );
});
AnimeCard.displayName = 'AnimeCard';

// Section Component to manage its own "View More" state
const AnimeSection = React.memo(({ title, data, onOpenModal }) => {
    // Only render what's needed
    // const visibleData = useMemo(() => data.slice(0, visibleCount), [data, visibleCount]);

    if (!data || data.length === 0) return null;

    return (
        <>
            <div className="divider">
                <span className="divider-content">{title}</span>
            </div>
            <section className="anime-section">
                <div className="anime-section-container">
                    <div className="anime-grid">
                        {data.map((anime, index) => (
                            <AnimeCard
                                key={`${title}-${anime.id || index}`}
                                anime={anime}
                                onClick={onOpenModal}
                                index={index} // Index relative to current render
                            />
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
});
AnimeSection.displayName = 'AnimeSection';

const AnimeHomepage = () => {
    // State
    const [loading, setLoading] = useState(true); // Initial skeleton state
    const [sections, setSections] = useState({
        topAiring: [],
        mostWatched: [],
        topMovies: []
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
                            topMovies: (parsed.topMovies || []).map(normalizeGridAnime).filter(Boolean)
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
                    topMovies: (data.topMovies || []).map(normalizeGridAnime).filter(Boolean)
                };

                // Update State
                setSections(newSections);
                setLoading(false);

                // Update Cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    topAiring: data.topAiring || [],
                    mostWatched: data.mostWatched || [],
                    topMovies: data.topMovies || []
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
                    <div className="skeleton-grid">
                        {[...Array(8)].map((_, i) => <div key={i} className="skeleton-card"></div>)}
                    </div>
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
                                    title="MOST WATCHED"
                                    data={sections.mostWatched}
                                    onOpenModal={openModal}
                                />
                                <AnimeSection
                                    title="TOP MOVIES"
                                    data={sections.topMovies}
                                    onOpenModal={openModal}
                                />
                            </>
                        )}
                    </main>
                </div>

                {isModalOpen && selectedAnime && (
                    <Modal
                        isOpen={isModalOpen}
                        onClose={closeModal}
                        anime={selectedAnime}
                        onOpenAnime={handleOpenRelatedAnime}
                    />
                )}
            </div>
        </>
    );
};

export default React.memo(AnimeHomepage);