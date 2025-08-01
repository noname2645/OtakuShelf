import React, { useState, useEffect } from 'react';
import { Menu, Play, Star, Calendar, Users } from 'lucide-react';
import "../Stylesheets/home.css";
import sample from "../assets/images/sample.png"

const AnimeHomepage = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(true);

    // Sample data for top airing anime
    const topAiringAnime = [
        { id: 1, title: "Attack on Titan", image: "https://via.placeholder.com/1200x400/FF6B6B/white?text=Attack+on+Titan", rating: 9.0, episode: "Episode 24" },
        { id: 2, title: "Demon Slayer", image: "https://via.placeholder.com/1200x400/4ECDC4/white?text=Demon+Slayer", rating: 8.7, episode: "Episode 18" },
        { id: 3, title: "One Piece", image: "https://via.placeholder.com/1200x400/45B7D1/white?text=One+Piece", rating: 9.2, episode: "Episode 1087" },
        { id: 4, title: "Jujutsu Kaisen", image: "https://via.placeholder.com/1200x400/F7B731/white?text=Jujutsu+Kaisen", rating: 8.9, episode: "Episode 12" }
    ];

    // Sample data for anime cards
    const animeCards = [
        { id: 1, title: "Naruto", image: { sample }, rating: 8.3, year: 2002 },
        { id: 2, title: "Death Note", image: "https://via.placeholder.com/300x400/54A0FF/white?text=Death+Note", rating: 9.0, year: 2006 },
        { id: 3, title: "My Hero Academia", image: "https://via.placeholder.com/300x400/5F27CD/white?text=My+Hero+Academia", rating: 8.5, year: 2016 },
        { id: 4, title: "Tokyo Ghoul", image: "https://via.placeholder.com/300x400/00D2D3/white?text=Tokyo+Ghoul", rating: 8.1, year: 2014 },
        { id: 5, title: "Fullmetal Alchemist", image: "https://via.placeholder.com/300x400/FF6348/white?text=Fullmetal+Alchemist", rating: 9.1, year: 2003 },
        { id: 6, title: "Dragon Ball Z", image: "https://via.placeholder.com/300x400/FF9F43/white?text=Dragon+Ball+Z", rating: 8.7, year: 1989 }
    ];

    // Auto-slide effect for top airing anime
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % topAiringAnime.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [topAiringAnime.length]);

    // Loading effect
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="homepage">
            {/* Sidebar */}
            <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-content">
                    <div className="sidebar-header">
                        <h3>OtakuShelf</h3>
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
                    <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <Menu size={24} />
                    </button>
                    <div className="header-center">
                        <div className="logo">
                            <h1>OtakuShelf</h1>
                            <p>Discover Amazing Anime</p>
                        </div>
                        <div className="auth-buttons">
                            <button className="btn btn-outline">Login</button>
                            <button className="btn btn-primary">Register</button>
                        </div>
                    </div>
                </header>

                {/* Top Airing Anime Slider */}
                <section className="hero-slider">
                    <div className="slider-container">
                        {topAiringAnime.map((anime, index) => (
                            <div
                                key={anime.id}
                                className={`slide ${index === currentSlide ? 'active' : ''}`}
                                style={{ backgroundImage: `url(${anime.image})` }}
                            >
                                <div className="slide-content">
                                    <h2>{anime.title}</h2>
                                    <div className="slide-info">
                                        <span className="rating"><Star size={16} fill="gold" color="gold" /> {anime.rating}</span>
                                        <span className="episode">{anime.episode}</span>
                                    </div>
                                    <button className="btn btn-play"><Play size={16} /> Watch Now</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="slider-dots">
                        {topAiringAnime.map((_, index) => (
                            <button
                                key={index}
                                className={`dot ${index === currentSlide ? 'active' : ''}`}
                                onClick={() => setCurrentSlide(index)}
                            />
                        ))}
                    </div>
                </section>

                {/* Anime Cards Section */}
                <section className="anime-section">
                    <h2 className="section-title">Popular Anime</h2>
                    <div className="anime-grid">
                        {animeCards.map((anime) => (
                            <div key={anime.id} className={`anime-card ${loading ? 'loading' : ''}`}>
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
                                            <img src={sample} alt={anime.title} />
                                            <div className="card-title-bottom">
                                                <h3>{anime.title}</h3>
                                            </div>
                                        </div>

                                        <div className="card-title-overlay">
                                            <h3>{anime.title}</h3>
                                        </div>
                                    

                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AnimeHomepage;