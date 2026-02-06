import React from "react";
import { Link, useLocation } from 'react-router-dom';
import "../Stylesheets/bottom.css";

const BottomNavBar = () => {
  const location = useLocation();
  const path = location.pathname;

  const getActivePage = () => {
    if (path === '/home' || path === '/') return 'home';
    if (path === '/list') return 'list';
    if (path === '/advance') return 'search';
    if (path === '/ai') return 'AI';
    return '';
  };

  const activePage = getActivePage();

  return (
    <div className="bottom-button-bar">
      <Link
        to="/home"
        className={`nav-item ${activePage === 'home' ? 'active' : ''}`}
      >
        <div className="icon-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path fill="currentColor" d="M261.56 101.28a8 8 0 0 0-11.06 0L66.4 277.15a8 8 0 0 0-2.47 5.79L63.9 448a32 32 0 0 0 32 32H192a16 16 0 0 0 16-16V328a8 8 0 0 1 8-8h80a8 8 0 0 1 8 8v136a16 16 0 0 0 16 16h96.06a32 32 0 0 0 32-32V282.94a8 8 0 0 0-2.47-5.79Z" />
          </svg>
        </div>
        <span className="nav-label">Home</span>
      </Link>

      <Link
        to="/list"
        className={`nav-item ${activePage === 'list' ? 'active' : ''}`}
      >
        <div className="icon-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="currentColor" d="M7 5h10v2H7V5zm0 6h10v2H7v-2zm0 6h10v2H7v-2zM4 5h2v2H4V5zm0 6h2v2H4v-2zm0 6h2v2H4v-2z" />
          </svg>
        </div>
        <span className="nav-label">List</span>
      </Link>

      <Link
        to="/advance"
        className={`nav-item ${activePage === 'search' ? 'active' : ''}`}
      >
        <div className="icon-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </div>
        <span className="nav-label">Search</span>
      </Link>

      <Link
        to="/ai"
        className={`nav-item ${activePage === 'AI' ? 'active' : ''}`}
      >
        <div className="icon-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 10.5V8h-2.5v2.5H14v2.5h2.5V15.5h2.5v-2.5H21.5v-2.5H19zm-8.25-1.25L9 4 7.25 9.25 2 11l5.25 1.75L9 18l1.75-5.25L16 11l-5.25-1.75z" />
          </svg>
        </div>
        <span className="nav-label">AI Chat</span>
      </Link>
    </div>
  );
};

export default BottomNavBar;