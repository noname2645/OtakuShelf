import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import "../Stylesheets/home.css";
import axios from "axios";
import Modal from "../components/modal.jsx";
import { Link } from 'react-router-dom';
import TrailerHero from './TrailerHero.jsx';
import { Header } from '../components/header.jsx';

// API base URL
const API_BASE = import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : "https://otakushelf-uuvw.onrender.com";

// Simple useInView hook that always returns true
const useInView = () => {
    const ref = useRef(null);
    return [ref, true]; // Always return true to show immediately
};
// Optimized Anime Card Component
// Updated AnimeCard component in home.jsx
const AnimeCard = React.memo(({ anime, onClick, index }) => {
    const [isMobile, setIsMobile] = useState(false);
    const [imageSrc, setImageSrc] = useState('/placeholder-anime.jpg');
    // Remove the loaded state since animation is automatic now

    // Check mobile on mount
    useEffect(() => {
        setIsMobile(window.innerWidth <= 768);
    }, []);

    // Load image
    useEffect(() => {
        if (!anime) return;

        const imgUrl = anime.coverImage?.extraLarge ||
            anime.coverImage?.large ||
            anime.bannerImage ||
            "/placeholder-anime.jpg";

        const img = new Image();
        img.src = imgUrl;
        img.onload = () => {
            setImageSrc(imgUrl);
            // Remove setLoaded(true) since we don't need it
        };
        img.onerror = () => {
            setImageSrc('/placeholder-anime.jpg');
            // Remove setLoaded(true) since we don't need it
        };
    }, [anime]);

    const handleClick = useCallback(() => {
        onClick(anime);
    }, [anime, onClick]);

    const cardHeight = isMobile ? '240px' : '320px';
    const cardWidth = isMobile ? '160px' : '220px';

    return (
        <div
            className={`anime-card2`} // Remove 'loaded' class
            onClick={handleClick}
            style={{
                animationDelay: `${index * 0.03}s`, // Keep this for initial load
                height: cardHeight,
                width: cardWidth,
                minHeight: cardHeight,
                minWidth: cardWidth
            }}
        >
            <div className="home-card-image">
                <img
                    src={imageSrc}
                    alt={anime?.title || "Anime"}
                    loading="lazy"
                    width={isMobile ? 160 : 220}
                    height={isMobile ? 240 : 320}
                />
                <div className="card-title-bottom">
                    <h3>{anime?.title || "Unknown Title"}</h3>
                </div>
            </div>
        </div>
    );
});
AnimeCard.displayName = 'AnimeCard';

