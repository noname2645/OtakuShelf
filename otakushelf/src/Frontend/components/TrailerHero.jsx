import React, { useState, useEffect, useRef, memo } from 'react';
import axios from 'axios';
import { motion } from "framer-motion";
import { useAnimePreferences } from './useAnimePreferences';
import {
    buildHeroAnnouncements,
    fetchHeroEraData,
    readCache,
    writeCache,
    HERO_ERA_CACHE_KEY,
    HERO_ERA_CACHE_TTL,
} from '../lib/anilistClient.js';
import '../Stylesheets/TrailerHero.css';

// API base URL
const API = import.meta.env.VITE_API_BASE_URL;

// TrailerHero Component
const TrailerHero = ({ onOpenModal }) => {
    const [currentAnime, setCurrentAnime] = useState(0);
    const heroRef = useRef(null);
    const { getPreferredTitle, shouldAutoplay, shouldBlurNSFW } = useAnimePreferences();
    const [isMuted, setIsMuted] = useState(true);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [playerError, setPlayerError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [fallbackImageLoaded, setFallbackImageLoaded] = useState(false);
    const [fallbackImageUrl, setFallbackImageUrl] = useState('');
    // ⚡ Initialize directly from cache so hero is instant on re-mount
    const [announcements, setAnnouncements] = useState(() => {
        try {
            const cached = localStorage.getItem('hero_announcements');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) { }
        return [];
    });
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [safeAreaTop, setSafeAreaTop] = useState('0px');
    const [safeAreaBottom, setSafeAreaBottom] = useState('0px');

    // Detect touch-only devices (mobile/tablet) - used for trailer fallback logic
    useEffect(() => {
        const touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
        const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
        setIsTouchDevice(touchSupported && !hasFinePointer);
    }, []);
    // Only show loading spinner when we truly have nothing yet
    const [isFetchingData, setIsFetchingData] = useState(() => {
        try {
            const cached = localStorage.getItem('hero_announcements');
            if (cached) {
                const parsed = JSON.parse(cached);
                return !(Array.isArray(parsed) && parsed.length > 0);
            }
        } catch (_) { }
        return true;
    });

    // Horizontal scroll functionality for main hero
    const isDragging = useRef(false);
    const autoScrollRef = useRef(null);
    const rafScrollRef = useRef(null);

    // YouTube player refs
    const playerRef = useRef(null);
    const youtubeContainerRef = useRef(null);
    const isYouTubeAPILoaded = useRef(false);

    // Detect mobile and safe areas
    useEffect(() => {
        const isMobileBreakpoint = () => window.innerWidth <= 768;
        const isTabletBreakpoint = () => window.innerWidth > 768 && window.innerWidth <= 1024;
        
        let prevMobile = isMobileBreakpoint();
        let prevTablet = isTabletBreakpoint();
        
        const checkMobile = () => {
            const mobile = isMobileBreakpoint();
            const tablet = isTabletBreakpoint();
            if (mobile !== prevMobile) {
                prevMobile = mobile;
                setIsMobile(mobile);
            }
            if (tablet !== prevTablet) {
                prevTablet = tablet;
                setIsTablet(tablet);
            }

            // Get safe area insets for modern phones (notch, home indicator)
            if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
                setSafeAreaTop('env(safe-area-inset-top)');
                setSafeAreaBottom('env(safe-area-inset-bottom)');
            }
        };

        setIsMobile(prevMobile);
        setIsTablet(prevTablet);
        window.addEventListener('resize', checkMobile, { passive: true });
        window.addEventListener('orientationchange', checkMobile, { passive: true });

        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('orientationchange', checkMobile);
        };
    }, []);

    // Auto-scroll function
    const startAutoScroll = () => {
        if (autoScrollRef.current) {
            clearInterval(autoScrollRef.current);
        }

        if (announcements.length <= 1) return;

        autoScrollRef.current = setInterval(() => {
            if (!isDragging.current) {
                setCurrentAnime(prev => (prev + 1) % announcements.length);
            }
        }, 30000);
    };

    const getAnimeTitle = (anime) => {
        if (!anime) return "Unknown Title";
        return getPreferredTitle(anime.title) || anime.title_english || anime.title_romaji || "Unknown Title";
    };

    const getAnimeDescription = (anime) => {
        return anime.description || anime.synopsis || 'No description available.';
    };

    // Check if current anime has a trailer
    const hasTrailer = (anime) => {
        const videoId = getVideoId(anime);
        return !!videoId;
    };

    // Get clean video ID from trailer
    const getVideoId = (anime) => {
        if (anime.trailer?.site === "youtube" && anime.trailer?.id) {
            return anime.trailer.id;
        }
        if (anime.trailer?.embed_url) {
            const match = anime.trailer.embed_url.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            return match ? match[1] : null;
        }
        return null;
    };

    // Safe player cleanup
    const cleanupPlayer = () => {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
            try {
                playerRef.current.destroy();
            } catch (e) {
                console.log('Error destroying player (safe cleanup):', e);
            }
        }
        playerRef.current = null;
        setIsPlayerReady(false);

        if (youtubeContainerRef.current) {
            youtubeContainerRef.current.innerHTML = '';
        }
    };

    // Initialize YouTube player
    const initializePlayer = (videoId) => {
        if (!videoId) {
            setPlayerError(true);
            return;
        }

        cleanupPlayer();

        if (!window.YT) {
            if (!isYouTubeAPILoaded.current) {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                isYouTubeAPILoaded.current = true;
            }

            window.onYouTubeIframeAPIReady = () => {
                createYouTubePlayer(videoId);
            };
        } else {
            createYouTubePlayer(videoId);
        }
    };

    // Create YouTube player instance
    const createYouTubePlayer = (videoId) => {
        if (!youtubeContainerRef.current || !window.YT) {
            setPlayerError(true);
            return;
        }

        try {
            // Mobile-specific player vars
            const playerVars = {
                autoplay: shouldAutoplay() ? 1 : 0,
                mute: 1,
                loop: 1,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                enablejsapi: 1,
                origin: window.location.origin,
                playlist: videoId,
                playsinline: 1,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
            };

            // Add mobile-specific optimizations
            if (isMobile) {
                playerVars.autohide = 1;
                playerVars.vq = 'hd720';
            }

            playerRef.current = new window.YT.Player(youtubeContainerRef.current, {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: playerVars,
                events: {
                    onReady: (event) => {
                        // console.log('YouTube player ready');
                        setIsPlayerReady(true);
                        setPlayerError(false);
                        try {
                            const quality = isMobile ? 'hd720' : 'hd1080';
                            event.target.setPlaybackQuality(quality);

                            if (hasUserInteracted) {
                                event.target.playVideo();
                            }
                        } catch (error) {
                            console.log('Error starting video:', error);
                        }
                    },
                    onError: (event) => {
                        console.error('YouTube Player Error:', event.data);
                        setIsPlayerReady(false);
                        setPlayerError(true);
                    },
                    onStateChange: (event) => {
                        if (event.data === window.YT.PlayerState.ENDED) {
                            event.target.playVideo();
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating YouTube player:', error);
            setPlayerError(true);
        }
    };

    useEffect(() => {
        if (playerError && retryCount < 2) {
            const timer = setTimeout(() => {
                setRetryCount(prev => prev + 1);
                setPlayerError(false);

                const currentAnimeData = announcements[currentAnime];
                const videoId = getVideoId(currentAnimeData);

                if (videoId) {
                    initializePlayer(videoId);
                }
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [playerError, retryCount, currentAnime, announcements]);

    // Track user interaction for autoplay permission
    useEffect(() => {
        const handleInteraction = () => {
            setHasUserInteracted(true);
        };

        const events = ['click', 'touchstart', 'scroll', 'keydown', 'mouseover'];

        events.forEach(event => {
            document.addEventListener(event, handleInteraction, { once: true, passive: true });
        });

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleInteraction);
            });
        };
    }, []);

    const toggleMute = (e) => {
        e.stopPropagation();
        if (playerRef.current && isPlayerReady) {
            try {
                if (isMuted) {
                    playerRef.current.unMute();
                    playerRef.current.setVolume(50);
                } else {
                    playerRef.current.mute();
                }
                setIsMuted(!isMuted);
            } catch (error) {
                console.error('Error toggling mute:', error);
            }
        }
    };

    // Normalize hero anime data with mobile optimizations
    const normalizeHeroAnime = (anime) => {
        return {
            id: anime.id,
            animeId: anime.id,
            animeMalId: anime.idMal || null,
            title: {
                romaji: anime.title?.romaji || null,
                english: anime.title?.english || null,
                native: anime.title?.native || null,
            },
            coverImage: {
                extraLarge: anime.coverImage?.extraLarge || null,
                large: anime.coverImage?.large || null,
                medium: anime.coverImage?.medium || null,
            },
            bannerImage: anime.bannerImage || null,
            trailer: anime.trailer || null,
            description: anime.description || null,
            episodes: anime.episodes || null,
            averageScore: anime.averageScore || null,
            status: anime.status || null,
            seasonYear: anime.seasonYear || null,
            genres: anime.genres || [],
            isAdult: anime.isAdult || false,
            format: anime.format || null,
            startDate: anime.startDate || null,
            endDate: anime.endDate || null,
            shortDescription: anime.description ? anime.description.substring(0, 200) + '...' : null,
            // Era curation fields from backend
            _era: anime._era || null,
            _eraLabel: anime._eraLabel || null,
            ...anime,
        };
    };

    // Fetch announcements — cache-first, then the API worker (fast path), then
    // a direct AniList call from the browser. The worker's egress IP is blocked
    // by AniList in production, so the direct browser call is what actually
    // loads the hero on animeregistry.com / animeregistry.pages.dev. Retries
    // are bounded so the skeleton can never shimmer forever.
    useEffect(() => {
        const CACHE_KEY = 'hero_announcements';
        const CACHE_TTL = 10 * 60 * 1000; // 10 min — picks are randomized, refresh often
        const controller = new AbortController();
        let cancelled = false;
        let retryTimer = null;

        const persist = (list) => {
            if (cancelled || !Array.isArray(list) || list.length === 0) return false;
            setAnnouncements(list);
            localStorage.setItem(CACHE_KEY, JSON.stringify(list));
            localStorage.setItem(`${CACHE_KEY}_time`, String(Date.now()));
            return true;
        };

        const buildFromEraData = (eraData) => {
            const interleaved = buildHeroAnnouncements(eraData);
            if (interleaved.length === 0) return false;
            return persist(interleaved.map(normalizeHeroAnime));
        };

        const fetchAnnouncements = async (attempt) => {
            // Fresh cache → skip the network entirely.
            const cacheTime = parseInt(localStorage.getItem(`${CACHE_KEY}_time`) || '0', 10);
            if (announcements.length > 0 && Date.now() - cacheTime <= CACHE_TTL) {
                setIsFetchingData(false);
                return;
            }

            // Fast path: API worker (localhost / warmed KV cache). Short timeout.
            try {
                const response = await axios.get(`${API}/api/anilist/hero-trailers`, { timeout: 6000, signal: controller.signal });
                const data = response.data?.data;
                if (Array.isArray(data) && data.length > 0) {
                    if (persist(data.map(normalizeHeroAnime))) {
                        setIsFetchingData(false);
                        return;
                    }
                }
            } catch (err) {
                if (err.name !== 'CanceledError') console.error("Hero worker fetch:", err.message);
            }

            // Direct AniList from the browser. Era data is cached in
            // localStorage for 6h so repeat visits never re-query AniList.
            let gotData = false;
            try {
                const cachedEra = readCache(HERO_ERA_CACHE_KEY, { maxAgeMs: HERO_ERA_CACHE_TTL });
                let eraData = cachedEra;
                if (!eraData) {
                    eraData = await fetchHeroEraData({ timeout: 12000, signal: controller.signal });
                    if (Object.keys(eraData).length > 0) writeCache(HERO_ERA_CACHE_KEY, eraData);
                }
                gotData = buildFromEraData(eraData);
            } catch (err) {
                if (err.name !== 'CanceledError') console.error("Hero AniList fetch failed:", err.message);
            }

            // Bounded retry: one more attempt shortly after, then stop.
            if (!gotData && !cancelled && attempt < 1) {
                retryTimer = setTimeout(() => fetchAnnouncements(attempt + 1), 4000);
            } else {
                setIsFetchingData(false);
            }
        };

        fetchAnnouncements(0);

        return () => {
            cancelled = true;
            controller.abort();
            if (retryTimer) clearTimeout(retryTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle scroll effect for fade — use rAF + direct DOM mutation to avoid React re-render on every scroll tick
    useEffect(() => {
        const heroEl = heroRef.current;
        const handleScroll = () => {
            if (rafScrollRef.current) return; // already queued
            rafScrollRef.current = requestAnimationFrame(() => {
                rafScrollRef.current = null;
                const scrollTop = window.pageYOffset;
                const heroHeight = heroEl?.offsetHeight || 600;
                const fadeStart = heroHeight * 0.3;
                const fadeEnd = heroHeight * 0.8;
                let newOpacity = 1;
                if (scrollTop > fadeStart) {
                    newOpacity = Math.max(0, 1 - (scrollTop - fadeStart) / (fadeEnd - fadeStart));
                }
                // Directly mutate DOM style — no React re-render, buttery smooth
                if (heroEl) heroEl.style.opacity = newOpacity;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (rafScrollRef.current) cancelAnimationFrame(rafScrollRef.current);
        };
    }, []);

    // Main effect for auto-advance and player management
    useEffect(() => {
        let heroIntervalId;

        const currentAnimeData = announcements[currentAnime];
        if (!currentAnimeData) return;

        // Reset player error and retry count when switching anime
        setPlayerError(false);
        setRetryCount(0);
        const videoId = getVideoId(currentAnimeData);
        const currentAnimeHasTrailer = hasTrailer(currentAnimeData);

        // Only reset fallback image state if the new anime has a trailer
        if (currentAnimeHasTrailer) {
            setFallbackImageLoaded(false);
        }

        if (currentAnimeHasTrailer && videoId) {
            if (shouldUseVideoFallback()) {
                cleanupPlayer();
                setPlayerError(true);
            } else {
                setTimeout(() => {
                    initializePlayer(videoId);
                }, 100);
            }
        } else {
            setPlayerError(true);
            cleanupPlayer();
        }

        // Pre-load the fallback image and only swap the URL after it has finished loading to prevent blinking
        const imgUrl = getHeroImage(currentAnimeData);
        if (imgUrl) {
            const img = new Image();
            img.onload = () => {
                setFallbackImageUrl(imgUrl);
                setFallbackImageLoaded(true);
            };
            img.onerror = () => {
                setFallbackImageUrl(imgUrl);
                setFallbackImageLoaded(true);
            };
            img.src = imgUrl;
        } else {
            setFallbackImageUrl('');
            setFallbackImageLoaded(false);
        }

        // Start auto-scroll
        startAutoScroll();

        return () => {
            if (heroIntervalId) {
                clearInterval(heroIntervalId);
            }
            if (autoScrollRef.current) {
                clearInterval(autoScrollRef.current);
            }
        };
    }, [currentAnime, announcements, hasUserInteracted]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            cleanupPlayer();
            if (autoScrollRef.current) {
                clearInterval(autoScrollRef.current);
            }
            window.onYouTubeIframeAPIReady = null;
        };
    }, []);

    // Retry autoplay when user interacts
    useEffect(() => {
        if (hasUserInteracted && playerRef.current && isPlayerReady && !shouldUseVideoFallback()) {
            try {
                playerRef.current.mute();
                playerRef.current.playVideo();
            } catch (error) {
                console.error('Error starting video after interaction:', error);
            }
        }
    }, [hasUserInteracted, isPlayerReady, isMobile, isTablet, isTouchDevice]);

    // Mobile-optimized helper functions
    const formatGenres = (genres) => {
        if (!genres || genres.length === 0) return "Unknown";
        const maxGenres = isMobile ? 2 : 3;
        return genres.slice(0, maxGenres).map(g => g.name || g).join(" • ");
    };

    const truncateDescription = (description) => {
        if (!description) return "No description available.";
        const cleanText = description
            .replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .trim();

        const mobileMaxLength = isMobile ? 250 : 180;
        return cleanText.length > mobileMaxLength
            ? cleanText.substring(0, mobileMaxLength) + "..."
            : cleanText;
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'releasing': return '#2E7D32';
            case 'not_yet_released': return '#BF360C';
            case 'finished': return '#1565C0';
            default: return '#616161';
        }
    };

    const shouldUseVideoFallback = () => isMobile || isTablet || isTouchDevice;

    const getHeroImage = (anime) => {
        if (!anime) return '';
        if (shouldUseVideoFallback()) {
            return anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium || anime.bannerImage || '';
        }
        return anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || '';
    };

    // Skeleton while actually fetching; a graceful static hero once all fetch
    // attempts are exhausted (so it can never shimmer forever).
    const currentAnimeData = announcements[currentAnime];
    if (!currentAnimeData) {
        if (isFetchingData) {
            return (
                <section className="trailer-hero-section trailer-hero-skeleton"
                    style={{
                        paddingTop: safeAreaTop,
                        paddingBottom: safeAreaBottom
                    }}>
                    <div className="trailer-skeleton-bg" />
                    <div className="gradient-overlay" />
                    <div className="trailer-skeleton-content">
                        <div className="skeleton-title" />
                        <div className="skeleton-meta" />
                        <div className="skeleton-desc" />
                        <div className="skeleton-btn" />
                    </div>
                </section>
            );
        }

        return (
            <section className="trailer-hero-section trailer-hero-fallback"
                style={{
                    paddingTop: safeAreaTop,
                    paddingBottom: safeAreaBottom
                }}>
                <div className="trailer-fallback-bg" />
                <div className="gradient-overlay" />
                <div className="trailer-fallback-content">
                    <img src="/animeregistryname.png" alt="AnimeRegistry" className="trailer-fallback-logo" />
                    <p>Discover, track and obsess over your favorite anime.</p>
                    <span className="trailer-fallback-hint">Trending trailers below ↓</span>
                </div>
            </section>
        );
    }

    const currentAnimeHasTrailer = hasTrailer(currentAnimeData);
    const useImageFallback = shouldUseVideoFallback();
    const showNavigationArrows = announcements.length > 1;

    return (
        <>
            {/* Trailer Section */}
            <section
                ref={heroRef}
                className="trailer-hero-section"
                style={{
                    paddingTop: safeAreaTop,
                    paddingBottom: safeAreaBottom
                }}
            >
                {/* YouTube Player Container */}
                <div
                    ref={youtubeContainerRef}
                    className={`youtube-container ${currentAnimeHasTrailer && !playerError && !useImageFallback ? 'active' : 'hidden'}`}
                />

                {/* Fallback Image — always in DOM, fade controlled by CSS class */}
                <div
                    className={`fallback-image${fallbackImageLoaded && (playerError || !currentAnimeHasTrailer || useImageFallback) ? ' visible' : ''}`}
                    style={{
                        backgroundImage: fallbackImageUrl ? `url(${fallbackImageUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center center'
                    }}
                />

                {/* User Interaction Prompt */}
                {currentAnimeHasTrailer && !hasUserInteracted && !playerError && !useImageFallback && (
                    <div
                        className="user-interaction-prompt"
                        onClick={() => setHasUserInteracted(true)}
                        style={{ fontSize: isMobile ? '0.9rem' : '1.1rem' }}
                    >
                        {isMobile ? 'Tap to play video' : 'Click anywhere to enable video'}
                    </div>
                )}

                {/* No Trailer Indicator */}
                {!currentAnimeHasTrailer && !useImageFallback && (
                    <div
                        className="no-trailer-indicator"
                        style={{
                            top: `calc(${safeAreaTop} + 10px)`,
                            right: `calc(${safeAreaTop} + 10px)`
                        }}
                    >
                        🎬 {isMobile ? 'No trailer' : 'No trailer available - displaying banner image'}
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="gradient-overlay" />

                {/* Content Overlay */}
                <motion.div
                    key={currentAnime}
                    initial={{ y: isMobile ? 50 : 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`content-overlay${isMobile || isTablet ? ' content-overlay--center' : ''}`}
                    style={{
                        bottom: isMobile || isTablet ? undefined : (isMobile ? '22%' : '20%'),
                        left: isMobile || isTablet ? '12%' : '7%',
                        right: isMobile || isTablet ? '12%' : '7%',
                        maxWidth: isMobile || isTablet ? '100%' : '600px'
                    }}
                >


                    <h2 className="anime-title">
                        {getAnimeTitle(currentAnimeData)}
                    </h2>

                    <div className="anime-meta">
                        <span className="status-badge" style={{ backgroundColor: getStatusColor(currentAnimeData.status) }}>
                            {currentAnimeData.status?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                        <span>{currentAnimeData.seasonYear || 'TBA'}</span>
                        {currentAnimeData.episodes && <>•<span>{currentAnimeData.episodes} Episodes</span></>}
                        {currentAnimeData.averageScore && (
                            <>•<span className="score">⭐ {(currentAnimeData.averageScore) / 10}/10</span></>
                        )}
                    </div>

                    <p className="anime-description">
                        {truncateDescription(getAnimeDescription(currentAnimeData))}
                    </p>

                    <div className="genres">
                        <strong>Genres:</strong> {formatGenres(currentAnimeData.genres)}
                    </div>

                    <button
                        onClick={() => onOpenModal(currentAnimeData)}
                        className="details-button"
                        style={{
                            width: isMobile ? '100%' : 'auto',
                            maxWidth: isMobile ? '250px' : 'none'
                        }}
                    >
                        <svg width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                        </svg>
                        More Details
                    </button>

                    {/* Mute/Unmute Button */}
                    {currentAnimeHasTrailer && isPlayerReady && !playerError && !useImageFallback && (
                        <button
                            onClick={toggleMute}
                            className="mute-button"
                            aria-label={isMuted ? "Unmute" : "Mute"}
                        >
                            <img
                                src={isMuted ? "/sound-off-svgrepo-com.svg" : "/sound-volume-1-svgrepo-com.svg"}
                                alt={isMuted ? "Unmute" : "Mute"}
                                className="mute-button-icon"
                            />
                        </button>
                    )}

                    <div className="hero-scroll-hint-inline">
                        <span className="hero-scroll-text">Scroll</span>
                        <svg className="hero-scroll-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M19 12l-7 7-7-7" />
                        </svg>
                    </div>
                </motion.div>

                {/* Navigation Arrows */}
                {showNavigationArrows && (
                    <div className="slider-btns">
                        <button
                            className="left-arrow"
                            aria-label="Previous anime"
                            onClick={() => setCurrentAnime(prev => prev === 0 ? announcements.length - 1 : prev - 1)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path fill="none" stroke="#ff5900ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m10 17l5-5m0 0l-5-5" />
                            </svg>
                        </button>
                        <button
                            className="right-arrow"
                            aria-label="Next anime"
                            onClick={() => setCurrentAnime(prev => (prev + 1) % announcements.length)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path fill="none" stroke="#ff5900ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m10 17l5-5m0 0l-5-5" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Progress Bar & Next Previews */}
                {!isMobile && !isTablet && !isTouchDevice && announcements.length > 1 && (
                    <div className="hero-bottom-controls">
                        <div className="hero-next-previews">
                            <div className="up-next-header">
                                <span className="up-next-text">Up Next</span>
                                <div className="progress-bar-container2">
                                    <motion.div 
                                        className="progress-bar-fill2"
                                        key={currentAnime}
                                        initial={{ width: "0%" }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 30, ease: "linear" }}
                                    />
                                </div>
                            </div>
                            <div className="preview-thumbnails">
                                {[1, 2, 3, 4].map((offset) => {
                                    const nextIndex = (currentAnime + offset) % announcements.length;
                                    const nextAnime = announcements[nextIndex];
                                    if (!nextAnime) return null;

                                    // Use YouTube hqdefault thumbnail (guaranteed to exist) to prevent broken grey placeholders
                                    const videoId = getVideoId(nextAnime);
                                    const thumbUrl = videoId
                                        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                                        : getHeroImage(nextAnime);

                                    return (
                                        <div 
                                            key={nextIndex} 
                                            className="preview-thumb"
                                            onClick={() => setCurrentAnime(nextIndex)}
                                            style={{ backgroundImage: `url(${thumbUrl})` }}
                                            title={getAnimeTitle(nextAnime)}
                                        >
                                            <div className="preview-overlay">
                                                <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
                                                    <path d="M8 5v14l11-7z"/>
                                                </svg>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Trailer Spacer */}
            <div
                className="trailer-spacer"
                style={{
                    height: `calc(100vh - ${safeAreaTop} - ${safeAreaBottom})`,
                    marginTop: safeAreaTop
                }}
            />
        </>
    );
};

export default memo(TrailerHero);