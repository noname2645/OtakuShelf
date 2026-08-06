import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout.jsx';

const About = () => (
  <LegalLayout
    title="About Us"
    description="AnimeRegistry is a free anime list and anime tracker. Learn about our mission to build a cleaner, faster and more rewarding way for fans to track and discover anime."
  >
    <p className="legal-lead">
      AnimeRegistry started with a simple frustration: keeping track of anime shouldn't be a chore.
      We built a free anime list and anime tracker that is fast, clean and genuinely fun to use.
    </p>

    <h2>Our Mission</h2>
    <p>
      There are already anime databases like MyAnimeList and AniList, but for many fans they feel
      cluttered and dated. Our mission is to build a modern alternative — an anime tracker that
      combines the tracking power longtime fans expect with a fresh, distraction-free interface and
      a little bit of fun.
    </p>
    <p>
      We believe your anime library is personal. Whether you keep a strict watchlist, a casual
      collection, or an ambitious planner, AnimeRegistry is designed to fit how you watch — not the
      other way around.
    </p>

    <h2>What We Offer</h2>
    <ul>
      <li>
        <strong>An anime list with real structure</strong> — Watching, Completed, Planned, Paused
        and Dropped statuses for every show.
      </li>
      <li>
        <strong>Episode progress tracking</strong> — log the exact episode you are on, even for
        currently airing series.
      </li>
      <li>
        <strong>Ratings and reviews</strong> — rate anime on a 10-point scale and write reviews to
        remember what you thought.
      </li>
      <li>
        <strong>Achievements and badges</strong> — earn rewards for watching, completing and logging
        anime.
      </li>
      <li>
        <strong>Anime statistics</strong> — see your watch time, genre habits and completion
        streaks at a glance.
      </li>
      <li>
        <strong>MyAnimeList import</strong> — migrate your existing anime collection, ratings and
        history without starting over.
      </li>
      <li>
        <strong>Sync everywhere</strong> — your list follows you across every device.
      </li>
    </ul>

    <h2>Our Values</h2>
    <h3>Privacy first</h3>
    <p>
      We collect only what we need to run the service, and we never sell your data. Your anime list
      is yours.
    </p>
    <h3>Fast by design</h3>
    <p>
      We care about performance. The app is built to load quickly and feel responsive on any
      device, so you can update your list in seconds.
    </p>
    <h3>Free, for fans</h3>
    <p>
      AnimeRegistry is completely free. No paywalls, no premium tiers — just a great way to track
      your anime.
    </p>

    <h2>Built by Fans, For Fans</h2>
    <p>
      AnimeRegistry is an independent project maintained by anime fans. It is not affiliated with,
      endorsed by, or connected to MyAnimeList, AniList, Anime-Planet or any anime studio. The anime
      metadata you see is powered by AniList, and trailers come from YouTube, both owned by their
      respective creators.
    </p>
    <p>
      Have feedback, an idea, or a bug to report? We would love to hear from you — visit our{" "}
      <Link to="/contact" className="legal-link">contact page</Link> and say hello.
    </p>

    <p>
      Ready to start?{" "}
      <Link to="/register" className="legal-link">Create your free anime list today</Link>.
    </p>
  </LegalLayout>
);

export default About;
