import { React, useState, useEffect, useRef } from 'react';
import { Play, Star, Calendar, Users } from 'lucide-react';
import "../Stylesheets/home.css";
import axios from "axios";
import logo from "../images/logo.png"
import Lenis from '@studio-freight/lenis'
import Modal from "../components/modal.jsx";
import list from "../images/list.png"
import search from "../images/search.png"
import { Link } from 'react-router-dom';
 import { useLocation } from "react-router-dom";


const AnimeHomepage = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(true);
    const [mostWatched, setMostWatched] = useState([]);
    const [topmovies, settopMovies] = useState([]);
    const [topAiring, setTopAiring] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const lenisRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const controllerRef = useRef(null);
    const [isSearching, setIsSearching] = useState(false);
    const [user, setUser] = useState(null);
   

    const Home = () => {
        const location = useLocation();

        useEffect(() => {
            const params = new URLSearchParams(location.search);
            const user = params.get("user");
            if (user) {
                const parsedUser = JSON.parse(decodeURIComponent(user));
                localStorage.setItem("user", JSON.stringify(parsedUser));
                // optionally clean up the URL:
                window.history.replaceState({}, "", "/home");
            }
        }, [location]);

        return <div>Welcome Home!</div>;
    };

    // Handle scroll events
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
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

    // Normalize hero anime data
    const normalizeHeroAnime = (anime) => {
        return {
            // IDs
            id: anime.id,
            animeId: anime.id,
            animeMalId: anime.idMal || null,

            // Titles
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


            images: {
                jpg: {
                    large_image_url: anime.coverImage?.extraLarge || anime.coverImage?.large,
                    image_url: anime.coverImage?.large || anime.coverImage?.medium,
                },
                webp: {
                    large_image_url: anime.coverImage?.extraLarge || anime.coverImage?.large,
                    image_url: anime.coverImage?.large || anime.coverImage?.medium,
                },
            },
            image_url: anime.coverImage?.extraLarge || anime.coverImage?.large,

            // Details
            status: anime.status || null,
            description: anime.description || null,
            episodes: anime.episodes || null,
            averageScore: anime.averageScore || null,
            format: anime.format || null,
            genres: anime.genres || [],
            studios: anime.studios?.nodes?.map(s => s.name) || [],
            startDate: anime.startDate || null,
            endDate: anime.endDate || null,
            season: anime.season || null,
            seasonYear: anime.seasonYear || null,
            popularity: anime.popularity || null,
            isAdult: anime.isAdult || false,
            nextAiringEpisode: anime.nextAiringEpisode || null,

            ...anime,
        };
    };



    // Normalize grid anime data (from Jikan)
    const normalizeGridAnime = (anime) => {
        return {
            // IDs
            id: anime.mal_id,
            animeId: null, // We don't have AniList ID from Jikan
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

    // API base URL
    const API_BASE =
        import.meta.env.MODE === "development"
            ? "http://localhost:5000"
            : "https://otakushelf-uuvw.onrender.com";


    // Fetch announcements
    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/anilist/latest-sequels`);
                const sorted = res.data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                const normalizedAnnouncements = sorted.slice(0, 10).map(normalizeHeroAnime);
                setAnnouncements(normalizedAnnouncements);
                localStorage.setItem('announcements', JSON.stringify(normalizedAnnouncements));

            } catch (err) {
                console.error("Error fetching announcements:", err);
            }
        };
        fetchAnnouncements();
    }, []);


    // Fetch anime sections
    useEffect(() => {
        const fetchAnimeSections = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/anime/anime-sections`);
                setTopAiring(res.data.topAiring.map(normalizeGridAnime));
                setMostWatched(res.data.mostWatched.map(normalizeGridAnime));
                settopMovies(res.data.topMovies.map(normalizeGridAnime));
                localStorage.setItem('animeSections', JSON.stringify({
                    topAiring: res.data.topAiring,
                    mostWatched: res.data.mostWatched,
                    topMovies: res.data.topMovies
                }));

            } catch (error) {
                console.error("Error fetching anime sections:", error);
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
        // Try cached announcements
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

    // Truncate description
    const truncateDescription = (description, maxLength = 250) => {
        if (!description) return "No description available.";
        const cleanText = description.replace(/<[^>]*>/g, '');
        return cleanText.length > maxLength
            ? cleanText.substring(0, maxLength) + "..."
            : cleanText;
    };

    // Format genres
    const formatGenres = (genres) => {
        if (!genres || genres.length === 0) return "Unknown";
        return genres.slice(0, 3).map(g => g.name || g).join(", ");
    };

    // Format score
    const formatScore = (score) => {
        return score ? `${score}/100` : "N/A";
    };

    // Format popularity
    const formatPopularity = (popularity) => {
        if (!popularity) return "N/A";
        if (popularity >= 1000000) {
            return `${(popularity / 1000000).toFixed(1)}M`;
        } else if (popularity >= 1000) {
            return `${(popularity / 1000).toFixed(1)}K`;
        }
        return popularity.toString();
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'releasing':
            case 'currently_airing':
                return 'status-releasing';
            case 'not_yet_released':
            case 'not_yet_aired':
                return 'status-not_yet_released';
            case 'finished':
            case 'finished_airing':
                return 'status-finished';
            default:
                return '';
        }
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

    // Render anime grid
    const renderAnimeGrid = (title, data) => (
        <div className="anime-section-container">
            <h2 className="section-title">{title}</h2>
            <div className="anime-grid">
                {data.map((anime) => (
                    <div key={anime.mal_id} className={`anime-card ${loading ? 'loading' : ''}`}
                        onClick={() => openModal(anime)}
                        style={{ cursor: "pointer" }}>
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
                                <div className="card-image">
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
                        />
                    </div>


                    <div className="auth-buttons">
                        {user ? (
                            <div className="profile" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <img
                                    className="profile-pic"
                                    src={user.photo || "/default-avatar.png"}
                                    alt={user.name || "User"}
                                    style={{ width: "35px", height: "35px", borderRadius: "50%" }}
                                />
                                <span className="profile-name">{user.name || user.email}</span>
                            </div>
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

                <div className="bottom-button-container">
                    {/* Home Button */}
                    <button className="button">
                        <div className="button-content">
                            <Link to="/list">
                                <img className="button-icon" src={list} alt="Home" />
                            </Link>
                            <span className="button-text">List</span>

                        </div>
                    </button>

                    {/* Search Button */}
                    <button className="button">
                        <div className="button-content">
                            <img className="button-icon" src={search} alt="Search" />
                            <span className="button-text">Advanced search</span>
                        </div>
                    </button>

                    {/* Profile Button */}
                    <button className="button">
                        <div className="button-content">
                            <img className="button-icon" src={list} alt="Profile" />
                            <span className="button-text">Profile</span>
                        </div>
                    </button>

                    {/* Cart Button */}
                    <button className="button">
                        <div className="button-content">
                            <img className="button-icon" src={list} alt="Cart" />
                            <span className="button-text">Cart</span>
                        </div>
                    </button>
                </div>

                <section className="hero-slider">
                    <div className="slider-container">
                        {announcements.map((anime, index) => {
                            const isVisible =
                                index === currentSlide ||
                                index === (currentSlide + 1) % announcements.length ||
                                index === (currentSlide - 1 + announcements.length) % announcements.length;
                            if (!isVisible) return null;

                            return (
                                <div
                                    key={anime.id}
                                    className={`slide ${index === currentSlide ? "active" : ""}`}
                                    onClick={() => openModal(anime)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <div className="slide-content-wrapper">
                                        <div className="slide-image-left">
                                            <img
                                                src={anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium}
                                                alt={anime.title?.romaji || anime.title?.english}
                                                loading={index === currentSlide ? "eager" : "lazy"}
                                                fetchpriority={index === currentSlide ? "high" : "auto"}
                                                decoding="async"
                                            />


                                        </div>
                                        <div className="slide-info-right">
                                            <h2 className="anime-title">
                                                {anime.title?.romaji || anime.title?.english}
                                            </h2>

                                            <div className="anime-info2">
                                                <div className="info-item2">
                                                    <span className="info-label">Status</span>
                                                    <span
                                                        className={`info-value ${getStatusColor(anime.status)}`}
                                                    >
                                                        {anime.status?.replace(/_/g, " ").toUpperCase() || "Unknown"}
                                                    </span>
                                                </div>
                                                <div className="info-item2">
                                                    <span className="info-label">Release Date</span>
                                                    <span className="info-value">
                                                        {formatDate(anime.startDate)}
                                                    </span>
                                                </div>
                                                <div className="info-item2">
                                                    <span className="info-label">Episodes</span>
                                                    <span className="info-value">
                                                        {anime.episodes || "TBA"}
                                                    </span>
                                                </div>
                                                <div className="info-item2">
                                                    <span className="info-label">Score</span>
                                                    <span className="info-value">
                                                        {formatScore(anime.averageScore)}
                                                    </span>
                                                </div>
                                                <div className="info-item2">
                                                    <span className="info-label">Genres</span>
                                                    <span className="info-value">
                                                        {formatGenres(anime.genres)}
                                                    </span>
                                                </div>
                                                <div className="info-item2">
                                                    <span className="info-label">Popularity</span>
                                                    <span className="info-value">
                                                        {formatPopularity(anime.popularity)}
                                                    </span>
                                                </div>
                                                {anime.nextAiringEpisode && (
                                                    <div className="info-item2">
                                                        <span className="info-label">Next Episode</span>
                                                        <span className="info-value">
                                                            Episode {anime.nextAiringEpisode.episode}
                                                        </span>
                                                    </div>
                                                )}

                                            </div>
                                            <p className="anime-description">
                                                {truncateDescription(anime.description)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {announcements.length > 1 && (
                        <div className="slider-navigation">
                            <div className="slider-dots">
                                {announcements.map((_, index) => (
                                    <button
                                        key={index}
                                        className={`dot ${index === currentSlide ? "active" : ""}`}
                                        onClick={() => setCurrentSlide(index)}
                                        aria-label={`Go to slide ${index + 1}`}
                                    ></button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
                <main className="anime-sections">
                    {isSearching ? (
                        <div className="anime-section-container">
                            <h2 className="section-title">Search Results for "{searchQuery}"</h2>
                            {searchLoading ? (
                                <p className="loading-text">Searching anime...</p>
                            ) : searchResults.length > 0 ? (
                                <div className="anime-grid">
                                    {searchResults.map((anime, index) => (
                                        <div
                                            key={anime.mal_id || anime.id || index}
                                            className="anime-card"
                                            onClick={() => openModal(anime)}
                                            style={{ "--card-index": index }}
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
                                    <div className="no-results-icon">🔍</div>
                                    <h3>No anime found</h3>
                                    <p>Try searching with a different title or check your spelling.</p>
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