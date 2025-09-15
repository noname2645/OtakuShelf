import React, { useState, useEffect, useRef, memo } from 'react';
import axios from 'axios';
import { motion } from "framer-motion";


// API base URL
const API_BASE = import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : "https://otakushelf-uuvw.onrender.com";


// TrailerHero Component
const TrailerHero = ({ onOpenModal }) => {
    const [currentAnime, setCurrentAnime] = useState(0);
    const [opacity, setOpacity] = useState(1);
    const heroRef = useRef(null);
    const [scrollY, setScrollY] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const playerRef = useRef(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [playerError, setPlayerError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [announcements, setAnnouncements] = useState([]);

    const getAnimeTitle = (anime) => {
        if (anime.title?.english) return anime.title.english;
        if (anime.title?.romaji) return anime.title.romaji;
        if (anime.title?.native) return anime.title.native;
        if (typeof anime.title === 'string') return anime.title;
        if (anime.title_english) return anime.title_english;
        if (anime.title_romaji) return anime.title_romaji;
        return anime.title || 'Unknown Title';
    };

    // Fetch with retry logic for trailer hero
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

    useEffect(() => {
        if (playerError && retryCount < 2) {
            const timer = setTimeout(() => {
                setRetryCount(prev => prev + 1);
                setPlayerError(false);

                // Reinitialize player after a delay
                const currentAnimeData = announcements[currentAnime];
                const videoId = getVideoId(currentAnimeData);

                if (videoId && window.YT) {
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

    // YouTube Player API integration
    useEffect(() => {
        let isMounted = true;

        const initializeYouTube = () => {
            if (!window.YT) {
                // Load YouTube API if not already loaded
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

                // Set up callback for when API is ready
                window.onYouTubeIframeAPIReady = () => {
                    if (isMounted && announcements.length > 0) {
                        createPlayer();
                    }
                };
            } else {
                // API already loaded, create player directly
                createPlayer();
            }
        };

        const createPlayer = () => {
            const currentAnimeData = announcements[currentAnime];
            const videoId = getVideoId(currentAnimeData);

            if (!videoId || !window.YT) {
                setPlayerError(true);
                return;
            }

            // Clean up existing player
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                    console.log('Error destroying player:', e);
                }
            }

            // Create new player
            try {
                playerRef.current = new window.YT.Player('youtube-player', {
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
                        origin: window.location.origin
                    },
                    events: {
                        onReady: (event) => {
                            if (isMounted) {
                                setIsPlayerReady(true);
                                setPlayerError(false);

                                try {
                                    // Force 1080p playback
                                    event.target.setPlaybackQuality('hd1080');

                                    if (hasUserInteracted) {
                                        event.target.playVideo();
                                    }
                                } catch (error) {
                                    console.log('Error forcing 1080p or playing video:', error);
                                }
                            }
                        },
                        onError: () => {
                            if (isMounted) {
                                setPlayerError(true);
                            }
                        }
                    }
                });
            } catch (error) {
                console.log('Error creating YouTube player:', error);
                setPlayerError(true);
            }
        };

        if (announcements.length > 0) {
            initializeYouTube();
        }

        return () => {
            isMounted = false;

            // Clean up YouTube player
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                    console.log('Error destroying player in cleanup:', e);
                }
                playerRef.current = null;
            }

            // Clean up global callback
            window.onYouTubeIframeAPIReady = null;
        };
    }, [announcements, currentAnime, hasUserInteracted]);


    const toggleMute = (e) => {
        e.stopPropagation();
        if (playerRef.current && isPlayerReady) {
            try {
                if (isMuted) {
                    playerRef.current.unMute();
                    playerRef.current.setVolume(50); // Set to 50% volume when unmuting
                } else {
                    playerRef.current.mute();
                }
                setIsMuted(!isMuted);
            } catch (error) {
                console.error('Error toggling mute:', error);
            }
        }
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


    // Normalize hero anime data for trailer section (from AniList)
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


    // Fetch announcements for trailer hero section with retry and caching
    useEffect(() => {
        const fetchAnnouncements = async () => {
            // If we already have cached data, use it immediately
            if (announcements.length > 0) return;

            try {
                // Use fetchWithRetry for better reliability
                const data = await fetchWithRetry(`${API_BASE}/api/anilist/hero-trailers`);
                const sorted = data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

                const normalizedAnnouncements = sorted
                    .map(normalizeHeroAnime)
                    .filter(anime => {
                        const hasTrailer = anime.trailer && (anime.trailer.id || anime.trailer.embed_url);
                        const notTBA = anime.status?.toLowerCase() !== "not_yet_released" &&
                            anime.status?.toLowerCase() !== "not_yet_aired";
                        return hasTrailer && notTBA;
                    });

                setAnnouncements(normalizedAnnouncements.slice(0, 10));
                localStorage.setItem('announcements', JSON.stringify(normalizedAnnouncements));
            } catch (err) {
                console.error("Error fetching announcements after retries:", err);

                // If API fails, try to use any cached data we might have
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



    // Initialize YouTube player
    const initializePlayer = (videoId) => {
        if (!window.YT || !videoId) {
            setPlayerError(true);
            return;
        }

        try {
            // Clean up existing player
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                playerRef.current.destroy();
            }

            playerRef.current = new window.YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    autoplay: hasUserInteracted ? 1 : 0,
                    mute: 1,
                    loop: 1,
                    playlist: videoId,
                    controls: 0,
                    showinfo: 0,
                    modestbranding: 1,
                    rel: 0,
                    iv_load_policy: 3,
                    fs: 0,
                    disablekb: 1,
                    playsinline: 1,
                    start: 0,
                    end: 0
                },
                events: {
                    onReady: (event) => {
                        console.log('YouTube player ready');
                        setIsPlayerReady(true);
                        setIsMuted(true);
                        setPlayerError(false);

                        // Try to play if user has interacted
                        if (hasUserInteracted) {
                            try {
                                event.target.mute();
                                event.target.playVideo();
                            } catch (error) {
                                console.error('Error starting video:', error);
                                setPlayerError(true);
                            }
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
            console.error('Error initializing YouTube player:', error);
            setPlayerError(true);
        }
    };


    // Handle scroll effect for fade and parallax
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset;
            setScrollY(scrollTop);

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


    // Auto-advance anime and initialize player
    useEffect(() => {
        let intervalId;

        const currentAnimeData = announcements[currentAnime];
        if (!currentAnimeData) return;

        const videoId = getVideoId(currentAnimeData);
        if (videoId && window.YT) {
            setTimeout(() => initializePlayer(videoId), 100);
        }

        // Auto-advance every 30 seconds
        if (announcements.length > 1) {
            intervalId = setInterval(() => {
                setCurrentAnime(prev => (prev + 1) % announcements.length);
            }, 30000);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [currentAnime, announcements, hasUserInteracted]);


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
    const videoId = getVideoId(currentAnimeData);

    // Helper functions
    const formatGenres = (genres) => {
        if (!genres || genres.length === 0) return "Unknown";
        return genres.slice(0, 3).map(g => g.name || g).join(" • ");
    };

    const truncateDescription = (description, maxLength = 100) => {
        if (!description) return "No description available.";
        // Remove HTML tags and decode HTML entities
        const cleanText = description
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .trim();

        return cleanText.length > maxLength
            ? cleanText.substring(0, maxLength) + "..."
            : cleanText;
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'releasing':
            case 'currently_airing':
                return '#4CAF50';
            case 'not_yet_released':
            case 'not_yet_aired':
                return '#FF9800';
            case 'finished':
            case 'finished_airing':
                return '#2196F3';
            default:
                return '#757575';
        }
    };

    return (
        <>
            {/* Trailer Section */}
            <section
                ref={heroRef}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 3,
                    opacity: opacity,
                }}
            >
                {/* Video Background */}
                <div
                    id="youtube-player"
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '100vw',        // fill full screen width
                        height: 'auto',        // auto height keeps 16:9 intact
                        aspectRatio: '16/9',
                        transform: 'translate(-50%, -50%)', // keep it centered
                        zIndex: -1,
                    }}
                />


                {/* Fallback Image */}
                {playerError && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundImage: `url(${currentAnimeData.bannerImage || currentAnimeData.coverImage?.extraLarge || '/fallback-image.jpg'})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            zIndex: 9,
                        }}
                    />
                )}
                {/* User Interaction Prompt */}
                {!hasUserInteracted && videoId && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '50%',
                            right: '23%',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            padding: '10px 15px',
                            borderRadius: '5px',
                            fontSize: '0.9rem',
                            zIndex: 3,
                            cursor: 'pointer',
                        }}
                        onClick={() => setHasUserInteracted(true)}
                    >
                        Click anywhere to enable video
                    </div>
                )}

                {/* Mute/Unmute Button */}
                {videoId && (
                    <button
                        onClick={toggleMute}
                        style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: '20px',
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '50px',
                            height: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 9,
                            fontSize: '20px',
                            transition: 'all 0.3s ease',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                            e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                            e.target.style.transform = 'scale(1)';
                        }}
                    >
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                )}

                {/* Gradient Overlay */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.6) 20%, rgba(0,0,0,0) 80%)',
                        zIndex: 1,
                    }}
                />

                {/* Content Overlay */}
                <motion.div
                    key={currentAnime}  
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{
                        position: 'absolute',
                        bottom: '15%',
                        left: '5%',
                        right: '5%',
                        color: 'white',
                        zIndex: 2,
                        maxWidth: '600px'
                    }}
                >
                    <h1
                        style={{
                            fontFamily: "Misrow",
                            fontSize: '3rem',
                            fontWeight: 900,
                            marginBottom: '1rem',
                            lineHeight: '1.1',
                            backgroundImage: 'linear-gradient(90deg, #fd2600ff, #ff003cff)',
                            letterSpacing: '1.5px',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            // border: '2px solid black',
                            height: 'auto',
                            padding: '5px',
                            width: '20em'
                        }}
                    >
                        {getAnimeTitle(currentAnimeData)}
                    </h1>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.5rem',
                            marginBottom: '1.5rem',
                            fontSize: '1.1rem',
                            fontWeight: '500',
                            textShadow: '0 2px 10px rgba(0,0,0,0.8)'
                        }}
                    >
                        <span
                            style={{
                                backgroundColor: getStatusColor(currentAnimeData.status),
                                padding: '0.3rem 0.8rem',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                textTransform: 'uppercase'
                            }}
                        >
                            {currentAnimeData.status?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                        <span>{currentAnimeData.seasonYear || 'TBA'}</span>
                        {currentAnimeData.episodes && (
                            <>
                                <span>•</span>
                                <span>{currentAnimeData.episodes} Episodes</span>
                            </>
                        )}
                        {currentAnimeData.averageScore && (
                            <>
                                <span>•</span>
                                <span style={{ color: '#FFD700' }}>
                                    ⭐ {(currentAnimeData.averageScore) / 10}/10
                                </span>
                            </>
                        )}
                    </div>
                    <p
                        style={{
                            fontFamily: "Coolvetica",
                            fontOpticalSizing: 'auto',
                            fontSize: '1.9em',
                            lineHeight: '1',
                            marginBottom: '1.5rem',
                            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                            letterSpacing: '0.5px',
                        }}
                    >
                        {truncateDescription(getAnimeDescription(currentAnimeData))}
                    </p>


                    <div
                        style={{
                            marginBottom: '2rem',
                            fontSize: '1rem',
                            color: '#ddd',
                            textShadow: '0 2px 8px rgba(0,0,0,0.8)'
                        }}
                    >
                        <strong>Genres:</strong> {formatGenres(currentAnimeData.genres)}
                    </div>

                    <button
                        onClick={() => onOpenModal(currentAnimeData)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            padding: '1rem 2.5rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            transition: 'all 0.3s ease',
                            textTransform: 'uppercase'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                        </svg>
                        More Details
                    </button>
                </motion.div>

                {/* Slide Indicators */}
                {announcements.length > 1 && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '5%',
                            right: '5%',
                            display: 'flex',
                            gap: '0.5rem',
                            zIndex: 2
                        }}
                    >
                        {announcements.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentAnime(index)}
                                style={{
                                    width: index === currentAnime ? '40px' : '12px',
                                    height: '4px',
                                    backgroundColor: index === currentAnime ? 'white' : 'rgba(255,255,255,0.4)',
                                    border: 'none',
                                    borderRadius: '2px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                )}
            </section >

            {/* Spacer to push content down */}
            < div style={{
                height: '100vh',
                position: 'relative',
                zIndex: 2 // Higher than the trailer
            }
            } />
        </>
    );
};

export default memo(TrailerHero);