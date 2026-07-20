// components/header.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../components/AuthContext.jsx";
import "../Stylesheets/header.css";
import { useNavigate } from "react-router-dom";
import Search from "../images/search.png";
import SettingsModal from "./SettingsModal.jsx";

// ProfileDropdown Component (copied from home.jsx)
const ProfileDropdown = ({ onOpenSettings }) => {
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
    window.location.href = "/";
  };

  const getInitials = (email) => {
    return email ? email.charAt(0).toUpperCase() : "U";
  };

  if (!user) {
    return "Please log in";
  }

  return (
    <div className="profile-container" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="profile-button"
        aria-label="Open profile menu"
      >
        {/* Avatar with status dot */}
        <div className="pill-avatar-wrap">
          {user.photo ? (
            <img src={user.photo} alt="Profile" className="pill-avatar-img" />
          ) : (
            <div className="pill-avatar-initials">{getInitials(user.email)}</div>
          )}
        </div>

        {/* Name block */}
        <div className="pill-info">
          <span className="pill-sub">Welcome</span>
          <span className="pill-name">{user.name || user.email}</span>
        </div>

        {/* Chevron */}
        <svg
          className={`pill-chevron ${showDropdown ? "rotated" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {showDropdown && (
        <div className="profile-dropdown">
          <div className="user-info-section">
            <div className="user-name">{user.name || user.email}</div>
            <div className="auth-type">
              {user.authType === "google"
                ? "Signed in with Google"
                : "Local Account"}
            </div>
          </div>
          <button
            onClick={() => {
              setShowDropdown(false);
              navigate("/profile"); // this takes you to profile.jsx
            }}
            className="dropdown-item"
          >
            <svg
              className="dropdown-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            View Profile
          </button>

          <button
            onClick={() => {
              setShowDropdown(false);
              onOpenSettings();
            }}
            className="dropdown-item"
          >
            <svg
              className="dropdown-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </button>
          <div className="dropdown-divider"></div>
          <button
            onClick={handleLogout}
            className="dropdown-item logout-button"
          >
            <svg
              className="dropdown-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export const Header = ({ showSearch = true, onSearchChange, customAction, hideSearchOnMobile = false }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileView, setIsMobileView] = useState(typeof window !== 'undefined' ? window.innerWidth <= 767 : false);
  const { user } = useAuth();
  const rafRef = useRef(null);
  const isScrolledRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return; // already queued
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const scrolled = window.scrollY > 100;
        if (scrolled !== isScrolledRef.current) {
          isScrolledRef.current = scrolled;
          setIsScrolled(scrolled);
        }
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 767);
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onSearchChange && onSearchChange("");
      e.target.blur();
    }
  };

  return (
    <>
      <header className={`header ${isScrolled ? "scrolled" : ""} ${isSearchFocused ? "search-focused" : ""}`}>
        <div className="logo">
          <Link to="/" className="logo-link">
            <svg className="logo-svg" viewBox="0 0 220 44" xmlns="http://www.w3.org/2000/svg" aria-label="OtakuShelf">
              <text
                x="0" y="34"
                fontFamily="'Outfit', sans-serif"
                fontWeight="800"
                fontSize="38"
                fill="#ffffff"
                letterSpacing="-0.5"
              >Otaku</text>
              <text
                x="116" y="34"
                fontFamily="'Outfit', sans-serif"
                fontWeight="800"
                fontSize="38"
                fill="#FFD700"
                letterSpacing="-0.5"
              >Shelf</text>
            </svg>
          </Link>
        </div>

        <div className="header-center">
          {showSearch && !(hideSearchOnMobile && isMobileView) ? (
            <div className={`InputContainer ${onSearchChange ? "active" : ""} ${isSearchFocused ? "focused" : ""}`}>
              <img src={Search} alt="Search" className="search-icon" />
              <input
                placeholder="Search anime..."
                id="input"
                className="input"
                type="text"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) =>
                  onSearchChange && onSearchChange(e.target.value)
                }
                onKeyDown={handleKeyDown}
              />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              {customAction && (
                <div className="header-custom-action">{customAction}</div>
              )}
            </div>
          )}
        </div>


        <div className="auth-buttons">
          {user ? (
            <ProfileDropdown onOpenSettings={() => setShowSettings(true)} />
          ) : (
            <>
              <Link to="/login">
                <button>
                  <span className="button_login2">Get Started</span>
                </button>
              </Link>
            </>
          )}
        </div>
      </header>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
};
