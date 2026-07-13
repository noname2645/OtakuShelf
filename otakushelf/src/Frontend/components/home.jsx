import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import "../Stylesheets/home.css";
import axios from "axios";
import Modal from "../components/modal.jsx";
import TrailerHero from './TrailerHero.jsx';
import { Header } from '../components/header.jsx';
import BottomNavBar from './bottom.jsx';
import Footer from './footer.jsx';
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import PageLoader from './PageLoader.jsx';

// API base URL
const API = import.meta.env.VITE_API_BASE_URL;

// Stale-while-revalidate key
const CACHE_KEY = 'animeSections_normalized_v1'; // normalized data — instant reads
const CACHE_TIME_KEY = `${CACHE_KEY}_time`;
const STALE_TIME = 1000 * 60 * 60; // 1 hour — matches backend TTL

import AnimeCard from './AnimeCardUI.jsx';
// Section Component to manage its own "View More" state
// Map section titles to genre/filter hints for Advanced Search
const SECTION_GENRE_MAP = {
    'TOP AIRING': '?status=RELEASING',
    'TRENDING THIS WEEK': '?sort=TRENDING',
    'MOST WATCHED': '?sort=POPULARITY',
    'TOP RATED ALL TIME': '?sort=SCORE',
    'TOP MOVIES': '?type=MOVIE',
    'UPCOMING RELEASES': '?status=TBA',
};

