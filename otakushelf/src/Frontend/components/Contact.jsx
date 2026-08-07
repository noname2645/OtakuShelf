import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout.jsx';

const Contact = () => (
  <LegalLayout
    title="Contact Us"
    description="Get in touch with the AnimeRegistry team. Report bugs, request features, or ask questions about your anime list account."
  >
    <p className="legal-lead">
      We love hearing from anime fans. Whether you have a question, found a bug, or want to suggest
      a feature, here is how to reach us.
    </p>

    <div className="legal-cards">
      <div className="legal-card">
        <h2>Email Support</h2>
        <p>
          For account help, bug reports and general questions, email us at:
        </p>
        <a className="legal-mailto" href="mailto:animeregistryofficial@gmail.com">
          animeregistryofficial@gmail.com
        </a>
        <p className="legal-note">
          We usually reply within 2–3 business days. Please include your account email so we can
          help you faster.
        </p>
      </div>
    </div>

    <h2>What to Include in Your Message</h2>
    <ul>
      <li>A clear subject line (e.g. "Account issue" or "Feature request")</li>
      <li>The email address linked to your account, if relevant</li>
      <li>Your browser and device type (helps us reproduce bugs)</li>
      <li>Steps to reproduce the problem, if you are reporting a bug</li>
    </ul>

    <h2>Security &amp; Privacy Questions</h2>
    <p>
      For privacy-related requests, including data access or deletion, please review our{" "}
      <Link to="/privacy" className="legal-link">Privacy Policy</Link> and include "Privacy" in your
      subject line.
    </p>

    <p>
      Before you write, you might find your answer in our{" "}
      <Link to="/" className="legal-link">Frequently Asked Questions</Link> on the homepage, or by
      reading our <Link to="/terms" className="legal-link">Terms &amp; Conditions</Link>.
    </p>
  </LegalLayout>
);

export default Contact;
