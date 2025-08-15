import { React, useState, useEffect, useRef } from 'react';
import { Play, Star, Calendar, Users } from 'lucide-react';
import "../Stylesheets/home.css";
import axios from "axios";
import sidebar from "../images/sidebar.png"
import logo from "../images/logo.png"
import Lenis from '@studio-freight/lenis'
import Modal from "../components/modal.jsx";


const AnimeHomepage = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
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


    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

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

    useEffect(() => {
        if (announcements.length === 0) return;

        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % announcements.length);
        }, 7000);
        return () => clearInterval(interval);
    }, [announcements.length]);

    // Normalize hero slider anime data
    const normalizeHeroAnime = (anime) => {
        return {
            // IDs
            id: anime.id,
            animeId: anime.id, // AniList ID
            animeMalId: anime.idMal || anime.mal_id || null, // MAL ID
            idMal: anime.idMal || anime.mal_id,
            mal_id: anime.idMal || anime.mal_id,

            // Title
            title: anime.title,
            // title_english: anime.title?.english,
            title_romaji: anime.title?.romaji,

            // Images
            coverImage: anime.coverImage,
            bannerImage: anime.bannerImage,
            images: {
                jpg: {
                    large_image_url: anime.coverImage?.extraLarge || anime.coverImage?.large,
                    image_url: anime.coverImage?.large || anime.coverImage?.medium
                },
                webp: {
                    large_image_url: anime.coverImage?.extraLarge || anime.coverImage?.large,
                    image_url: anime.coverImage?.large || anime.coverImage?.medium
                }
            },
            image_url: anime.coverImage?.extraLarge || anime.coverImage?.large,

            // Details
            status: anime.status,
            description: anime.description,
            synopsis: anime.description,
            episodes: anime.episodes,
            episodeCount: anime.episodes,
            averageScore: anime.averageScore,
            score: anime.averageScore,
            format: anime.format,
            type: anime.format,
            genres: anime.genres,
            studios: anime.studios,
            startDate: anime.startDate,
            endDate: anime.endDate,
            season: anime.season,
            seasonYear: anime.seasonYear,
            popularity: anime.popularity,
            isAdult: anime.isAdult,
            mainStudio: anime.mainStudio,
            nextAiringEpisode: anime.nextAiringEpisode,

            // Keep original data
            ...anime
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

    const API_BASE =
        import.meta.env.MODE === "development"
            ? "http://localhost:5000"
            : "https://otakushelf-uuvw.onrender.com";


    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/anilist/latest-sequels`);
                const sorted = res.data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                const normalizedAnnouncements = sorted.slice(0, 10).map(normalizeHeroAnime);
                setAnnouncements(normalizedAnnouncements);
            } catch (err) {
                console.error("Error fetching announcements:", err);
            }
        };
        fetchAnnouncements();
    }, []);


    useEffect(() => {
        const fetchAnimeSections = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/anime/anime-sections`);
                setTopAiring(res.data.topAiring.map(normalizeGridAnime));
                setMostWatched(res.data.mostWatched.map(normalizeGridAnime));
                settopMovies(res.data.topMovies.map(normalizeGridAnime));
            } catch (error) {
                console.error("Error fetching anime sections:", error);
            }
        };
        fetchAnimeSections();
    }, []);


    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);


    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);

        const fetchSearch = async () => {
            try {
                console.log(`Searching for: ${searchQuery}`); // Debug log

                // Try your backend first
                try {
                    const backendRes = await axios.get(`${API_BASE}/api/anime/search?q=${encodeURIComponent(searchQuery)}&limit=12`);
                    console.log("Backend response:", backendRes.data); // Debug log

                    if (backendRes.data && backendRes.data.length > 0) {
                        const normalized = backendRes.data.map(normalizeGridAnime);
                        setSearchResults(normalized);
                        setSearchLoading(false);
                        return;
                    }
                } catch (backendError) {
                    console.warn("Backend search failed, trying Jikan directly:", backendError);
                }

                // Fallback to direct Jikan API call
                const jikanRes = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchQuery)}&limit=12`);
                console.log("Jikan response:", jikanRes.data); // Debug log

                if (jikanRes.data && jikanRes.data.data) {
                    const normalized = jikanRes.data.data.map(normalizeGridAnime);
                    setSearchResults(normalized);
                } else {
                    setSearchResults([]);
                }
            } catch (err) {
                console.error("All search methods failed:", err);
                setSearchResults([]);

                // Show user-friendly error
                // You could set an error state here if needed
            } finally {
                setSearchLoading(false);
            }
        };

        // Debounce the search
        const debounce = setTimeout(fetchSearch, 500); // Increased debounce time
        return () => clearTimeout(debounce);
    }, [searchQuery]);


    const removeDuplicates = (animeArray) => {
        const seen = new Set();
        return animeArray.filter((anime) => {
            if (seen.has(anime.mal_id)) return false;
            seen.add(anime.mal_id);
            return true;
        });
    };

    const formatDate = (startDate) => {
        if (!startDate || !startDate.year) return "TBA";
        const year = startDate.year;
        const month = startDate.month ? String(startDate.month).padStart(2, '0') : '??';
        const day = startDate.day ? String(startDate.day).padStart(2, '0') : '??';
        return `${year}-${month}-${day}`;
    };

    const truncateDescription = (description, maxLength = 250) => {
        if (!description) return "No description available.";
        const cleanText = description.replace(/<[^>]*>/g, '');
        return cleanText.length > maxLength
            ? cleanText.substring(0, maxLength) + "..."
            : cleanText;
    };

    const formatGenres = (genres) => {
        if (!genres || genres.length === 0) return "Unknown";
        return genres.slice(0, 3).map(g => g.name || g).join(", ");
    };

    const formatScore = (score) => {
        return score ? `${score}/100` : "N/A";
    };

    const formatPopularity = (popularity) => {
        if (!popularity) return "N/A";
        if (popularity >= 1000000) {
            return `${(popularity / 1000000).toFixed(1)}M`;
        } else if (popularity >= 1000) {
            return `${(popularity / 1000).toFixed(1)}K`;
        }
        return popularity.toString();
    };

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

    const openModal = (anime) => {
        console.log("Opening anime with data:", anime);
        setSelectedAnime(anime); // anime is already normalized
        setIsModalOpen(true);
    };

    const handleOpenRelatedAnime = (relatedAnime) => {
        console.log("Opening related anime:", relatedAnime);
        setSelectedAnime(relatedAnime); // relatedAnime is already normalized from RelatedSection
    };

    const closeModal = () => {
        setSelectedAnime(null);
        setIsModalOpen(false);
    };

    const closeSearch = () => {
        setSearchQuery("");
        setSearchResults([]);
        setSearchLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeSearch();
        }
    };

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
            <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-content">
                    <div className="sidebar-header"></div>
                    <nav className="sidebar-nav">
                        <a href="#" className="nav-item"><Play size={20} /> Home</a>
                        <a href="#" className="nav-item"><Star size={20} /> Top Rated</a>
                        <a href="#" className="nav-item"><Calendar size={20} /> Seasonal</a>
                        <a href="#" className="nav-item"><Users size={20} /> Popular</a>
                    </nav>
                </div>
            </div>

            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

            <div className="main-content">
                <header className={`header ${isScrolled ? "scrolled" : ""}`}>
                    <img id="sidebar" src={sidebar} onClick={() => setSidebarOpen(true)} alt="" />
                    <div className="header-center">
                        <div className="logo">
                            <img src={logo} alt="no img" />
                        </div>
                    </div>
                    <div className={`InputContainer ${searchQuery ? "active" : ""}`}>
                        <input
                            placeholder="Search anime..."
                            id="input"
                            className="input"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    {searchQuery && (
                        <div className="search-overlay" onClick={closeSearch}>
                            <div className="search-results-header">
                                <h2 className="search-results-title">
                                    Search Results for "{searchQuery}"
                                </h2>
                                <button
                                    className="close-search-button"
                                    onClick={closeSearch}
                                    aria-label="Close search"
                                >
                                    ✕
                                </button>
                            </div>

                            {searchLoading ? (
                                <p className="loading-text">Searching anime...</p>
                            ) : (
                                <div className="anime-cards-container" onClick={(e) => e.stopPropagation()}>
                                    {searchResults.length > 0 ? (
                                        searchResults.map((anime, index) => (
                                            <div
                                                key={anime.mal_id || anime.id || index}
                                                className="anime-card"
                                                onClick={() => {
                                                    console.log("Opening anime:", anime); // Debug log
                                                    openModal(anime);
                                                    closeSearch();
                                                }}
                                                style={{
                                                    animationDelay: `${index * 0.05}s`
                                                }}
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
                                        ))
                                    ) : (
                                        <div className="no-results">
                                            <div className="no-results-icon">🔍</div>
                                            <h3>No anime found</h3>
                                            <p>Try searching with a different title or check your spelling.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}


                    <div className="auth-buttons">
                        <button>
                            <span className="button_login"> Login </span>
                        </button>
                        <button>
                            <span className="button_register"> Register </span>
                        </button>
                    </div>
                </header>

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
                                                src={
                                                    anime.bannerImage ||
                                                    anime.coverImage?.extraLarge ||
                                                    anime.coverImage?.large
                                                }
                                                alt={anime.title?.romaji || anime.title?.english}
                                                loading="lazy"
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
                    {renderAnimeGrid("Top Airing", removeDuplicates(topAiring))}
                    {renderAnimeGrid("Most Watched", removeDuplicates(mostWatched))}
                    {renderAnimeGrid("Top Movies", removeDuplicates(topmovies))}
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