const AnimeHomepage = () => {
    // State declarations
    const [loading, setLoading] = useState(true);
    const [mostWatched, setMostWatched] = useState([]);
    const [topMovies, setTopMovies] = useState([]);
    const [topAiring, setTopAiring] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const controllerRef = useRef(null);
    const searchRef = useRef(null);

    // Intersection observers for lazy loading sections
    const [airingRef, airingVisible] = useInView({ threshold: 0.01 });
    const [watchedRef, watchedVisible] = useInView({ threshold: 0.01 });
    const [moviesRef, moviesVisible] = useInView({ threshold: 0.01 });

    // Memoized functions
    const getActivePage = useCallback(() => {
        const path = window.location.pathname;
        if (path === '/home' || path === '/') return 'home';
        if (path === '/list') return 'list';
        if (path === '/advance') return 'search';
        if (path === '/ai') return 'AI';
        return '';
    }, []);

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
            studios: anime.studios?.edges?.map(e => e.node.name) ||
                anime.studios?.map(s => s.name) ||
                anime.studios || [],
            startDate: anime.startDate || anime.aired?.from || null,
            endDate: anime.endDate || anime.aired?.to || null,
            isAdult: anime.isAdult || false,
            trailer: anime.trailer || null,
            format: anime.format || null,
            duration: anime.duration || null,
            popularity: anime.popularity || null,
            year: anime.year || anime.startDate?.year || null,
            season: anime.season || null,
            type: anime.type || anime.format || null,
            source: anime.source || null,
        };
    }, []);


    // Check mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Add this useEffect hook near your other useEffect hooks in AnimeHomepage component:
    useEffect(() => {
        const checkAuth = async () => {
            const activePage = getActivePage();

            // Only protect the list page
            if (activePage === 'list') {
                try {
                    const response = await axios.get(`${API_BASE}/api/auth/check`, {
                        withCredentials: true
                    });

                    // If not authenticated, redirect to login or home
                    if (!response.data.authenticated) {
                        window.location.href = '/login'; // or '/home'
                    }
                } catch (error) {
                    console.error("Auth check failed:", error);
                    window.location.href = '/login'; // or '/home'
                }
            }
        };

        checkAuth();
    }, [getActivePage]);

    // Load anime sections with caching
    useEffect(() => {
        const fetchAnimeSections = async () => {
            try {
                // Try cache first
                const cachedSections = localStorage.getItem('animeSections');
                const cacheTime = localStorage.getItem('animeSections_time');
                const isCacheValid = cacheTime && (Date.now() - parseInt(cacheTime)) < 30 * 60 * 1000;

                if (cachedSections && isCacheValid) {
                    const parsed = JSON.parse(cachedSections);
                    setTopAiring((parsed.topAiring || []).map(normalizeGridAnime).filter(Boolean));
                    setMostWatched((parsed.mostWatched || []).map(normalizeGridAnime).filter(Boolean));
                    setTopMovies((parsed.topMovies || []).map(normalizeGridAnime).filter(Boolean));
                    setLoading(false);
                    return;
                }

                // Fetch fresh data
                const response = await axios.get(`${API_BASE}/api/anime/anime-sections`, {
                    timeout: 10000
                });

                const data = response.data;
                const normalizedTopAiring = (data.topAiring || []).map(normalizeGridAnime).filter(Boolean);
                const normalizedMostWatched = (data.mostWatched || []).map(normalizeGridAnime).filter(Boolean);
                const normalizedTopMovies = (data.topMovies || []).map(normalizeGridAnime).filter(Boolean);

                setTopAiring(normalizedTopAiring);
                setMostWatched(normalizedMostWatched);
                setTopMovies(normalizedTopMovies);

                // Cache the data
                localStorage.setItem('animeSections', JSON.stringify({
                    topAiring: data.topAiring || [],
                    mostWatched: data.mostWatched || [],
                    topMovies: data.topMovies || []
                }));
                localStorage.setItem('animeSections_time', Date.now().toString());

                setLoading(false);
            } catch (error) {
                console.error("Error fetching anime sections:", error);
                setLoading(false);
            }
        };

        fetchAnimeSections();
    }, [normalizeGridAnime]);

    // Search functionality
    useEffect(() => {
        if (!searchQuery.trim()) {
            setIsSearching(false);
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);
        setIsSearching(true);

        if (controllerRef.current) {
            controllerRef.current.abort();
        }
        controllerRef.current = new AbortController();

        const performSearch = async () => {
            try {
                const searchUrl = `${API_BASE}/api/anime/search?q=${encodeURIComponent(searchQuery)}&limit=12`;
                const res = await axios.get(searchUrl, {
                    signal: controllerRef.current.signal,
                    timeout: 10000
                });

                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    const normalized = res.data.map(normalizeGridAnime).filter(Boolean);
                    setSearchResults(normalized);
                } else {
                    setSearchResults([]);
                }
            } catch (err) {
                if (!axios.isCancel(err)) {
                    console.error("Search failed:", err);
                    setSearchResults([]);
                }
            } finally {
                setSearchLoading(false);
            }
        };

        const timeoutId = setTimeout(performSearch, 500);

        return () => {
            clearTimeout(timeoutId);
            if (controllerRef.current) {
                controllerRef.current.abort();
            }
        };
    }, [searchQuery, normalizeGridAnime]);

    // Modal handlers
    const openModal = useCallback((anime) => {
        setSelectedAnime(anime);
        setIsModalOpen(true);
    }, []);

    const handleOpenRelatedAnime = useCallback((relatedAnime) => {
        setSelectedAnime(relatedAnime);
    }, []);

    const closeModal = useCallback(() => {
        setSelectedAnime(null);
        setIsModalOpen(false);
    }, []);

    // Scroll to search results
    const scrollToView = useCallback(() => {
        if (searchRef.current) {
            searchRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    useEffect(() => {
        if (isSearching && (searchResults.length > 0 || !searchLoading)) {
            setTimeout(scrollToView, 100);
        }
    }, [searchResults, searchLoading, isSearching, scrollToView]);

    // Render anime grid
    const renderAnimeGrid = useCallback((data, sectionName) => {
        if (!data || data.length === 0) {
            return (
                <div className="anime-section-container">
                    <div className="no-anime-found">
                        No anime found in {sectionName}
                    </div>
                </div>
            );
        }

        return (
            <div className="anime-section-container">
                <div className="anime-grid">
                    {data.map((anime, index) => (
                        <AnimeCard
                            key={`${sectionName}-${anime?.id}-${index}`}
                            anime={anime}
                            onClick={openModal}
                            index={index}
                        />
                    ))}
                </div>
            </div>
        );
    }, [openModal]);

    // Process data
    const processedTopAiring = useMemo(() => topAiring.filter(Boolean), [topAiring]);
    const processedMostWatched = useMemo(() => mostWatched.filter(Boolean), [mostWatched]);
    const processedTopMovies = useMemo(() => topMovies.filter(Boolean), [topMovies]);

        // Add this useEffect in AnimeHomepage component (around line where you have other useEffects)
    useEffect(() => {
        // Trigger staggered animations when search results or sections load
        if (processedTopAiring.length > 0 || processedMostWatched.length > 0 || processedTopMovies.length > 0 || searchResults.length > 0) {
            const timer = setTimeout(() => {
                const cards = document.querySelectorAll('.anime-card2');
                cards.forEach((card, index) => {
                    // Reset animation to trigger it
                    card.style.animation = 'none';
                    setTimeout(() => {
                        card.style.animation = '';
                        card.style.animationDelay = `${(index % 20) * 0.05}s`;
                    }, 10);
                });
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [processedTopAiring, processedMostWatched, processedTopMovies, searchResults, isSearching]);


    // Loading state
    if (loading && !isSearching) {
        return (
            <div className="homepage">
                <Header showSearch={true} onSearchChange={setSearchQuery} />
                <div className="loading-skeleton">
                    <div className="skeleton-hero"></div>
                    <div className="skeleton-grid">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="skeleton-card"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="homepage">
            <div className="main-content">
                <Header showSearch={true} onSearchChange={setSearchQuery} />

                {/* Bottom Navigation */}
                <div className="bottom-button-bar">
                    <Link
                        to="/home"
                        title="home"
                        className={`nav-label ${getActivePage() === 'home' ? 'active' : ''}`}
                        onClick={(e) => {
                            if (getActivePage() === 'home') {
                                e.preventDefault();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                            <path fill="inherit" d="M261.56 101.28a8 8 0 0 0-11.06 0L66.4 277.15a8 8 0 0 0-2.47 5.79L63.9 448a32 32 0 0 0 32 32H192a16 16 0 0 0 16-16V328a8 8 0 0 1 8-8h80a8 8 0 0 1 8 8v136a16 16 0 0 0 16 16h96.06a32 32 0 0 0 32-32V282.94a8 8 0 0 0-2.47-5.79Z" />
                            <path fill="inherit" d="m490.91 244.15l-74.8-71.56V64a16 16 0 0 0-16-16h-48a16 16 0 0 0-16 16v32l-57.92-55.38C272.77 35.14 264.71 32 256 32c-8.68 0-16.72 3.14-22.14 8.63l-212.7 203.5c-6.22 6-7 15.87-1.34 22.37A16 16 0 0 0 43 267.56L250.5 69.28a8 8 0 0 1 11.06 0l207.52 198.28a16 16 0 0 0 22.59-.44c6.14-6.36 5.63-16.86-.76-22.97Z" />
                        </svg>
                    </Link>

                    <Link
                        to="/list"
                        title="list"
                        className={`nav-label ${getActivePage() === 'list' ? 'active' : ''}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="inherit" viewBox="0 0 18 20">
                            <path fill="inherit" d="M2 19.004h2.004V17H2v2.004ZM7 19h15v-2H7v2Zm-5-5.996h2.004V11H2v2.004ZM7 13h15v-2H7v2ZM2 7.004h2.004V5H2v2.004ZM7 7h15V5H7v2Z" />
                        </svg>
                    </Link>

                    <Link
                        to="/advance"
                        title="search"
                        className={`nav-label ${getActivePage() === 'search' ? 'active' : ''}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26">
                            <path fill="inherit"
                                d="M10 .188A9.812 9.812 0 0 0 .187 10A9.812 9.812 0 0 0 10 19.813c2.29 0 4.393-.811 6.063-2.125l.875.875a1.845 1.845 0 0 0 .343 2.156l4.594 4.625c.713.714 1.88.714 2.594 0l.875-.875a1.84 1.84 0 0 0 0-2.594l-4.625-4.594a1.824 1.824 0 0 0-2.157-.312l-.875-.875A9.812 9.812 0 0 0 10 .188zM10 2a8 8 0 1 1 0 16a8 8 0 0 1 0-16zM4.937 7.469a5.446 5.446 0 0 0-.812 2.875a5.46 5.46 0 0 0 5.469 5.469a5.516 5.516 0 0 0 3.156-1a7.166 7.166 0 0 1-.75.03a7.045 7.045 0 0 1-7.063-7.062c0-.104-.005-.208 0-.312z" />
                        </svg>
                    </Link>

                    <Link
                        to="/ai"
                        title="AI"
                        className={`nav-label ${getActivePage() === 'AI' ? 'active' : ''}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                            <path fill="inherit" fillRule="evenodd" d="M384 128v256H128V128zm-148.25 64h-24.932l-47.334 128h22.493l8.936-25.023h56.662L260.32 320h23.847zm88.344 0h-22.402v128h22.402zm-101 21.475l22.315 63.858h-44.274zM405.335 320H448v42.667h-42.667zm-256 85.333H192V448h-42.667zm85.333 0h42.666V448h-42.666zM149.333 64H192v42.667h-42.667zM320 405.333h42.667V448H320zM234.667 64h42.666v42.667h-42.666zM320 64h42.667v42.667H320zm85.333 170.667H448v42.666h-42.667zM64 320h42.667v42.667H64zm341.333-170.667H448V192h-42.667zM64 234.667h42.667v42.666H64zm0-85.334h42.667V192H64z" />
                        </svg>
                    </Link>
                </div>

                {/* Hero Section */}
                <TrailerHero
                    onOpenModal={openModal}
                    isMobile={isMobile}
                />

                {/* Main Anime Sections */}
                <main className="anime-sections">
                    {isSearching ? (
                        <div ref={searchRef} className="anime-section-container">
                            {searchLoading ? (
                                <div className="loading-search">
                                    <div className="spinner"></div>
                                    <p>Searching anime...</p>
                                </div>
                            ) : searchResults.length > 0 ? (
                                <div className="anime-grid">
                                    {searchResults.map((anime, index) => (
                                        <AnimeCard
                                            key={`search-${anime?.id}-${index}`}
                                            anime={anime}
                                            onClick={openModal}
                                            index={index}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="no-results">
                                    <div className="no-results-icon">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <circle cx="11" cy="11" r="8" strokeWidth="2" />
                                            <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        <p>No anime found for "{searchQuery}"</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Top Airing Section */}
                            <div className="divider">
                                <span className="divider-content">TOP AIRING</span>
                            </div>
                            <section className="anime-section">
                                {renderAnimeGrid(processedTopAiring, "Top Airing")}
                            </section>

                            {/* Most Watched Section */}
                            <div className="divider">
                                <span className="divider-content">MOST WATCHED</span>
                            </div>
                            <section className="anime-section">
                                {renderAnimeGrid(processedMostWatched, "Most Watched")}
                            </section>

                            {/* Top Movies Section */}
                            <div className="divider">
                                <span className="divider-content">TOP MOVIES</span>
                            </div>
                            <section className="anime-section">
                                {renderAnimeGrid(processedTopMovies, "Top Movies")}
                            </section>
                        </>
                    )}
                </main>
            </div>

            {/* Modal */}
            {isModalOpen && selectedAnime && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    anime={selectedAnime}
                    onOpenAnime={handleOpenRelatedAnime}
                />
            )}
        </div>
    );
};

export default React.memo(AnimeHomepage);