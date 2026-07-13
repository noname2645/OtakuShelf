import React from "react";
import { Link, useLocation } from 'react-router-dom';
import "../Stylesheets/bottom.css";
import { motion } from "framer-motion";
import { useAuth } from "./AuthContext.jsx";

const BottomNavBar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const getActivePage = () => {
    if (path === '/home' || path === '/') return 'home';
    if (path === '/list') return 'list';
    if (path === '/advance') return 'search';
    if (path === '/ai') return 'ai';
    if (path === '/profile' || path === '/settings' || path === '/login' || path === '/register') return 'profile';
    return '';
  };

  const activePage = getActivePage();

  const getInitials = (email) => {
    return email ? email.charAt(0).toUpperCase() : "U";
  };

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      to: '/home',
      rgb: '167, 139, 250', // Violet (#a78bfa)
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg-icon">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      id: 'list',
      label: 'Watchlist',
      to: '/list',
      rgb: '244, 114, 182', // Pink (#f472b6)
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg-icon">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3"></line>
          <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3"></line>
          <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3"></line>
        </svg>
      )
    },
    {
      id: 'search',
      label: 'Discover',
      to: '/advance',
      rgb: '45, 212, 191', // Teal (#2dd4bf)
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg-icon">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      )
    },
    {
      id: 'ai',
      label: 'OtakuAI',
      to: '/ai',
      rgb: '255, 215, 0', // Gold/Yellow (#FFD700)
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg-icon">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
          <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z" />
          <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z" />
        </svg>
      )
    },
    {
      id: 'profile',
      label: user ? 'Profile' : 'Login',
      to: user ? '/profile' : '/login',
      rgb: '56, 189, 248', // Sky Blue (#38bdf8)
      icon: user ? (
        <div className="nav-avatar-wrap">
          {user.photo ? (
            <img src={user.photo} alt="Profile" className="nav-avatar-img" />
          ) : (
            <div className="nav-avatar-initials">{getInitials(user.email)}</div>
          )}
        </div>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg-icon">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    }
  ];

  return (
    <div className="bottom-button-bar-wrapper">
      <motion.div
        className="bottom-button-bar"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.3 }}
      >
        {tabs.map((tab) => {
          const isActive = activePage === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.to}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{
                '--tab-color-rgb': tab.rgb
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBackground"
                  className="active-tab-bg"
                  initial={false}
                  transition={{ type: "spring", stiffness: 350, damping: 26 }}
                />
              )}
              
              <div className="icon-wrapper">
                {tab.icon}
              </div>

              <span className="nav-label">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
};

export default BottomNavBar;

