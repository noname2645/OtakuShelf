import React from 'react';
import { Link } from 'react-router-dom';
import '../Stylesheets/footer.css';

const YEAR = new Date().getFullYear();

const Footer = () => (
  <footer className="site-footer" aria-label="Site footer">

    {/* ── Top content grid ── */}
    <div className="footer-inner">

      {/* Brand */}
      <div className="footer-brand">
        <Link to="/home" className="footer-logo-link">
          <svg className="footer-logo-svg" viewBox="0 0 220 44" xmlns="http://www.w3.org/2000/svg" aria-label="OtakuShelf">
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
        <p className="footer-tagline">Your ultimate anime companion.<br />Track, discover, obsess.</p>
      </div>

      {/* Nav columns */}
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
      <span className="footer-copy">© {YEAR} OtakuShelf. All rights reserved.</span>
      <span className="footer-made-with">
        Made with <span className="footer-heart" aria-label="love">♥</span> for anime fans
      </span>
    </div>

  </footer>
);

export default Footer;
