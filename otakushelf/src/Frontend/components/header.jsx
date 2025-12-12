// components/header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext.jsx';
import "../Stylesheets/header.css";
import { useNavigate } from "react-router-dom";

// ProfileDropdown Component (copied from home.jsx)
const ProfileDropdown = () => {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        setShowDropdown(false);
        window.location.href = "/";
    };

    const getInitials = (email) => {
        return email ? email.charAt(0).toUpperCase() : 'U';
    };

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
                        <img src={user.photo} alt="Profile" />
                    </div>
                ) : (
                    <div className="profile-initials">
                        {getInitials(user.email)}
                    </div>
                )}
                <div className="profile-info">
                    <div className="welcome-text">Welcome</div>
                    <div className="username">{user.name || user.email}</div>
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
                    <div className="user-info-section">
                        <div className="user-name">{user.name || user.email}</div>
                        <div className="auth-type">
                            {user.authType === 'google' ? 'Signed in with Google' : 'Local Account'}
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setShowDropdown(false);
                            navigate("/profile"); // this takes you to profile.jsx
                        }}
                        className="dropdown-item"
                    >
                        <svg className="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        View Profile
                    </button>

                    <button onClick={() => setShowDropdown(false)} className="dropdown-item">
                        <svg className="dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </button>
                    <div className="dropdown-divider"></div>
                    <button onClick={handleLogout} className="dropdown-item logout-button">
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

export const Header = ({ showSearch = true, onSearchChange }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 600);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onSearchChange && onSearchChange("");
        }
    };

    return (
        <header className={`header ${isScrolled ? "scrolled" : ""}`}>
            <div className="header-center">
                {showSearch && (
                    <div className={`InputContainer ${onSearchChange ? "active" : ""}`}>
                        <input
                            placeholder="Quick Search (Title Only)"
                            id="input"
                            className="input"
                            type="text"
                            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                )}
            </div>
            <div className="logo">
                <Link to="/">
                    <span>OtakuShelf</span>
                </Link>
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
    );
};