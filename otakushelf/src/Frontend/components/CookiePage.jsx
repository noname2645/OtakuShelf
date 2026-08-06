import React from 'react';
import LegalLayout from './LegalLayout.jsx';

const CookiePolicy = () => (
  <LegalLayout
    title="Cookie Policy"
    description="How AnimeRegistry uses cookies and browser storage, what they are used for, and how you can manage or clear them."
  >
    <p>
      <strong>Last updated:</strong> August 6, 2026
    </p>
    <p>
      This Cookie Policy explains how AnimeRegistry ("we", "us", "our") uses cookies and similar
      storage technologies when you use our anime list and anime tracker platform at
      animeregistry.com (the "Service"). By using the Service, you consent to the use of
      cookies as described here.
    </p>

    <h2>1. What Are Cookies</h2>
    <p>
      Cookies are small text files placed on your device by the websites you visit. They are widely
      used to make websites work more efficiently, to remember your preferences, and to provide
      information to the site owner.
    </p>

    <h2>2. How We Use Cookies and Local Storage</h2>
    <p>We use browser storage and cookies for the following purposes:</p>
    <ul>
      <li>
        <strong>Authentication</strong> — to keep you signed in and remember your session so you do
        not have to log in on every visit.
      </li>
      <li>
        <strong>Preferences</strong> — to remember your display settings, list view preferences, and
        other customizations.
      </li>
      <li>
        <strong>Performance caching</strong> — to cache anime metadata locally so the app loads
        faster and feels more responsive.
      </li>
      <li>
        <strong>Analytics</strong> — to understand how the Service is used so we can improve
        performance and fix issues.
      </li>
    </ul>

    <h2>3. Types of Storage We Use</h2>
    <p>We use the following storage mechanisms:</p>
    <ul>
      <li>
        <strong>Local Storage</strong> — stores your anime list data, list status map, UI
        preferences, and cached anime metadata directly in your browser.
      </li>
      <li>
        <strong>Session Storage</strong> — used temporarily during a session for search state and
        modal interactions. Data is cleared when you close the browser tab.
      </li>
      <li>
        <strong>Cookies</strong> — used for session management and authentication tokens. We do not
        use third-party advertising cookies.
      </li>
    </ul>

    <h2>4. Third-Party Cookies</h2>
    <p>
      Some features of the Service rely on third-party services that may set their own cookies:
    </p>
    <ul>
      <li>
        <strong>Google Sign-In</strong> — may set cookies for authentication purposes when you sign
        in with Google.
      </li>
      <li>
        <strong>Cloudflare</strong> — our CDN and hosting provider may set security and performance
        cookies.
      </li>
      <li>
        <strong>YouTube</strong> — embedded trailers may set cookies as described in Google&apos;s
        cookie policy.
      </li>
    </ul>
    <p>
      These third parties have their own privacy and cookie policies. We encourage you to review
      them.
    </p>

    <h2>5. Managing Cookies and Storage</h2>
    <p>
      You can control and clear cookies and browser storage at any time through your browser
      settings. Please note that clearing or disabling certain storage may affect the functionality
      of the Service:
    </p>
    <ul>
      <li>You may not stay signed in between sessions.</li>
      <li>Your anime list preferences and cached data may be lost.</li>
      <li>Some features may require you to re-enter information.</li>
    </ul>

    <h2>6. Updates to This Policy</h2>
    <p>
      We may update this Cookie Policy from time to time to reflect changes in technology or
      regulations. Material changes will be posted on this page with a revised &quot;Last updated&quot;
      date.
    </p>

    <h2>7. Contact Us</h2>
    <p>
      Questions about our use of cookies? Contact us at{" "}
      <a href="mailto:animeregistryofficial@gmail.com">animeregistryofficial@gmail.com</a>.
    </p>
  </LegalLayout>
);

export default CookiePolicy;
