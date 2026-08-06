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
          <img src="/animeregistryname.png" alt="AnimeRegistry" className="footer-logo-img footer-logo-img-name" />
        </Link>
        <p className="footer-tagline">Your ultimate anime companion.<br />Track, discover, obsess.</p>
      </div>

      {/* Nav columns */}
      <nav className="footer-nav" aria-label="Footer navigation">
        <div className="footer-col">
          <h2 className="footer-col-title">Explore</h2>
          <ul>
            <li><Link to="/home">Home</Link></li>
            <li><Link to="/advance">Search</Link></li>
            <li><Link to="/ai">AI Chat</Link></li>
            <li><Link to="/list">My List</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h2 className="footer-col-title">Account</h2>
          <ul>
            <li><Link to="/profile">Profile</Link></li>
            <li><Link to="/settings">Settings</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h2 className="footer-col-title">Company</h2>
          <ul>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h2 className="footer-col-title">Legal</h2>
          <ul>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms &amp; Conditions</Link></li>
            <li><Link to="/cookie-policy">Cookie Policy</Link></li>
          </ul>
        </div>
      </nav>
    </div>

    {/* ── Bottom bar ── */}
    <div className="footer-bottom">
      <span className="footer-copy">© {YEAR} AnimeRegistry. All rights reserved.</span>
      <span className="footer-made-with">
        Made with <span className="footer-heart" aria-label="love">♥</span> for anime fans
      </span>
    </div>

  </footer>
);

export default Footer;
