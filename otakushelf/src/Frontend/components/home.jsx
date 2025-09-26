import { React, useState, useEffect, useRef } from 'react';
import "../Stylesheets/home.css";
import axios from "axios";
import logo from "../images/logo.png"
import Lenis from '@studio-freight/lenis'
import Modal from "../components/modal.jsx";
import search from "../images/search.png"
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import TrailerHero from './TrailerHero.jsx';
import { Header } from '../components/header.jsx';


// API base URL
const API_BASE = import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : "https://otakushelf-uuvw.onrender.com";



const useInView = (options = {}) => {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false); // This was correct

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            // console.log("IntersectionObserver triggered:", entry.isIntersecting, entry.target);
            if (entry.isIntersecting && !isVisible) {
                // console.log("Setting visible TRUE for:", entry.target);
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
    const searchRef = useRef(null);
    const [animateCards, setAnimateCards] = useState(false);
    const [airingRef, airingVisible] = useInView({ threshold: 0.1 });
    const [watchedRef, watchedVisible] = useInView({ threshold: 0.1 });
    const [moviesRef, moviesVisible] = useInView({ threshold: 0.1 });

    const [announcements, setAnnouncements] = useState(() => {
        const cached = localStorage.getItem('announcements');
        return cached ? JSON.parse(cached) : [];
    });

    const getActivePage = () => {
        const path = location.pathname;
        if (path === '/home' || path === '/') return 'home';
        if (path === '/list') return 'list';
        if (path === '/advance') return 'search';
        if (path === '/ai') return 'AI';
        return '';
    };


    // Rendering homepage cards
    useEffect(() => {
        if (!loading && (topAiring.length > 0 || mostWatched.length > 0 || topmovies.length > 0)) {
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
        // console.log("Normalizing anime data:", anime);

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

        // console.log("Normalized anime:", normalized); 
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


    // Enhanced fetch anime sections 
    useEffect(() => {
        const fetchAnimeSections = async () => {
            try {
                // Use fetchWithRetry for better reliability
                const data = await fetchWithRetry(`${API_BASE}/api/anime/anime-sections`);

                // console.log("Raw API Response:", data); 
                // console.log("Sample topAiring item:", data.topAiring?.[0]); 
                // console.log("Sample mostWatched item:", data.mostWatched?.[0]); 

                const normalizedTopAiring = data.topAiring?.map(normalizeGridAnime) || [];
                const normalizedMostWatched = data.mostWatched?.map(normalizeGridAnime) || [];
                const normalizedTopMovies = data.topMovies?.map(normalizeGridAnime) || [];

                // console.log("Normalized topAiring:", normalizedTopAiring); 
                // console.log("Normalized mostWatched:", normalizedMostWatched); 

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
                        // console.log("Using cached data:", parsed); 

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
                // console.log("Loading cached data on mount:", parsed);

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
        // console.log("Search useEffect triggered:", { searchQuery, trim: searchQuery.trim() });

        if (!searchQuery.trim()) {
            // console.log("Empty search query, clearing results");
            setIsSearching(false);
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }

        // console.log("Starting search for:", searchQuery);
        setSearchLoading(true);
        setIsSearching(true);

        // Cancel previous request if exists
        if (controllerRef.current) {
            // console.log("Cancelling previous search request");
            controllerRef.current.abort();
        }
        controllerRef.current = new AbortController();

        const fetchSearch = async () => {
            // console.log("Fetching search results for:", searchQuery);
            setSearchLoading(true);

            try {
                const searchUrl = `${API_BASE}/api/anime/search?q=${encodeURIComponent(searchQuery)}&limit=12`;
                // console.log("Search URL:", searchUrl);

                const res = await axios.get(searchUrl, {
                    signal: controllerRef.current.signal,
                    timeout: 10000 // 10 second timeout
                });

                // console.log("Search API Response Status:", res.status);
                // console.log("Search API Response Data:", res.data);
                // console.log("Search API Response Type:", typeof res.data);
                // console.log("Search API Response Length:", res.data?.length);

                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    // console.log("Processing search results:", res.data.length, "items");
                    // console.log("First search result:", res.data[0]);

                    const normalized = res.data.map((anime, index) => {
                        // console.log(`Normalizing search result ${index}:`, anime);
                        return normalizeGridAnime(anime);
                    });

                    // console.log("Normalized search results:", normalized);
                    // console.log("First normalized result:", normalized[0]);
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
                    <Link
                        to="/home"
                        title="home"
                        className={`nav-label ${getActivePage() === 'home' ? 'active' : ''}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 512 512">
                            <path fill="inherit" d="M261.56 101.28a8 8 0 0 0-11.06 0L66.4 277.15a8 8 0 0 0-2.47 5.79L63.9 448a32 32 0 0 0 32 32H192a16 16 0 0 0 16-16V328a8 8 0 0 1 8-8h80a8 8 0 0 1 8 8v136a16 16 0 0 0 16 16h96.06a32 32 0 0 0 32-32V282.94a8 8 0 0 0-2.47-5.79Z" />
                            <path fill="inherit" d="m490.91 244.15l-74.8-71.56V64a16 16 0 0 0-16-16h-48a16 16 0 0 0-16 16v32l-57.92-55.38C272.77 35.14 264.71 32 256 32c-8.68 0-16.72 3.14-22.14 8.63l-212.7 203.5c-6.22 6-7 15.87-1.34 22.37A16 16 0 0 0 43 267.56L250.5 69.28a8 8 0 0 1 11.06 0l207.52 198.28a16 16 0 0 0 22.59-.44c6.14-6.36 5.63-16.86-.76-22.97Z" />
                        </svg>
                    </Link>

                    <Link
                        to="/list"
                        title="list"
                        className={`nav-label ${getActivePage() === 'list' ? 'active' : ''}`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="inherit"
                            viewBox="0 0 18 20"
                        >
                            <path fill="inherit" d="M2 19.004h2.004V17H2v2.004ZM7 19h15v-2H7v2Zm-5-5.996h2.004V11H2v2.004ZM7 13h15v-2H7v2ZM2 7.004h2.004V5H2v2.004ZM7 7h15V5H7v2Z" />
                        </svg>
                    </Link>

                    <Link
                        to="/advance"
                        title="search"
                        className={`nav-label ${getActivePage() === 'search' ? 'active' : ''}`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"

                            viewBox="0 0 26 26">
                            <path fill="inherit"
                                d="M10 .188A9.812 9.812 0 0 0 .187 10A9.812 9.812 0 0 0 10 19.813c2.29 0 4.393-.811 6.063-2.125l.875.875a1.845 1.845 0 0 0 .343 2.156l4.594 4.625c.713.714 1.88.714 2.594 0l.875-.875a1.84 1.84 0 0 0 0-2.594l-4.625-4.594a1.824 1.824 0 0 0-2.157-.312l-.875-.875A9.812 9.812 0 0 0 10 .188zM10 2a8 8 0 1 1 0 16a8 8 0 0 1 0-16zM4.937 7.469a5.446 5.446 0 0 0-.812 2.875a5.46 5.46 0 0 0 5.469 5.469a5.516 5.516 0 0 0 3.156-1a7.166 7.166 0 0 1-.75.03a7.045 7.045 0 0 1-7.063-7.062c0-.104-.005-.208 0-.312z" />
                        </svg>
                    </Link>

                    <Link
                        to="/ai"
                        title="AI"
                        className={`nav-label ${getActivePage() === 'AI' ? 'active' : ''}`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 512 512">
                            <path fill="inherit" fill-rule="evenodd" d="M384 128v256H128V128zm-148.25 64h-24.932l-47.334 128h22.493l8.936-25.023h56.662L260.32 320h23.847zm88.344 0h-22.402v128h22.402zm-101 21.475l22.315 63.858h-44.274zM405.335 320H448v42.667h-42.667zm-256 85.333H192V448h-42.667zm85.333 0h42.666V448h-42.666zM149.333 64H192v42.667h-42.667zM320 405.333h42.667V448H320zM234.667 64h42.666v42.667h-42.666zM320 64h42.667v42.667H320zm85.333 170.667H448v42.666h-42.667zM64 320h42.667v42.667H64zm341.333-170.667H448V192h-42.667zM64 234.667h42.667v42.666H64zm0-85.334h42.667V192H64z" />
                        </svg>
                    </Link>
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
                                            className={`anime-card animate-in`} // Added animate-in class
                                            onClick={() => openModal(anime)}
                                            style={{
                                                cursor: "pointer", // Added cursor pointer
                                                "--card-index": index,
                                                zIndex: '5',
                                                animationDelay: `${index * 0.1}s` // Optional: stagger animation
                                            }}
                                        >
                                            <div className="home-card-image"> {/* Added missing wrapper div */}
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