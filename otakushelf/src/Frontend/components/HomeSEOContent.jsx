import React from 'react';
import { Link } from 'react-router-dom';
import '../Stylesheets/seo-content.css';

const FAQ_ITEMS = [
  {
    q: "What is AnimeRegistry?",
    a: "AnimeRegistry is a modern, free anime list and anime tracker. Build a watchlist, log episode progress, rate and review shows, earn achievements and badges, and browse a large catalog of anime all in one place.",
  },
  {
    q: "How do I create an anime list?",
    a: "Create a free account, open any anime in the catalog and choose a list status such as Watching, Completed, Planned, Paused or Dropped. Your list is saved to your profile and synced across all your devices.",
  },
  {
    q: "Is AnimeRegistry free?",
    a: "Yes. AnimeRegistry is completely free to use — creating an anime list, tracking progress, rating anime, writing reviews and earning badges cost nothing.",
  },
  {
    q: "Can I import MyAnimeList?",
    a: "Yes. AnimeRegistry supports MyAnimeList import. Upload your MAL export file and migrate your anime collection, ratings and history without starting from scratch.",
  },
  {
    q: "How do anime badges work?",
    a: "AnimeRegistry rewards you with achievements and badges for watching anime, completing series, hitting watch-time milestones and more. Badges are collected on your profile as you unlock them.",
  },
  {
    q: "Can I track episode progress?",
    a: "Yes. You can log the exact episode you are on for every series, including currently airing shows, so your anime progress tracker is always up to date.",
  },
  {
    q: "Does AnimeRegistry work on mobile?",
    a: "Yes. AnimeRegistry is a mobile-friendly web app with a dedicated bottom navigation bar, so you can manage your anime list on your phone or tablet just as easily as on desktop.",
  },
  {
    q: "Is my anime list synchronized?",
    a: "Yes. Your anime list, ratings and progress are stored in the cloud and synced across devices, so signing in anywhere gives you the same up-to-date anime collection.",
  },
];

const HomeSEOContent = () => (
  <section className="seo-content" aria-label="About AnimeRegistry">
    <div className="seo-content-inner">
      <h1 className="seo-h1">Create Your Free Anime List &amp; Track Every Series You Watch</h1>
      <p className="seo-lead">
        Keeping track of everything you watch should be easy. AnimeRegistry is a free anime list
        and anime tracker that puts your entire anime library in one place — the shows you are
        watching, the series you have finished, and everything you have planned for later.
      </p>

      <h2>What Is AnimeRegistry?</h2>
      <p>
        AnimeRegistry is a modern anime list platform built for fans who want more control over
        their anime collection. Instead of juggling notes and bookmarks, you get a clean anime
        database where every series has detailed information — episodes, genres, studios, scores
        and trailers — ready to add to your list in one tap.
      </p>
      <p>
        Whether you are binging a seasonal favorite or slowly working through a decades-old
        classic, your anime library follows you. Sign in on any device and pick up exactly where
        you left off.
      </p>

      <h2>Build an Anime List That Fits How You Watch</h2>
      <p>
        Your anime list is the heart of the app. Every show you add lands in a status that makes
        sense for how you actually watch:
      </p>
      <ul className="seo-list">
        <li><strong>Watching</strong> — shows you are currently on</li>
        <li><strong>Completed</strong> — series you have finished</li>
        <li><strong>Planned</strong> — everything queued up for later</li>
        <li><strong>Dropped</strong> — shows that were not for you</li>
      </ul>
      <p>
        Because it doubles as an anime progress tracker, you can log the exact episode you are on
        for every series — even ongoing shows that air weekly. No more guessing where you stopped.
      </p>

      <h2>Rate Anime, Write Reviews &amp; Build a Watchlist You Trust</h2>
      <p>
        AnimeRegistry treats your opinion as part of the catalog. Rate every anime you watch on a
        ten-point scale and write anime reviews to remember what you thought. Your ratings and
        history feed into personal anime statistics, so you can see your watch time, genre habits
        and completion streaks at a glance.
      </p>

      <h2>Discover Something New</h2>
      <p>
        Browse trending shows, top-rated series, upcoming releases and the most-watched titles on
        this page, or open the{" "}
        <Link to="/advance" className="seo-link">advanced anime search</Link> to filter the catalog
        by genre, status and more.
      </p>

      <h2>Meet OtakuAI, Your Anime Companion</h2>
      <p>
        Finding your next favorite show is easier with a little help. OtakuAI is a built-in anime
        assistant that chats with you like a friend — ask for recommendations, find the top shows
        of the season, or just geek out about a series you love.
      </p>
      <p>
        When you are signed in, OtakuAI greets you by name and suggests personalized picks, hidden
        gems and binge-worthy titles based on your watchlist and history. Every conversation is
        saved, so you can pick up right where you left off.
      </p>
      <p>
        <Link to="/ai" className="seo-link">Chat with OtakuAI</Link> and discover your next anime.
      </p>

      <h2>Earn Achievements &amp; Badges Along the Way</h2>
      <p>
        Watching anime is more fun with goals. AnimeRegistry turns your progress into anime
        achievements and badges — finish a long-running series, log your first hundred episodes,
        and watch them unlock on your <Link to="/profile" className="seo-link">profile</Link>. It
        is a lightweight gamification layer that makes even a quiet binge feel rewarding.
      </p>

      <h2>Sync Your Anime Library Across Every Device</h2>
      <p>
        Your anime collection lives in the cloud, so your list, progress and ratings stay in sync.
        Start an episode on your laptop and finish it on your phone — your anime library updates
        instantly. The mobile experience includes a bottom navigation bar tuned for one-handed use.
      </p>

      <h2>Frequently Asked Questions</h2>
      <div className="seo-faq">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="seo-faq-item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>

      <div className="seo-cta">
        <h2>Start Your Anime List Today</h2>
        <p>
          Create a free account, add your first anime and start earning badges. Your whole anime
          journey, in one place.
        </p>
        <Link to="/register" className="seo-cta-btn">
          Create Your Free Anime List <span aria-hidden="true">&rsaquo;</span>
        </Link>
      </div>
    </div>
  </section>
);

export default HomeSEOContent;
