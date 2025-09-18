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
import TrailerHero from '../TrailerHero.jsx';
import { Header } from '../components/header.jsx';


// API base URL
const API_BASE = import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : "https://otakushelf-uuvw.onrender.com";


// ProfileDropdown Component



const useInView = (options = {}) => {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false); // This was correct

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            // console.log("IntersectionObserver triggered:", entry.isIntersecting, entry.target);
            if (entry.isIntersecting && !isVisible) {
                console.log("Setting visible TRUE for:", entry.target);
                setIsVisible(true);
            }
        }, { threshold: 0.1, rootMargin: '20px', ...options });


        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [ref, isVisible, options]);

    return [ref, isVisible];
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
    const [airingRef, airingVisible] = useInView({ threshold: 0.1 });
    const [watchedRef, watchedVisible] = useInView({ threshold: 0.1 });
    const [moviesRef, moviesVisible] = useInView({ threshold: 0.1 });



    const [announcements, setAnnouncements] = useState(() => {
        const cached = localStorage.getItem('announcements');
        return cached ? JSON.parse(cached) : [];
    });


    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!loading && (topAiring.length > 0 || mostWatched.length > 0 || topmovies.length > 0)) {
            // Simple trigger without complex timing
            setAnimateCards(true);
        }
    }, [loading, topAiring.length, mostWatched.length, topmovies.length]);

    // Handle scroll events
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 600);
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
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

        const animationId = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(animationId);
            lenis.destroy();
            lenisRef.current = null;
        };
    }, []);



    // Enhanced normalize grid anime data with comprehensive field mapping
    const normalizeGridAnime = (anime) => {
        console.log("Normalizing anime data:", anime); // Debug log

        const normalized = {
            id: anime.id,
            idMal: anime.idMal || anime.mal_id,
            title: anime.title?.english || anime.title?.romaji || anime.title?.native || anime.title,
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
            studios: anime.studios?.edges?.map(e => e.node.name) ||
                anime.studios?.map(s => s.name) ||
                anime.studios || [],
            startDate: anime.startDate || anime.aired?.from || null,
            endDate: anime.endDate || anime.aired?.to || null,
            isAdult: anime.isAdult || false,
            // Additional fields that might be needed by the modal
            trailer: anime.trailer || null,
            format: anime.format || null,
            duration: anime.duration || null,
            popularity: anime.popularity || null,
            year: anime.year || anime.startDate?.year || null,
            season: anime.season || null,
            type: anime.type || anime.format || null,
            source: anime.source || null,
            // Preserve original data for debugging
            _originalData: anime
        };

        console.log("Normalized anime:", normalized); // Debug log
        return normalized;
    };


    // Fetch with retry logic for home component
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


    // Enhanced fetch anime sections with better error handling and debugging
    useEffect(() => {
        const fetchAnimeSections = async () => {
            try {
                // Use fetchWithRetry for better reliability
                const data = await fetchWithRetry(`${API_BASE}/api/anime/anime-sections`);

                console.log("Raw API Response:", data); // Debug log
                console.log("Sample topAiring item:", data.topAiring?.[0]); // Debug log
                console.log("Sample mostWatched item:", data.mostWatched?.[0]); // Debug log

                const normalizedTopAiring = data.topAiring?.map(normalizeGridAnime) || [];
                const normalizedMostWatched = data.mostWatched?.map(normalizeGridAnime) || [];
                const normalizedTopMovies = data.topMovies?.map(normalizeGridAnime) || [];

                console.log("Normalized topAiring:", normalizedTopAiring); // Debug log
                console.log("Normalized mostWatched:", normalizedMostWatched); // Debug log

                setTopAiring(normalizedTopAiring);
                setMostWatched(normalizedMostWatched);
                settopMovies(normalizedTopMovies);

                // Cache the original data, not normalized
                localStorage.setItem('animeSections', JSON.stringify({
                    topAiring: data.topAiring || [],
                    mostWatched: data.mostWatched || [],
                    topMovies: data.topMovies || []
                }));
            } catch (error) {
                console.error("Error fetching anime sections:", error);

                // Try to use cached data as fallback
                const cachedSections = localStorage.getItem('animeSections');
                if (cachedSections) {
                    try {
                        const parsed = JSON.parse(cachedSections);
                        console.log("Using cached data:", parsed); // Debug log

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



    // Check if all sections are ready for trailer and home section
    useEffect(() => {
        const sectionsReady = topAiring.length || mostWatched.length || topmovies.length;
        if (sectionsReady) {
            setLoading(false);
        }
    }, [topAiring.length, mostWatched.length, topmovies.length]);


    // Try cached data for trailer section on initial load
    useEffect(() => {
        // Try cached sections immediately on load
        const cachedSections = localStorage.getItem('animeSections');
        if (cachedSections) {
            try {
                const parsed = JSON.parse(cachedSections);
                console.log("Loading cached data on mount:", parsed); // Debug log

                if (parsed?.topAiring?.length) setTopAiring(parsed.topAiring.map(normalizeGridAnime));
                if (parsed?.mostWatched?.length) setMostWatched(parsed.mostWatched.map(normalizeGridAnime));
                if (parsed?.topMovies?.length) settopMovies(parsed.topMovies.map(normalizeGridAnime));
                setLoading(false);
            } catch (error) {
                console.error("Error loading cached data:", error);
            }
        }
    }, []);


    // Enhanced search functionality with better normalization
    useEffect(() => {
        console.log("Search useEffect triggered:", { searchQuery, trim: searchQuery.trim() });

        if (!searchQuery.trim()) {
            console.log("Empty search query, clearing results");
            setIsSearching(false);
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }

        console.log("Starting search for:", searchQuery);
        setSearchLoading(true);
        setIsSearching(true);

        // Cancel previous request if exists
        if (controllerRef.current) {
            console.log("Cancelling previous search request");
            controllerRef.current.abort();
        }
        controllerRef.current = new AbortController();

        const fetchSearch = async () => {
            console.log("Fetching search results for:", searchQuery);
            setSearchLoading(true);

            try {
                const searchUrl = `${API_BASE}/api/anime/search?q=${encodeURIComponent(searchQuery)}&limit=12`;
                console.log("Search URL:", searchUrl);

                const res = await axios.get(searchUrl, {
                    signal: controllerRef.current.signal,
                    timeout: 10000 // 10 second timeout
                });

                // console.log("Search API Response Status:", res.status);
                // console.log("Search API Response Data:", res.data);
                // console.log("Search API Response Type:", typeof res.data);
                // console.log("Search API Response Length:", res.data?.length);

                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    console.log("Processing search results:", res.data.length, "items");
                    console.log("First search result:", res.data[0]);

                    const normalized = res.data.map((anime, index) => {
                        console.log(`Normalizing search result ${index}:`, anime);
                        return normalizeGridAnime(anime);
                    });

                    console.log("Normalized search results:", normalized);
                    console.log("First normalized result:", normalized[0]);
                    setSearchResults(normalized);
                } else {
                    console.log("No search results found or invalid response format");
                    setSearchResults([]);
                }
            } catch (err) {
                if (axios.isCancel(err)) {
                    console.log("Search request cancelled for:", searchQuery);
                } else {
                    console.error("Search failed with error:", err);
                    console.error("Error response:", err.response?.data);
                    console.error("Error status:", err.response?.status);
                    console.error("Error message:", err.message);
                    setSearchResults([]);
                }
            } finally {
                console.log("Search completed, setting loading to false");
                setSearchLoading(false);
            }
        };

        const debounce = setTimeout(() => {
            console.log("Debounce timeout reached, executing search");
            fetchSearch();
        }, 400);

        return () => {
            console.log("Cleaning up search effect");
            clearTimeout(debounce);
            if (controllerRef.current) {
                controllerRef.current.abort();
            }
        };
    }, [searchQuery]);

    // Remove duplicate anime entries
    const removeDuplicates = (animeArray) => {
        const seen = new Set();
        return animeArray.filter((anime) => {
            if (seen.has(anime.id)) return false;
            seen.add(anime.id);
            return true;
        });
    };



    // Enhanced modal opening with comprehensive debugging
    const openModal = (anime) => {
        // console.log("=== OPENING MODAL DEBUG INFO ===");
        // console.log("Raw anime object:", anime);
        // console.log("Title:", anime.title);
        // console.log("Description:", anime.description);
        // console.log("Synopsis:", anime.synopsis);
        // console.log("Trailer:", anime.trailer);
        // console.log("Episodes:", anime.episodes);
        // console.log("Score:", anime.averageScore);
        // console.log("Status:", anime.status);
        // console.log("Genres:", anime.genres);
        // console.log("Studios:", anime.studios);
        // console.log("All anime properties:", Object.keys(anime));
        // console.log("Original data:", anime._originalData);

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
        console.log("Closing search");
        setSearchQuery("");
        setSearchResults([]);
        setSearchLoading(false);
        setIsSearching(false);

        // Cancel any ongoing requests
        if (controllerRef.current) {
            controllerRef.current.abort();
        }
    };
    // Handle key down events
    const handleKeyDown = (e) => {
        console.log("Key pressed:", e.key);
        if (e.key === 'Escape') {
            console.log("Escape pressed, closing search");
            closeSearch();
        }
        if (e.key === 'Enter') {
            console.log("Enter pressed, focusing on results");
            e.preventDefault();
            scrollToView();
        }
    };


    //go to view
    const scrollToView = () => {
        console.log("Scrolling to search results");
        if (searchRef.current) {
            const headerHeight = 100;
            const elementTop = searchRef.current.getBoundingClientRect().top;
            const absoluteElementTop = elementTop + window.pageYOffset;
            const targetPosition = absoluteElementTop - headerHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: "smooth"
            });
        } else {
            console.log("Search ref not found");
        }
    };

    //useEffect to scroll when search results are ready:
    useEffect(() => {
        console.log("Scroll effect triggered:", {
            isSearching,
            searchResultsLength: searchResults.length,
            searchLoading
        });

        if (isSearching && (searchResults.length > 0 || !searchLoading)) {
            console.log("Scrolling to search results after delay");
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

    // Enhanced render anime grid with better error handling
    const renderAnimeGrid = (data) => (
        <div className="anime-section-container">
            <h2 className="section-title"></h2>
            <div className="anime-grid">
                {data.map((anime, index) => (
                    <div
                        key={anime.id || anime.mal_id || index}
                        className={`anime-card ${animateCards ? 'animate-in' : ''}`}
                        onClick={() => openModal(anime)}
                        style={{ cursor: "pointer", "--card-index": index, zIndex: '5' }}
                    >
                        {/* {console.log("Rendering card:", anime.title, "Animate:", animateCards)} */}

                        <div className="home-card-image">
                            <img
                                src={
                                    anime.coverImage?.large ||
                                    anime.coverImage?.extraLarge ||
                                    anime.coverImage?.medium ||
                                    anime.bannerImage ||
                                    "/placeholder-anime.jpg"
                                }
                                alt={anime.title || "Anime"}
                                loading="lazy"
                                onError={(e) => {
                                    e.currentTarget.src = "/placeholder-anime.jpg";
                                }}
                            />
                            <div className="card-title-bottom">
                                <h3>{anime.title || "Unknown Title"}</h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="homepage">
            <div className="main-content">
                <Header showSearch={true} onSearchChange={setSearchQuery} />
                <div className="bottom-button-bar">
                    <BottomNavigation
                        sx={{ width: 378 }}
                        value={value}
                        onChange={(_, newValue) => setValue(newValue)}
                    >
                        <Link to="/list">
                            <BottomNavigationAction label="Recents" value={0} icon={<img className="bottom-icons" src={list} alt="Recents" />} />
                        </Link>
                        <Link to="/advance">
                            <BottomNavigationAction label="Favorites" value={1} icon={<FavoriteIcon />} />
                        </Link>
                        <BottomNavigationAction label="Nearby" value={2} icon={<LocationOnIcon />} />
                        <BottomNavigationAction label="Folder" value={3} icon={<FolderIcon />} />
                    </BottomNavigation>
                </div>
                <TrailerHero
                    announcements={announcements}
                    onOpenModal={openModal}
                />
                <main className="anime-sections" style={{ backgroundColor: "linear-gradient(180deg, #050814 0%, #0a1124 100%" }}>
                    {isSearching ? (
                        <div ref={searchRef} className="anime-section-container">
                            {searchLoading ? (
                                <p className="loading-text">Searching anime...</p>
                            ) : searchResults.length > 0 ? (
                                <div className="anime-grid">
                                    {searchResults.map((anime, index) => (
                                        <div
                                            key={anime.id || anime.mal_id || index}
                                            className={`anime-card`}
                                            onClick={() => openModal(anime)}
                                            style={{ "--card-index": index, zIndex: '5' }}
                                        >
                                            <img
                                                src={
                                                    anime.coverImage?.extraLarge ||
                                                    anime.coverImage?.large ||
                                                    anime.coverImage?.medium ||
                                                    anime.bannerImage ||
                                                    "/placeholder-anime.jpg"
                                                }
                                                alt={anime.title || "Anime"}
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.currentTarget.src = "/placeholder-anime.jpg";
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
                            <div className="divider">
                                <span className="divider-content">TOP AIRING</span>
                            </div>
                            <section
                                ref={airingRef}
                                className={`anime-section ${airingVisible ? "show" : ""}`}
                            >
                                {airingVisible && renderAnimeGrid(removeDuplicates(topAiring))}
                            </section>

                            <div className="divider">
                                <span className="divider-content">MOST WATCHED</span>
                            </div>
                            <section
                                ref={watchedRef}
                                className={`anime-section ${watchedVisible ? "show" : ""}`}
                            >
                                {watchedVisible && renderAnimeGrid(removeDuplicates(mostWatched))}
                            </section>

                            <div className="divider">
                                <span className="divider-content">TOP MOVIES</span>
                            </div>
                            <section
                                ref={moviesRef}
                                className={`anime-section ${moviesVisible ? "show" : ""}`}
                            >
                                {moviesVisible && renderAnimeGrid(removeDuplicates(topmovies))}
                            </section>
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