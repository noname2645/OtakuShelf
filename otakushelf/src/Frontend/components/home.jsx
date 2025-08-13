import { React, useState, useEffect, useRef } from 'react';
import { Play, Star, Calendar, Users } from 'lucide-react';
import "../Stylesheets/home.css";
import axios from "axios";
import sidebar from "../images/sidebar.png"
import logo from "../images/logo.png"
import Lenis from '@studio-freight/lenis'
import Modal from "../components/modal.jsx"; // adjust path if needed


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



    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/anilist/latest-sequels");
                const sorted = res.data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                setAnnouncements(sorted.slice(0, 10));
            } catch (err) {
                console.error("Failed to fetch dynamic announcements:", err);
                // Fallback to trending if sequels fail
                try {
                    const fallbackRes = await axios.get("http://localhost:5000/api/anilist/trending");
                    setAnnouncements(fallbackRes.data.slice(0, 8));
                } catch (fallbackErr) {
                    console.error("Failed to fetch fallback announcements:", fallbackErr);
                }
            }
        };
        fetchAnnouncements();
    }, []);



    useEffect(() => {
        const fetchAnimeSections = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/anime/anime-sections");
                setTopAiring(res.data.topAiring);
                setMostWatched(res.data.mostWatched);
                settopMovies(res.data.topMovies);
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
        return genres.slice(0, 3).join(", ");
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
        setSelectedAnime(anime);
        setIsModalOpen(true);
    };

    const handleOpenRelatedAnime = (relatedAnime) => {
        // This function will be called when a related anime is selected
        console.log("Opening related anime:", relatedAnime);
        setSelectedAnime(relatedAnime);
        // Modal will automatically update with the new anime data
    };

    const closeModal = () => {
        setSelectedAnime(null);
        setIsModalOpen(false);
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



    const handleAnimeSelect = (anime) => {
        setSelectedAnime(anime);
        setIsModalOpen(true);
    };



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
                                            {anime.title?.english !== anime.title?.romaji && (
                                                <h3 className="anime-title-english">
                                                    {anime.title.english || anime.title.romaji}
                                                </h3>
                                            )}
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
                                                {anime.mainStudio && (
                                                    <div className="info-item2">
                                                        <span className="info-label">Studio</span>
                                                        <span className="info-value">{anime.mainStudio}</span>
                                                    </div>
                                                )}
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