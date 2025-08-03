import React, { useState, useEffect } from 'react';
import { Menu, Play, Star, Calendar, Users } from 'lucide-react';
import "../Stylesheets/home.css";
import axios from "axios";
import sidebar from "../assets/images/sidebar.png"
import logo from "../assets/images/logo2.png"

const AnimeHomepage = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(true);
    const [animeNews, setAnimeNews] = useState([]);
    const [topAiring, setTopAiring] = useState([]);
    const [mostWatched, setMostWatched] = useState([]);
    const [mostHated, setMostHated] = useState([]);

    //UseEffect to fetch from backend:
    useEffect(() => {
        const fetchAnimeSections = async () => {
            try {
                const [airingRes, watchedRes, hatedRes] = await Promise.all([
                    axios.get("http://localhost:5000/api/anime/top-airing"),
                    axios.get("http://localhost:5000/api/anime/most-watched"),
                    axios.get("http://localhost:5000/api/anime/most-hated")
                ]);
                setTopAiring(airingRes.data);
                setMostWatched(watchedRes.data);
                setMostHated(hatedRes.data);
            } catch (error) {
                console.error("Error fetching anime sections:", error);
            }
        };

        fetchAnimeSections();
    }, []);

    // Add this useEffect to your home.jsx component for automatic transitions

    useEffect(() => {
        if (animeNews.length === 0) return;

        const interval = setInterval(() => {
            setCurrentSlide(prevSlide =>
                prevSlide === animeNews.length - 1 ? 0 : prevSlide + 1
            );
        }, 5000); // Change slide every 5 seconds

        return () => clearInterval(interval);
    }, [animeNews.length]);


    // Loading effect
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

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/news/anime-news");
                setAnimeNews(res.data);
            } catch (err) {
                console.error("Failed to fetch anime news:", err);
            }
        };
        fetchNews();
    }, []);

    const renderAnimeGrid = (title, data) => (
        <div className="anime-section-container">
            <h2 className="section-title">{title}</h2>
            <div className="anime-grid">
                {data.map((anime) => (
                    <div key={anime.mal_id} className={`anime-card ${loading ? 'loading' : ''}`}>
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
                                    <div className="card-overlay">

                                    </div>
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
            {/* Sidebar */}
            <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-content">
                    <div className="sidebar-header">
                        {/* <img src={logo} alt="no img" /> */}
                    </div>
                    <nav className="sidebar-nav">
                        <a href="#" className="nav-item"><Play size={20} /> Home</a>
                        <a href="#" className="nav-item"><Star size={20} /> Top Rated</a>
                        <a href="#" className="nav-item"><Calendar size={20} /> Seasonal</a>
                        <a href="#" className="nav-item"><Users size={20} /> Popular</a>
                    </nav>
                </div>
            </div>

            {/* Sidebar Overlay */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

            {/* Main Content */}
            <div className="main-content">
                {/* Header */}
                <header className="header">
                    <img id="sidebar" src={sidebar} onClick={() => setSidebarOpen(true)} alt="" />
                    <div className="header-center">
                        <div className="logo">
                            <img src={logo} alt="no img" />
                        </div>
                    </div>
                    <div className="auth-buttons">
                        <button className="btn btn-outline">Login</button>
                        <button className="btn btn-primary">Register</button>
                    </div>
                </header>



                {/* Today's Highlights - Updated Hero Slider */}
                <section className="hero-slider">
                    <div className="slider-container">
                        {animeNews.map((news, index) => (
                            <div
                                key={index}
                                className={`slide ${index === currentSlide ? "active" : ""}`}
                            >
                                <div className="slide-background">
                                    <img
                                        src={news.image}
                                        alt={news.title}
                                        className="slide-bg-image"
                                        loading="lazy"
                                    />
                                    <div className="slide-overlay"></div>
                                </div>

                                <div className="slide-content-wrapper">
                                    <div className="slide-content">
                                        <div className="news-badge">
                                            <span className="news-source">📰 Anime News Network</span>
                                            <span className="news-date">
                                                {new Date(news.pubDate).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>

                                        <h2 className="news-title">{news.title}</h2>

                                        <p className="news-snippet">{news.contentSnippet}</p>

                                        <div className="news-actions">
                                            <a
                                                href={news.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-news-primary"
                                            >
                                                Read Full Article
                                            </a>
                                            <button className="btn btn-news-outline">
                                                Share News
                                            </button>
                                        </div>
                                    </div>

                                    <div className="slide-thumbnail">
                                        <img
                                            src={news.image}
                                            alt={news.title}
                                            className="thumbnail-image"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="slider-navigation">
                        <div className="slider-dots">
                            {animeNews.map((_, index) => (
                                <button
                                    key={index}
                                    className={`dot ${index === currentSlide ? "active" : ""}`}
                                    onClick={() => setCurrentSlide(index)}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="news-counter">
                        <span>{currentSlide + 1} / {animeNews.length}</span>
                    </div>
                </section>


                {/* Anime Cards Section */}
                <main className="anime-sections">
                    {renderAnimeGrid("🔥 Top Airing", removeDuplicates(topAiring))}
                    {renderAnimeGrid("👥 Most Watched", removeDuplicates(mostWatched))}
                    {renderAnimeGrid("💀 Most Hated", removeDuplicates(mostHated))}
                </main>
            </div>
        </div>
    );
};

export default AnimeHomepage;