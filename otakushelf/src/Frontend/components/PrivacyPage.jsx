import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout.jsx';

const PrivacyPolicy = () => (
  <LegalLayout
    title="Privacy Policy"
    description="How AnimeRegistry collects, uses and protects your personal data. Read about your account information, cookies, third-party services and your privacy rights."
  >
    <p>
      <strong>Last updated:</strong> August 6, 2026
    </p>
    <p>
      AnimeRegistry ("we", "us", "our") respects your privacy. This Privacy Policy explains what
      information we collect when you use our anime list and anime tracker platform at
      animeregistry.com (the "Service"), how we use it, and the choices you have. By using
      the Service, you agree to the practices described here.
    </p>

    <h2>1. Information We Collect</h2>
    <h3>Account information</h3>
    <p>
      When you register, we collect your email address, a display name, and any profile photo you
      choose to add. If you sign in with Google, we receive your name, email address and profile
      picture from your Google account with your permission.
    </p>
    <h3>Your anime data</h3>
    <p>
      Your anime list, watchlist statuses, episode progress, ratings, reviews, badges and
      statistics are stored to provide the Service. This data is associated with your account.
    </p>
    <h3>Usage and device data</h3>
    <p>
      We collect basic technical information needed to operate and secure the Service, such as
      browser type, device type, approximate region, and IP address. This data is used in an
      aggregated form for performance monitoring and abuse prevention.
    </p>

    <h2>2. How We Use Your Information</h2>
    <p>We use your information to:</p>
    <ul>
      <li>Create and manage your anime list account</li>
      <li>Save and sync your anime library across your devices</li>
      <li>Send important service emails, such as verification codes and account notifications</li>
      <li>Improve, secure and maintain the Service</li>
      <li>Respond to support requests</li>
    </ul>
    <p>We do not sell your personal information.</p>

    <h2>3. Cookies and Local Storage</h2>
    <p>
      We use browser local storage and cookies to keep you signed in, remember your preferences,
      and cache anime data to make the app faster. You can clear this data at any time through your
      browser settings; some features may require local storage to function. For more details, see
      our <Link to="/cookie-policy" className="legal-link">Cookie Policy</Link>.
    </p>

    <h2>4. Third-Party Services</h2>
    <p>To operate the Service we rely on a small number of third-party providers:</p>
    <ul>
      <li>
        <strong>Google Sign-In</strong> — for optional account authentication. Google's privacy
        policy governs data shared through their service.
      </li>
      <li>
        <strong>Cloudflare</strong> — our hosting and CDN provider for the website and backend.
      </li>
      <li>
        <strong>Brevo</strong> — used to deliver transactional emails such as verification codes.
      </li>
      <li>
        <strong>AniList</strong> — provides anime metadata (titles, images, episodes and scores)
        shown in the catalog.
      </li>
      <li>
        <strong>YouTube</strong> — embeds trailers for featured anime.
      </li>
    </ul>
    <p>
      These providers may process data in accordance with their own privacy policies. We only share
      the minimum information necessary for each service.
    </p>

    <h2>5. Data Retention</h2>
    <p>
      We retain your data for as long as your account is active or as needed to provide the Service.
      You may request deletion of your account and associated data at any time.
    </p>

    <h2>6. Data Security</h2>
    <p>
      Passwords are hashed and salted, and we use industry-standard security practices to protect
      your data. No method of transmission or storage is 100% secure, but we work hard to keep your
      information safe.
    </p>

    <h2>7. Children's Privacy</h2>
    <p>
      The Service is not directed at children under the age of 13, and we do not knowingly collect
      personal information from children. If you believe a child has provided us with personal
      data, contact us and we will delete it.
    </p>

    <h2>8. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
      <li>Access and update the personal information in your account</li>
      <li>Export or delete your anime list data</li>
      <li>Delete your account and request removal of your data</li>
      <li>Object to or restrict certain processing</li>
    </ul>
    <p>
      To exercise any of these rights, contact us at the address below. Depending on your
      location, you may also have rights under local privacy laws such as the GDPR or CCPA.
    </p>

    <h2>9. Changes to This Policy</h2>
    <p>
      We may update this Privacy Policy from time to time. Material changes will be posted on this
      page with a revised "Last updated" date. Continued use of the Service after changes means you
      accept the updated policy.
    </p>

    <h2>10. Contact Us</h2>
    <p>
      Questions about this Privacy Policy? Contact us at{" "}
      <a href="mailto:animeregistryofficial@gmail.com">animeregistryofficial@gmail.com</a>.
    </p>
  </LegalLayout>
);

export default PrivacyPolicy;
