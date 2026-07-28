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
const ANILIST_URL = 'https://graphql.anilist.co';

// Stale-while-revalidate key
const CACHE_KEY = 'animeSections_normalized_v2';
const CACHE_TIME_KEY = `${CACHE_KEY}_time`;
const STALE_TIME = 1000 * 60 * 60;

const ANILIST_SECTION_QUERIES = {
  topAiring: `query { Page(perPage: 10) { media(status: RELEASING, sort: SCORE_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes nextAiringEpisode { episode airingAt } format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site } } } }`,
  trending: `query { Page(perPage: 10) { media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site } } } }`,
  topRated: `query { Page(perPage: 10) { media(sort: SCORE_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site } } } }`,
  upcoming: `query { Page(perPage: 10) { media(status: NOT_YET_RELEASED, sort: POPULARITY_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site } } } }`,
  topMovies: `query { Page(perPage: 10) { media(format: MOVIE, sort: POPULARITY_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site } } } }`,
  mostWatched: `query { Page(perPage: 10) { media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) { id title { romaji english } coverImage { extraLarge large medium } bannerImage episodes format status genres averageScore description seasonYear startDate { year month day } endDate { year month day } studios { edges { node { name } } } trailer { id site } } } }`,
};

const GENRE_FILTERS = ['Hentai'];

async function fetchAniListSection(key) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query: ANILIST_SECTION_QUERIES[key] }),
  });
  if (!res.ok) throw new Error(`AniList ${key}: ${res.status}`);
  const json = await res.json();
  return (json.data?.Page?.media || []).filter(m => !m.genres?.some(g => GENRE_FILTERS.includes(g)));
}

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
    const [isComputer, setIsComputer] = useState(true);

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
            year: anime.year || anime.startDate?.year || anime.seasonYear || null,
            startDate: anime.startDate || anime.aired?.from || null,
            endDate: anime.endDate || anime.aired?.to || null,
        };
    }, []);

    // Data Fetching with Fallback
    useEffect(() => {
        let staleCacheRestored = false;

        const loadWrapper = async () => {
            const cachedRaw = localStorage.getItem(CACHE_KEY);
            let cachedSections = null;
            let cacheAge = Infinity;

            if (cachedRaw) {
                try {
                    const parsed = JSON.parse(cachedRaw);
                    cacheAge = Date.now() - (parseInt(localStorage.getItem(CACHE_TIME_KEY)) || 0);
                    const hasContent = parsed.topAiring?.length > 0 || parsed.trending?.length > 0 ||
                        parsed.upcoming?.length > 0 || parsed.topMovies?.length > 0 ||
                        parsed.mostWatched?.length > 0 || parsed.topRated?.length > 0;

                    if (hasContent) {
                        cachedSections = parsed;
                        if (cacheAge < STALE_TIME) {
                            setSections(parsed);
                            setLoading(false);
                            return;
                        }
                    }
                } catch (e) {
                    localStorage.removeItem(CACHE_KEY);
                    localStorage.removeItem(CACHE_TIME_KEY);
                }
            }

            // Show stale cache immediately while fetching fresh data
            if (cachedSections) {
                setSections(cachedSections);
                setLoading(false);
                staleCacheRestored = true;
            }

            // Try backend first
            let backendOk = false;
            try {
                const response = await axios.get(`${API}/api/anime/anime-sections`, { timeout: 15000 });
                const data = response.data.data;
                const hasData = data && Object.values(data).some(arr => arr?.length > 0);

                if (hasData) {
                    const newSections = {
                        topAiring: (data.topAiring || []).map(normalizeGridAnime).filter(Boolean),
                        mostWatched: (data.mostWatched || []).map(normalizeGridAnime).filter(Boolean),
                        topMovies: (data.topMovies || []).map(normalizeGridAnime).filter(Boolean),
                        trending: (data.trending || []).map(normalizeGridAnime).filter(Boolean),
                        topRated: (data.topRated || []).map(normalizeGridAnime).filter(Boolean),
                        upcoming: (data.upcoming || []).map(normalizeGridAnime).filter(Boolean)
                    };
                    setSections(newSections);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(newSections));
                    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
                    backendOk = true;
                }
            } catch (err) {
                console.error("Backend fetch:", err.message);
            }

            if (backendOk) {
                if (!staleCacheRestored) setLoading(false);
                return;
            }

            // Fallback: call AniList directly from browser
            try {
                const sectionKeys = ['trending', 'topAiring', 'upcoming', 'topMovies', 'mostWatched', 'topRated'];
                const results = {};
                for (const key of sectionKeys) {
                    try {
                        results[key] = await fetchAniListSection(key);
                    } catch (e) {
                        results[key] = [];
                    }
                }

                const newSections = {
                    trending: (results.trending || []).map(normalizeGridAnime).filter(Boolean),
                    topAiring: (results.topAiring || []).map(normalizeGridAnime).filter(Boolean),
                    upcoming: (results.upcoming || []).map(normalizeGridAnime).filter(Boolean),
                    topMovies: (results.topMovies || []).map(normalizeGridAnime).filter(Boolean),
                    mostWatched: (results.mostWatched || []).map(normalizeGridAnime).filter(Boolean),
                    topRated: (results.topRated || []).map(normalizeGridAnime).filter(Boolean),
                };

                setSections(newSections);
                localStorage.setItem(CACHE_KEY, JSON.stringify(newSections));
                localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
            } catch (e) {
                console.error("AniList fallback failed:", e);
            }

            if (!staleCacheRestored) setLoading(false);
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

    // Detect whether device is a "computer" (supports hover + fine pointer)
    useEffect(() => {
        const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
        const update = () => setIsComputer(mq.matches);
        update();
        if (mq.addEventListener) mq.addEventListener('change', update);
        else mq.addListener(update);
        window.addEventListener('resize', update, { passive: true });
        return () => {
            if (mq.removeEventListener) mq.removeEventListener('change', update);
            else mq.removeListener(update);
            window.removeEventListener('resize', update);
        };
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
                    <Header showSearch={isComputer} onSearchChange={setSearchQuery} />

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