const AnimeSection = React.memo(({ title, data, onOpenModal }) => {
    const scrollRef = useRef(null);
    const navigate = useNavigate();
    const isDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const scrollLeftRef = useRef(0);
    const [isDragging, setIsDragging] = useState(false);

    const scroll = useCallback((direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollAmount = clientWidth * 0.8;
            // Use native scrollTo with smooth behavior only for button presses (not drag)
            scrollRef.current.scrollTo({
                left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
                behavior: 'smooth'
            });
        }
    }, []);

    const handleMouseDown = useCallback((e) => {
        if (!scrollRef.current) return;
        startXRef.current = e.pageX - scrollRef.current.offsetLeft;
        scrollLeftRef.current = scrollRef.current.scrollLeft;
        isDraggingRef.current = false;
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (isDragging) setIsDragging(false);
        isDraggingRef.current = false;
        startXRef.current = 0;
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setTimeout(() => {
            setIsDragging(false);
            isDraggingRef.current = false;
        }, 50);
        startXRef.current = 0;
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (startXRef.current === 0 || !scrollRef.current) return;
        
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startXRef.current) * 2;
        
        if (Math.abs(walk) > 5) {
            if (!isDraggingRef.current) {
                isDraggingRef.current = true;
                setIsDragging(true);
            }
            e.preventDefault();
            scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
        }
    }, []);

    // Single global mouseup to release drag if cursor leaves window
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                startXRef.current = 0;
                setIsDragging(false);
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp, { passive: true });
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    if (!data || data.length === 0) return null;

    return (
        <motion.div
            className="anime-carousel-section"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            <div className="modern-section-header">
                <div className="accent-bar"></div>
                <h2 className="header-title">{title}</h2>
                <button className="view-more-btn" onClick={() => navigate(`/advance${SECTION_GENRE_MAP[title] || ''}`)}>
                    Explore <span className="arrow">&rsaquo;</span>
                </button>
            </div>
            
            <div className={`carousel-wrapper ${isDragging ? 'dragging' : ''}`}>
                <div className="slider-btns">
                    <button
                        className="left-arrow"
                        onClick={() => scroll('left')}
                        aria-label="Scroll left"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path fill="none" stroke="#ff5900ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m10 17l5-5m0 0l-5-5" />
                        </svg>
                    </button>
                    <button
                        className="right-arrow"
                        onClick={() => scroll('right')}
                        aria-label="Scroll right"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path fill="none" stroke="#ff5900ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m10 17l5-5m0 0l-5-5" />
                        </svg>
                    </button>
                </div>
                <div 
                    className="anime-carousel" 
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                    {data.map((anime, index) => (
                        <AnimeCard
                            key={`${title}-${anime.id || index}`}
                            anime={anime}
                            onClick={onOpenModal}
                            index={index}
                            isDragging={isDragging}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
});
AnimeSection.displayName = 'AnimeSection';

const AnimeHomepage = () => {
    const navigate = useNavigate();
    // State
    const [loading, setLoading] = useState(true);
    // Show cinematic loader on every page load/refresh
    const [showLoader, setShowLoader] = useState(true);
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
    const searchResultsRef = useRef(null);

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

            // 1. Load pre-normalized data from cache — truly instant, no processing needed
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    const age = Date.now() - (parseInt(localStorage.getItem(CACHE_TIME_KEY)) || 0);

                    if (parsed.topAiring && parsed.trending) {
                        // Direct assignment — data is already normalized, zero extra work
                        setSections(parsed);
                        setLoading(false);
                        hasCachedData = true;

                        if (age < STALE_TIME) {
                            return; // Fresh enough, skip network
                        }
                        // Stale — fall through to background refresh
                    }
                } catch (e) {
                    console.error("Cache parse error:", e);
                    localStorage.removeItem(CACHE_KEY);
                    localStorage.removeItem(CACHE_TIME_KEY);
                }
            }

            // 2. Fetch & Normalize Fresh Data (or background update)
            try {
                const response = await axios.get(`${API}/api/anime/anime-sections`, { timeout: 15000 });
                const data = response.data.data;

                const newSections = {
                    topAiring: (data.topAiring || []).map(normalizeGridAnime).filter(Boolean),
                    mostWatched: (data.mostWatched || []).map(normalizeGridAnime).filter(Boolean),
                    topMovies: (data.topMovies || []).map(normalizeGridAnime).filter(Boolean),
                    trending: (data.trending || []).map(normalizeGridAnime).filter(Boolean),
                    topRated: (data.topRated || []).map(normalizeGridAnime).filter(Boolean),
                    upcoming: (data.upcoming || []).map(normalizeGridAnime).filter(Boolean)
                };

                setSections(newSections);
                setLoading(false);

                // Store normalized sections — next load reads this directly with no processing
                localStorage.setItem(CACHE_KEY, JSON.stringify(newSections));
                localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

            } catch (err) {
                console.error("Network fetch failed:", err);
                if (!hasCachedData) setLoading(false);
            }
        };

        loadWrapper();
    }, [normalizeGridAnime]);

    // Check Mobile — use same singleton listener as AnimeCardUI (no extra window listener)
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        setIsMobile(window.innerWidth <= 768); // set initial
        window.addEventListener('resize', handleResize, { passive: true });
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
                if (res.data && res.data.data) {
                    setSearchResults(res.data.data.map(normalizeGridAnime).filter(Boolean));
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

    // Auto-scroll to search results so user doesn't have to scroll past the hero
    useEffect(() => {
        if (isSearching && searchResultsRef.current) {
            searchResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [isSearching]);


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



    return (
        <>
            {/* Cinematic page loader — renders as overlay so data fetches concurrently */}
            {showLoader && <PageLoader onFinish={() => setShowLoader(false)} />}

            <BottomNavBar />
            <div className="homepage">
                <div className="main-content">
                    <Header showSearch={true} onSearchChange={setSearchQuery} />

                    <TrailerHero onOpenModal={openModal} isMobile={isMobile} />

                    <main className="anime-sections" ref={searchResultsRef}>
                        {isSearching ? (
                            <div className="anime-section-container">
                                {searchLoading ? (
                                    <div className="loading-search">
                                        <div className="spinner"></div>
                                        <p>Searching...</p>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="search-empty-state">
                                        <div className="search-empty-icon">🔍</div>
                                        <h3>No results found</h3>
                                        <p>Try a different title or check the spelling.</p>
                                        <button className="view-more-btn" onClick={() => navigate('/advance')} style={{ marginTop: '12px' }}>
                                            Try Advanced Search <span className="arrow">&rsaquo;</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="anime-grid">
                                        {searchResults.map((anime, index) => (
                                            <AnimeCard
                                                key={`search-${anime.id}`}
                                                anime={anime}
                                                onClick={openModal}
                                                index={index}
                                                isGrid={true}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <AnimeSection
                                    title="TRENDING THIS WEEK"
                                    data={sections.trending}
                                    onOpenModal={openModal}
                                />
                                <AnimeSection
                                    title="TOP AIRING"
                                    data={sections.topAiring}
                                    onOpenModal={openModal}
                                />
                                <AnimeSection
                                    title="UPCOMING RELEASES"
                                    data={sections.upcoming}
                                    onOpenModal={openModal}
                                />
                                <AnimeSection
                                    title="TOP MOVIES"
                                    data={sections.topMovies}
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
                            </>
                        )}
                    </main>

                    {/* Company Footer */}
                    <Footer />
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