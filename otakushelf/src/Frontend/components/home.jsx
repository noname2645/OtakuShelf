import { React, useState, useEffect, useRef } from 'react';
import "../Stylesheets/home.css";
import axios from "axios";
import logo from "../images/logo.png"
import Lenis from '@studio-freight/lenis'
import Modal from "../components/modal.jsx";
import list from "../images/list.png"
import search from "../images/search.png"
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import FolderIcon from '@mui/icons-material/Folder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LocationOnIcon from '@mui/icons-material/LocationOn';


// API base URL
const API_BASE = import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : "https://otakushelf-uuvw.onrender.com";

// UTILITY FUNCTIONS
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

// ProfileDropdown Component
const ProfileDropdown = () => {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const { user, logout } = useAuth();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        await logout();
        setShowDropdown(false);
        window.location.href = "/";
    };

    const getInitials = (email) => {
        return email ? email.charAt(0).toUpperCase() : 'U';
    };

    // Don't render anything if user is not logged in
    if (!user) {
        return "Please log in";
    }

    return (
        <div className="profile-container" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="profile-button"
            >
                <div className="profile-glow"></div>

                {user.photo ? (
                    <div className="profile-avatar">
                        <img
                            src={user.photo}
                            alt="Profile"
                        />

                    </div>
                ) : (
                    <div className="profile-initials">
                        {getInitials(user.email)}
                    </div>
                )}

                <div className="profile-info">
                    <div className="welcome-text">
                        Welcome
                    </div>
                    <div className="username">
                        {user.name || user.email}
                    </div>
                </div>

                <svg
                    className={`dropdown-arrow ${showDropdown ? "rotated" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {showDropdown && (
                <div className="profile-dropdown">
                    {/* User Info Section */}
                    <div className="user-info-section">
                        <div className="user-name">
                            {user.name || user.email}
                        </div>
                        <div className="auth-type">
                            {user.authType === 'google' ? 'Signed in with Google' : 'Local Account'}
                        </div>
                    </div>

                    {/* Profile Button */}
                    <button
                        onClick={() => {
                            setShowDropdown(false);
                        }}
                        className="dropdown-item"
                    >
                        <svg className="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        View Profile
                    </button>

                    {/* Settings Button */}
                    <button
                        onClick={() => {
                            setShowDropdown(false);
                        }}
                        className="dropdown-item"
                    >
                        <svg className="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </button>

                    {/* Divider */}
                    <div className="dropdown-divider"></div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="dropdown-item logout-button"
                    >
                        <svg className="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
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

const getAnimeDescription = (anime) => {
    return anime.description || anime.synopsis || 'No description available.';
};

// TrailerHero Component
const TrailerHero = ({ announcements, onOpenModal }) => {
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

        // Listen for any user interaction
        ['click', 'touchstart', 'scroll', 'keydown', 'hover'].forEach(event => {
            document.addEventListener(event, handleInteraction, { once: true, passive: true });
        });

        return () => {
            ['click', 'touchstart', 'scroll', 'keydown', 'hover'].forEach(event => {
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

                                if (hasUserInteracted) {
                                    try {
                                        event.target.playVideo();
                                    } catch (error) {
                                        console.log('Error playing video:', error);
                                    }
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
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Auto-advance anime and initialize player
    useEffect(() => {
        const currentAnimeData = announcements[currentAnime];
        if (!currentAnimeData) return;

        const videoId = getVideoId(currentAnimeData);
        if (videoId && window.YT) {
            setTimeout(() => initializePlayer(videoId), 100);
        }

        // Auto-advance every 30 seconds
        if (announcements.length > 1) {
            const interval = setInterval(() => {
                setCurrentAnime(prev => (prev + 1) % announcements.length);
            }, 30000);
            return () => clearInterval(interval);
        }
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

    const currentAnimeData = announcements[currentAnime];
    if (!currentAnimeData) return null;

    const videoId = getVideoId(currentAnimeData);

    // Helper functions
    const formatGenres = (genres) => {
        if (!genres || genres.length === 0) return "Unknown";
        return genres.slice(0, 3).map(g => g.name || g).join(" • ");
    };

    const truncateDescription = (description, maxLength = 180) => {
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
            {/* Fixed Trailer Section */}
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
                <div
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
                            fontFamily: "Playwrite AU QLD",
                            fontSize: '3.4em',
                            fontWeight: '600',
                            marginBottom: '1rem',
                            lineHeight: '1.1',
                            backgroundImage: 'linear-gradient(90deg, #ff4b2b, #ff416c)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            // border: '2px solid black',
                            height: 'auto',
                            padding: '5px'
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
                                    ⭐ {currentAnimeData.averageScore}/100
                                </span>
                            </>
                        )}
                    </div>
                    <p
                        style={{
                            fontSize: '1.5em',
                            fontWeight: 600,
                            lineHeight: '1.4',
                            marginBottom: '1.5rem',
                            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                            fontFamily: '"Josefin Sans", sans-serif',
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
                </div>

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
            </section>

            {/* Spacer to push content down */}
            <div style={{
                height: '100vh',
                position: 'relative',
                zIndex: 2 // Higher than the trailer
            }} />
        </>
    );
};

const AnimeHomepage = () => {
    const [loading, setLoading] = useState(true);
    const [mostWatched, setMostWatched] = useState([]);
    const [topmovies, settopMovies] = useState([]);
    const [topAiring, setTopAiring] = useState([]);
    const lenisRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const controllerRef = useRef(null);
    const [isSearching, setIsSearching] = useState(false);
    const { user } = useAuth();
    const searchRef = useRef(null);
    const [animateCards, setAnimateCards] = useState(false);


    const [announcements, setAnnouncements] = useState(() => {
        const cached = localStorage.getItem('announcements');
        return cached ? JSON.parse(cached) : [];
    });


    const [value, setValue] = useState(0);

    useEffect(() => {
        if ((!isSearching && (topAiring.length > 0 || mostWatched.length > 0 || topmovies.length > 0)) ||
            (isSearching && searchResults.length > 0 && !searchLoading)) {
            // Trigger the staggered animation
            setAnimateCards(false);
            const timer = setTimeout(() => {
                setAnimateCards(true);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [topAiring, mostWatched, topmovies, searchResults, isSearching, searchLoading]);

    // Handle scroll events
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);


    // Initialize smooth scrolling
    useEffect(() => {
        const lenis = new Lenis({
            lerp: 0.09,
            smooth: true,
            infinite: false,
        });

        lenisRef.current = lenis;

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
            lenisRef.current = null;
        };
    }, []);


    // Fetch announcements
    useEffect(() => {
        if (announcements.length === 0) return;

        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % announcements.length);
        }, 7000);
        return () => clearInterval(interval);
    }, [announcements.length]);

    useEffect(() => {
        const fetchHeroPool = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/anime/anime-sections`);

                // Normalize each section
                const airing = res.data.topAiring.map(normalizeHeroAnime);
                const movies = res.data.topMovies.map(normalizeHeroAnime);
                const watched = res.data.mostWatched.map(normalizeHeroAnime);

                // Merge + filter only anime with trailers
                const combined = [...airing, ...movies, ...watched].filter(
                    (anime) =>
                        anime.trailer &&
                        (anime.trailer.id || anime.trailer.embed_url) // AniList or Jikan
                );

                // Optional: random shuffle
                const shuffled = combined.sort(() => Math.random() - 0.5);

                setAnnouncements(shuffled.slice(0, 10)); // pick first 10
            } catch (err) {
                console.error("Error fetching hero pool:", err);
            }
        };

        fetchHeroPool();
    }, []);


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

            // Trailer fields
            trailer: anime.trailer || null,
            description: anime.description || null,
            episodes: anime.episodes || null,
            averageScore: anime.averageScore || null,
            status: anime.status || null,
            seasonYear: anime.seasonYear || null,
            genres: anime.genres || [],
            isAdult: anime.isAdult || false,

            ...anime,
        };
    };



    // Normalize grid anime data (from Jikan)
    const normalizeGridAnime = (anime) => {
        return {
            // IDs
            id: anime.mal_id,
            animeId: null,
            animeMalId: anime.mal_id,
            idMal: anime.mal_id,
            mal_id: anime.mal_id,

            // Title
            title: anime.title || anime.title_english || anime.title_japanese,
            title_english: anime.title_english,
            title_romaji: anime.title,

            // Images - Handle different image structures
            coverImage: {
                large: anime.images?.jpg?.large_image_url || anime.images?.webp?.large_image_url,
                medium: anime.images?.jpg?.image_url || anime.images?.webp?.image_url,
                extraLarge: anime.images?.jpg?.large_image_url || anime.images?.webp?.large_image_url
            },
            images: anime.images || {
                jpg: {
                    image_url: '/placeholder-anime.jpg',
                    large_image_url: '/placeholder-anime.jpg'
                },
                webp: {
                    image_url: '/placeholder-anime.jpg',
                    large_image_url: '/placeholder-anime.jpg'
                }
            },
            image_url: anime.images?.jpg?.large_image_url || anime.images?.webp?.large_image_url,

            // Details
            status: anime.status,
            description: anime.synopsis,
            synopsis: anime.synopsis,
            episodes: anime.episodes,
            episodeCount: anime.episodes,
            averageScore: anime.score ? Math.round(anime.score * 10) : null,
            score: anime.score,
            format: anime.type,
            type: anime.type,
            genres: anime.genres?.map(g => ({ name: g.name })) || [],
            studios: anime.studios?.map(s => ({ name: s.name })) || [],
            startDate: anime.aired?.from ? {
                year: new Date(anime.aired.from).getFullYear(),
                month: new Date(anime.aired.from).getMonth() + 1,
                day: new Date(anime.aired.from).getDate()
            } : null,
            popularity: anime.popularity || anime.members,
            isAdult: anime.rating?.includes("R") || anime.rating?.includes("Rx"),
            year: anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null),

            // Keep original data
            ...anime
        };
    };


    // Fetch announcements
    useEffect(() => {
        const fetchAnnouncements = async () => {
            // If we already have cached data, use it immediately
            if (announcements.length > 0) return;

            try {
                // Use fetchWithRetry for better reliability
                const data = await fetchWithRetry(`${API_BASE}/api/anilist/latest-sequels`);
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

    // Fetch anime sections with retry and caching
    useEffect(() => {
        const fetchAnimeSections = async () => {
            try {
                // Use fetchWithRetry for better reliability
                const data = await fetchWithRetry(`${API_BASE}/api/anime/anime-sections`);

                setTopAiring(data.topAiring.map(normalizeGridAnime));
                setMostWatched(data.mostWatched.map(normalizeGridAnime));
                settopMovies(data.topMovies.map(normalizeGridAnime));

                localStorage.setItem('animeSections', JSON.stringify({
                    topAiring: data.topAiring,
                    mostWatched: data.mostWatched,
                    topMovies: data.topMovies
                }));
            } catch (error) {
                console.error("Error fetching anime sections:", error);

                // Try to use cached data as fallback
                const cachedSections = localStorage.getItem('animeSections');
                if (cachedSections) {
                    try {
                        const parsed = JSON.parse(cachedSections);
                        if (parsed?.topAiring?.length) setTopAiring(parsed.topAiring.map(normalizeGridAnime));
                        if (parsed?.mostWatched?.length) setMostWatched(parsed.mostWatched.map(normalizeGridAnime));
                        if (parsed?.topMovies?.length) settopMovies(parsed.topMovies.map(normalizeGridAnime));
                    } catch (parseError) {
                        console.error("Error parsing cached sections:", parseError);
                    }
                }
            }
        };

        fetchAnimeSections();
    }, []);

    // Check if all sections are ready
    useEffect(() => {
        const sectionsReady = topAiring.length || mostWatched.length || topmovies.length;
        if (announcements.length && sectionsReady) {
            setLoading(false);
        }
    }, [announcements.length, topAiring.length, mostWatched.length, topmovies.length]);


    // Try cached data
    useEffect(() => {
        const cachedAnns = localStorage.getItem('announcements');
        if (cachedAnns) {
            try {
                const parsed = JSON.parse(cachedAnns);
                if (Array.isArray(parsed) && parsed.length) setAnnouncements(parsed);
            } catch { }
        }


        // Try cached sections
        const cachedSections = localStorage.getItem('animeSections');
        if (cachedSections) {
            try {
                const parsed = JSON.parse(cachedSections);
                if (parsed?.topAiring?.length) setTopAiring(parsed.topAiring.map(normalizeGridAnime));
                if (parsed?.mostWatched?.length) setMostWatched(parsed.mostWatched.map(normalizeGridAnime));
                if (parsed?.topMovies?.length) settopMovies(parsed.topMovies.map(normalizeGridAnime));
                setLoading(false);
            } catch { }
        }
    }, []);

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

        const fetchSearch = async () => {
            setSearchLoading(true);

            try {
                const res = await axios.get(
                    `${API_BASE}/api/anime/search?q=${encodeURIComponent(searchQuery)}&limit=12`,
                    { signal: controllerRef.current.signal }
                );

                if (res.data && res.data.length > 0) {
                    const normalized = res.data.map(normalizeGridAnime);
                    setSearchResults(normalized);
                } else {
                    setSearchResults([]);
                }
            } catch (err) {
                if (axios.isCancel(err)) {
                    console.log("Search request cancelled:", searchQuery);
                } else {
                    console.error("Search failed:", err);
                    setSearchResults([]);
                }
            } finally {
                setSearchLoading(false);
            }
        };

        const debounce = setTimeout(fetchSearch, 400); // debounce keystrokes
        return () => clearTimeout(debounce);
    }, [searchQuery]);


    // Remove duplicate anime entries
    const removeDuplicates = (animeArray) => {
        const seen = new Set();
        return animeArray.filter((anime) => {
            if (seen.has(anime.mal_id)) return false;
            seen.add(anime.mal_id);
            return true;
        });
    };

    // Format date
    const formatDate = (startDate) => {
        if (!startDate || !startDate.year) return "TBA";
        const year = startDate.year;
        const month = startDate.month ? String(startDate.month).padStart(2, '0') : '??';
        const day = startDate.day ? String(startDate.day).padStart(2, '0') : '??';
        return `${year}-${month}-${day}`;
    };


    // Open modal for selected anime
    const openModal = (anime) => {
        console.log("Opening anime with data:", anime);
        setSelectedAnime(anime);
        setIsModalOpen(true);
    };

    // Open modal for related anime
    const handleOpenRelatedAnime = (relatedAnime) => {
        console.log("Opening related anime:", relatedAnime);
        setSelectedAnime(relatedAnime);
    };

    // Close modal
    const closeModal = () => {
        setSelectedAnime(null);
        setIsModalOpen(false);
    };

    // Close search
    const closeSearch = () => {
        setSearchQuery("");
        setSearchResults([]);
        setSearchLoading(false);
        setIsSearching(false);
    };

    // Handle key down events
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeSearch();
        }
    };

    //go to view
    const scrollToView = () => {
        if (searchRef.current) {
            const headerHeight = 100; // Add some margin from the top
            const elementTop = searchRef.current.getBoundingClientRect().top;
            const absoluteElementTop = elementTop + window.pageYOffset;
            const targetPosition = absoluteElementTop - headerHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: "smooth"
            });
        }
    };

    //useEffect to scroll when search results are ready:
    useEffect(() => {
        if (isSearching && (searchResults.length > 0 || !searchLoading)) {
            setTimeout(() => {
                scrollToView();
            }, 100);
        }
    }, [searchResults, searchLoading, isSearching]);


    useEffect(() => {
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
    }, [])

    // Render anime grid
    const renderAnimeGrid = (title, data) => (
        <div className="anime-section-container">
            <h2 className="section-title">{title}</h2>
            <div className="anime-grid">
                {data.map((anime, index) => (
                    <div
                        key={anime.mal_id}
                        className={`anime-card ${loading ? 'loading' : ''} ${animateCards ? 'animate-in' : ''}`}
                        onClick={() => openModal(anime)}
                        style={{ cursor: "pointer", "--card-index": index, zIndex: '5' }}
                    >
                        {loading ? (
                            <div className="card-skeleton">
                                <div className="skeleton-image"></div>
                                <div className="skeleton-content">
                                    <div className="skeleton-title"></div>
                                    <div className="skeleton-info"></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="home-card-image">
                                    <img
                                        src={anime.images.webp?.large_image_url || anime.images.jpg.large_image_url}
                                        alt={anime.title}
                                        loading="lazy"
                                    />
                                    <div className="card-title-bottom">
                                        <h3>{anime.title}</h3>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="homepage">
            <div className="main-content">
                <header className={`header ${isScrolled ? "scrolled" : ""}`}>
                    <div className="header-center">
                        <div className="logo">
                            <img src={logo} alt="no img" />
                        </div>
                    </div>
                    <div className={`InputContainer ${searchQuery ? "active" : ""}`}>
                        <input
                            placeholder="Search anime"
                            id="input"
                            className="input"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onClick={scrollToView}
                        />
                    </div>

                    <div className="auth-buttons">
                        {user ? (
                            <ProfileDropdown />
                        ) : (
                            <>
                                <Link to="/login">
                                    <button>
                                        <span className="button_login">Login</span>
                                    </button>
                                </Link>
                                <Link to="/register">
                                    <button>
                                        <span className="button_register">Register</span>
                                    </button>
                                </Link>
                            </>
                        )}
                    </div>

                </header>
                <div className="bottom-button-bar">
                    <BottomNavigation
                        sx={{ width: 378 }}
                        value={value}
                        onChange={(_, newValue) => setValue(newValue)}
                    >
                        <Link to="/list">
                            <BottomNavigationAction label="Recents" value={0} icon={<img className="bottom-icons" src={list} alt="Recents" />} />
                        </Link>
                        <BottomNavigationAction label="Favorites" value={1} icon={<FavoriteIcon />} />
                        <BottomNavigationAction label="Nearby" value={2} icon={<LocationOnIcon />} />
                        <BottomNavigationAction label="Folder" value={3} icon={<FolderIcon />} />
                    </BottomNavigation>
                </div>
                <TrailerHero
                    announcements={announcements}
                    onOpenModal={openModal}
                />
                <main className="anime-sections">
                    {isSearching ? (
                        <div ref={searchRef} className="anime-section-container">
                            {searchLoading ? (
                                <p className="loading-text">Searching anime...</p>
                            ) : searchResults.length > 0 ? (
                                <div className="anime-grid">
                                    {searchResults.map((anime, index) => (
                                        <div
                                            key={anime.mal_id || anime.id || index}
                                            className={`anime-card ${animateCards ? 'animate-in' : ''}`}
                                            onClick={() => openModal(anime)}
                                            style={{ "--card-index": index, zIndex: '5' }}
                                        >
                                            <img
                                                src={
                                                    anime.images?.webp?.large_image_url ||
                                                    anime.images?.jpg?.large_image_url ||
                                                    anime.images?.webp?.image_url ||
                                                    anime.images?.jpg?.image_url ||
                                                    '/placeholder-anime.jpg'
                                                }
                                                alt={anime.title || 'Anime'}
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.target.src = '/placeholder-anime.jpg';
                                                }}
                                            />
                                            <div className="card-title-bottom">
                                                <h3>{anime.title || 'Unknown Title'}</h3>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-results">
                                    <div className="no-results-icon">No anime found</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {renderAnimeGrid("Top Airing", removeDuplicates(topAiring))}
                            {renderAnimeGrid("Most Watched", removeDuplicates(mostWatched))}
                            {renderAnimeGrid("Top Movies", removeDuplicates(topmovies))}
                        </>
                    )}
                </main>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                anime={selectedAnime}
                onOpenAnime={handleOpenRelatedAnime}
            />
        </div>
    );
};
export default AnimeHomepage;