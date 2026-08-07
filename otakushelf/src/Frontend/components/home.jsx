import React, { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import "../Stylesheets/home.css";
import axios from "axios";
import Modal from "../components/modal.jsx";
import TrailerHero from './TrailerHero.jsx';
import { Header } from '../components/header.jsx';
import BottomNavBar from './bottom.jsx';
import Footer from './footer.jsx';
import HomeSEOContent from './HomeSEOContent.jsx';
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { usePageLoader } from './PageLoaderContext.jsx';
import { fetchSectionsFromAniList, readCache, writeCache } from '../lib/anilistClient.js';

// API base URL
const API = import.meta.env.VITE_API_BASE_URL;

// Stale-while-revalidate key
const CACHE_KEY = 'animeSections_normalized_v2';
const STALE_TIME = 1000 * 60 * 60;

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
            viewport={{ once: false, amount: 0.05 }}
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
    const { finishLoading } = usePageLoader();
    useEffect(() => {
        window.__homeMounts = (window.__homeMounts || 0) + 1;
        console.log('HOME_MOUNT', window.__homeMounts);
        return () => console.log('HOME_UNMOUNT', window.__homeMounts);
    }, []);
    // State
    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState({
        topAiring: [],
        mostWatched: [],
        topMovies: [],
        trending: [],
        topRated: [],
        upcoming: []
    });

    // Search State — initialized from ?q= so the SearchAction schema is crawlable
    const [searchQuery, setSearchQuery] = useState(() => {
        if (typeof window === 'undefined') return "";
        return new URLSearchParams(window.location.search).get('q') || "";
    });
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

    // Data Fetching — cache-first, then API worker (fast path), then a direct
    // AniList call from the browser. The worker's egress IP is blocked by
    // AniList in production, so the direct browser call is what makes the
    // sections appear on animeregistry.com / animeregistry.pages.dev. Every
    // step has a timeout so the skeleton can never hang indefinitely.
    const hasSectionsContent = useCallback((obj) => {
        return !!obj && Object.values(obj).some(arr => arr?.length > 0);
    }, []);

    const normalizeSections = useCallback((data) => {
        return {
            topAiring: (data.topAiring || []).map(normalizeGridAnime).filter(Boolean),
            mostWatched: (data.mostWatched || []).map(normalizeGridAnime).filter(Boolean),
            topMovies: (data.topMovies || []).map(normalizeGridAnime).filter(Boolean),
            trending: (data.trending || []).map(normalizeGridAnime).filter(Boolean),
            topRated: (data.topRated || []).map(normalizeGridAnime).filter(Boolean),
            upcoming: (data.upcoming || []).map(normalizeGridAnime).filter(Boolean),
        };
    }, [normalizeGridAnime]);

    const loadRef = useRef(false);
    useEffect(() => {
      if (loadRef.current) return;
      loadRef.current = true;

      let staleCacheRestored = false;
      const controller = new AbortController();

      const loadWrapper = async () => {
          // 1. Fresh localStorage cache → render instantly, skip the network.
          const freshCache = readCache(CACHE_KEY, { maxAgeMs: STALE_TIME });
          if (freshCache && hasSectionsContent(freshCache)) {
              setSections(freshCache);
              setLoading(false);
              return;
          }

          // 2. Stale cache (any age) → render now, refresh in the background.
          const staleCache = readCache(CACHE_KEY);
          if (staleCache && hasSectionsContent(staleCache)) {
              setSections(staleCache);
              setLoading(false);
              staleCacheRestored = true;
          }

          // 3. API worker fast path (localhost / warmed KV cache).
          let backendOk = false;
          try {
              const response = await axios.get(`${API}/api/anime/anime-sections`, { timeout: 6000, signal: controller.signal });
              const data = response.data.data;
              if (hasSectionsContent(data)) {
                  const newSections = normalizeSections(data);
                  setSections(newSections);
                  writeCache(CACHE_KEY, newSections);
                  backendOk = true;
              }
          } catch (err) {
              if (err.name !== 'CanceledError') console.error("Backend fetch:", err.message);
          }

          if (backendOk) {
              setLoading(false);
              return;
          }

          // 4. Direct AniList from the browser (parallel + timeouts).
          //    This always resolves — it can never leave the skeleton hanging.
          try {
              const sections = await fetchSectionsFromAniList({ signal: controller.signal });
              if (hasSectionsContent(sections)) {
                  const newSections = normalizeSections(sections);
                  setSections(newSections);
                  writeCache(CACHE_KEY, newSections);
              }
          } catch (err) {
              if (err.name !== 'CanceledError') console.error("AniList direct fetch failed:", err);
          }

          if (!staleCacheRestored) setLoading(false);
      };

      loadWrapper();

      return () => {
          controller.abort();
          loadRef.current = false;
      };
    }, [normalizeGridAnime, hasSectionsContent, normalizeSections]);

    // Tell the global loader the page is ready
    useEffect(() => {
        if (!loading) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    finishLoading();
                });
            });
        }
    }, [loading, finishLoading]);

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

    // Search Logic — queries AniList directly from the browser (worker egress
    // IP is blocked by AniList, so proxying through the worker returns 500).
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
                const res = await axios.post('https://graphql.anilist.co', {
                    query: `query ($search: String, $limit: Int) {
                        Page(perPage: $limit) {
                            media(search: $search, type: ANIME, isAdult: false) {
                                id title { romaji english } coverImage { extraLarge large medium }
                                bannerImage episodes format status genres averageScore
                                description season seasonYear startDate { year month day }
                                endDate { year month day } studios { edges { node { name } } }
                                trailer { id site }
                            }
                        }
                    }`,
                    variables: { search: searchQuery.trim(), limit: 20 },
                }, {
                    signal: controllerRef.current.signal,
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                });
                if (res.data?.errors) throw new Error(res.data.errors[0]?.message || 'GraphQL error');
                const media = res.data?.data?.Page?.media || [];
                setSearchResults(media.map(normalizeGridAnime).filter(Boolean));
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

    // Keep the ?q= param in sync with the search box (no reload, SEO SearchAction target)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        const trimmed = searchQuery.trim();
        if (trimmed) url.searchParams.set('q', trimmed);
        else url.searchParams.delete('q');
        window.history.replaceState(null, '', url.toString());
    }, [searchQuery]);

    // Auto-scroll to search results so user doesn't have to scroll past the hero
    useEffect(() => {
        if (isSearching && searchResultsRef.current) {
            searchResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [isSearching]);


    // Modal Handlers
    const openModal = useCallback((anime) => {
        // startTransition keeps the main thread responsive (better INP) while the
        // heavy modal mounts in a non-blocking concurrent update.
        startTransition(() => {
            setSelectedAnime(anime);
            setIsModalOpen(true);
        });
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

                    {/* On-page SEO content: anime list info, FAQ and CTA */}
                    <HomeSEOContent />

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