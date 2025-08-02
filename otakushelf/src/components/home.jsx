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

    // Auto-slide effect for top airing anime
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) =>
                (prev + 1) % Math.min(removeDuplicates(topAiring).length, 4)
            );
        }, 3000);
        return () => clearInterval(interval);
    }, [topAiring]);

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

                {/* Today's Highlights */}
                <section className="hero-slider">
                    <div className="slider-container">
                        {removeDuplicates(topAiring).slice(0, 4).map((anime, index) => (
                            <div
                                key={anime.mal_id}
                                className={`slide ${index === currentSlide ? 'active' : ''}`}
                            >
                                <div className="slide-image-container">
                                    <img
                                        src={anime.images.webp?.large_image_url || anime.images.jpg.large_image_url}
                                        alt={anime.title}
                                        className="slide-image"
                                    />
                                    <div className="slide-overlay"></div>
                                </div>
                                <div className="slide-content">
                                    <h2>{anime.title}</h2>
                                    <div className="slide-info">
                                        <span className="rating">
                                            <Star size={16} fill="gold" color="gold" /> 
                                            {anime.score || 'N/A'}
                                        </span>
                                        <span className="episode">
                                            Episodes: {anime.episodes || '?'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="slider-dots">
                        {removeDuplicates(topAiring).slice(0, 4).map((_, index) => (
                            <button
                                key={index}
                                className={`dot ${index === currentSlide ? 'active' : ''}`}
                                onClick={() => setCurrentSlide(index)}
                            />
                        ))}
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