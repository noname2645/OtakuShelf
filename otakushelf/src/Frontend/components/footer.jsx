import React from 'react';
import { Link } from 'react-router-dom';
import '../Stylesheets/footer.css';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const YEAR = new Date().getFullYear();

const Footer = () => (
  <footer className="site-footer" aria-label="Site footer">
    <div className="footer-inner">

      {/* ── Brand column ── */}
      <div className="footer-brand">
        <span className="footer-logo">
          <span className="footer-logo-otaku">OTAKU</span>
          <span className="footer-logo-shelf">SHELF</span>
        </span>
        <span className="footer-version-pill">v{APP_VERSION}</span>
      </div>

      {/* ── Nav columns ── */}
      <nav className="footer-nav" aria-label="Footer navigation">
        <div className="footer-col">
          <h4 className="footer-col-title">Explore</h4>
          <ul>
            <li><Link to="/home">Home</Link></li>
            <li><Link to="/advance">Search</Link></li>
            <li><Link to="/ai">AI Chat</Link></li>
            <li><Link to="/list">My List</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-col-title">Account</h4>
          <ul>
            <li><Link to="/profile">Profile</Link></li>
            <li><Link to="/settings">Settings</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-col-title">Legal</h4>
          <ul>
            <li><span className="footer-link-muted">Privacy Policy</span></li>
            <li><span className="footer-link-muted">Terms of Service</span></li>
            <li><span className="footer-link-muted">Cookie Policy</span></li>
          </ul>
        </div>
      </nav>

    </div>

    {/* ── Bottom bar ── */}
    <div className="footer-bottom">
      <span className="footer-copy">
        © {YEAR} OtakuShelf. All rights reserved.
      </span>
      <div className="footer-bottom-right">
        <span className="footer-build-info">
          Build&nbsp;<code>v{APP_VERSION}</code>&nbsp;·&nbsp;Made with&nbsp;
          <span className="footer-heart" aria-label="love">♥</span>
          &nbsp;for anime fans
        </span>
      </div>
    </div>
  </footer>
);

export default Footer;
