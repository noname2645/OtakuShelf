import React, { useState, useEffect, useRef, memo } from 'react';
import axios from 'axios';
import { motion } from "framer-motion";
import '../Stylesheets/TrailerHero.css';

// API base URL
const API_BASE = import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : "https://otakushelf-uuvw.onrender.com";

// TrailerHero Component
const TrailerHero = ({ onOpenModal }) => {
    const [currentAnime, setCurrentAnime] = useState(0);
    const [opacity, setOpacity] = useState(1);
    const heroRef = useRef(null);
    const [isMuted, setIsMuted] = useState(true);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [playerError, setPlayerError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [announcements, setAnnouncements] = useState([]);

    // Horizontal scroll functionality for main hero
    const isDragging = useRef(false);
    const autoScrollRef = useRef(null);

    // YouTube player refs
    const playerRef = useRef(null);
    const youtubeContainerRef = useRef(null);
    const isYouTubeAPILoaded = useRef(false);


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
        if (anime.title?.english) return anime.title.english;
        if (anime.title?.romaji) return anime.title.romaji;
        if (anime.title?.native) return anime.title.native;
        if (typeof anime.title === 'string') return anime.title;
        if (anime.title_english) return anime.title_english;
        if (anime.title_romaji) return anime.title_romaji;
        return anime.title || 'Unknown Title';
    };

    // Fetch with retry logic
    const fetchWithRetry = async (url, retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.get(url, { timeout: 10000 });
                return response.data;
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
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
            playerRef.current = new window.YT.Player(youtubeContainerRef.current, {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    autoplay: hasUserInteracted ? 1 : 0,
                    mute: 1,
                    loop: 1,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    enablejsapi: 1,
                    origin: window.location.origin,
                    playlist: videoId
                },
                events: {
                    onReady: (event) => {
                        console.log('YouTube player ready');
                        setIsPlayerReady(true);
                        setPlayerError(false);
                        try {
                            event.target.setPlaybackQuality('hd1080');
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

    // Normalize hero anime data
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
            ...anime,
        };
    };

    // Fetch announcements
    useEffect(() => {
        const fetchAnnouncements = async () => {
            if (announcements.length > 0) return;

            try {
                const data = await fetchWithRetry(`${API_BASE}/api/anilist/hero-trailers`);
                const sorted = data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

                const normalizedAnnouncements = sorted
                    .map(normalizeHeroAnime)
                    .filter(anime => {
                        const notTBA = anime.status?.toLowerCase() !== "not_yet_released" &&
                            anime.status?.toLowerCase() !== "not_yet_aired";
                        return notTBA;
                    });

                setAnnouncements(normalizedAnnouncements.slice(0, 10));
                localStorage.setItem('announcements', JSON.stringify(normalizedAnnouncements));
            } catch (err) {
                console.error("Error fetching announcements after retries:", err);
                const cached = localStorage.getItem('announcements');
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (Array.isArray(parsed) && parsed.length) {
                            setAnnouncements(parsed.slice(0, 10));
                        }
                    } catch (parseError) {
                        console.error("Error parsing cached announcements:", parseError);
                    }
                }
            }
        };

        fetchAnnouncements();
    }, []);

    // Handle scroll effect for fade
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset;
            const heroHeight = heroRef.current?.offsetHeight || 600;
            const fadeStart = heroHeight * 0.3;
            const fadeEnd = heroHeight * 0.8;
            let newOpacity = 1;
            if (scrollTop > fadeStart) {
                newOpacity = Math.max(0, 1 - (scrollTop - fadeStart) / (fadeEnd - fadeStart));
            }
            setOpacity(newOpacity);
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
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

        if (currentAnimeHasTrailer && videoId) {
            setTimeout(() => {
                initializePlayer(videoId);
            }, 100);
        } else {
            setPlayerError(true);
            cleanupPlayer();
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
        if (hasUserInteracted && playerRef.current && isPlayerReady) {
            try {
                playerRef.current.mute();
                playerRef.current.playVideo();
            } catch (error) {
                console.error('Error starting video after interaction:', error);
            }
        }
    }, [hasUserInteracted, isPlayerReady]);

    // If no announcements, don't render
    const currentAnimeData = announcements[currentAnime];
    if (!currentAnimeData) return null;


    const currentAnimeHasTrailer = hasTrailer(currentAnimeData);

    // Helper functions
    const formatGenres = (genres) => {
        if (!genres || genres.length === 0) return "Unknown";
        return genres.slice(0, 3).map(g => g.name || g).join(" • ");
    };

    const truncateDescription = (description, maxLength = 150) => {
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
        return cleanText.length > maxLength ? cleanText.substring(0, maxLength) + "..." : cleanText;
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'releasing': return '#4CAF50';
            case 'not_yet_released': return '#FF9800';
            case 'finished': return '#2196F3';
            default: return '#757575';
        }
    };

    return (
        <>
            {/* Trailer Section */}
            <section
                ref={heroRef}
                className="trailer-hero-section"
                style={{ opacity: opacity }}
            >
                {/* YouTube Player Container */}
                <div
                    ref={youtubeContainerRef}
                    className={`youtube-container ${currentAnimeHasTrailer && !playerError ? 'active' : 'hidden'}`}
                />

                {/* Fallback Image */}
                {(playerError || !currentAnimeHasTrailer) && (
                    <div
                        className="fallback-image"
                        style={{
                            backgroundImage: `url(${currentAnimeData.bannerImage || currentAnimeData.coverImage?.extraLarge || '/fallback-image.jpg'})`
                        }}
                    />
                )}

                {/* User Interaction Prompt */}
                {currentAnimeHasTrailer && !hasUserInteracted && !playerError && (
                    <div className="user-interaction-prompt" onClick={() => setHasUserInteracted(true)}>
                        Click anywhere to enable video
                    </div>
                )}

                {/* Mute/Unmute Button */}
                {currentAnimeHasTrailer && isPlayerReady && !playerError && (
                    <button onClick={toggleMute} className="mute-button">
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                )}

                {/* No Trailer Indicator */}
                {!currentAnimeHasTrailer && (
                    <div className="no-trailer-indicator">
                        🎬 No trailer available - displaying banner image
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="gradient-overlay" />

                {/* Content Overlay */}
                <motion.div
                    key={currentAnime}
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="content-overlay"
                >
                    <h1 className="anime-title">{getAnimeTitle(currentAnimeData)}</h1>

                    <div className="anime-meta">
                        <span className="status-badge" style={{ backgroundColor: getStatusColor(currentAnimeData.status) }}>
                            {currentAnimeData.status?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                        <span>{currentAnimeData.seasonYear || 'TBA'}</span>
                        {currentAnimeData.episodes && <>•<span>{currentAnimeData.episodes} Episodes</span></>}
                        {currentAnimeData.averageScore && <>•<span className="score">⭐ {(currentAnimeData.averageScore) / 10}/10</span></>}


                    </div>

                    <p className="anime-description">
                        {truncateDescription(getAnimeDescription(currentAnimeData))}
                    </p>

                    <div className="genres">
                        <strong>Genres:</strong> {formatGenres(currentAnimeData.genres)}
                    </div>

                    <button onClick={() => onOpenModal(currentAnimeData)} className="details-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                        </svg>
                        More Details
                    </button>
                </motion.div>

                {/* Navigation Arrows */}
                {announcements.length > 1 && (
                    <>
                        <div className="slider-btns">
                            <button
                                className="left-arrow"
                                onClick={() => setCurrentAnime(prev => prev === 0 ? announcements.length - 1 : prev - 1)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#ff5900ff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="m10 17l5-5m0 0l-5-5" /></svg>
                            </button>
                            <button
                                className="right-arrow"
                                onClick={() => setCurrentAnime(prev => (prev + 1) % announcements.length)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#ff5900ff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="m10 17l5-5m0 0l-5-5" /></svg>
                            </button>
                        </div>
                    </>
                )}

                {/* Slide Indicators */}
                {announcements.length > 1 && (
                    <div className="slide-indicators">
                        {announcements.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentAnime(index)}
                                className={`slide-indicator ${index === currentAnime ? 'active' : ''}`}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Spacer to push content down */}
            <div className="trailer-spacer" />
        </>
    );
};

export default memo(TrailerHero);